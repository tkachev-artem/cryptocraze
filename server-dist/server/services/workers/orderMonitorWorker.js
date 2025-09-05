"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderMonitorWorker = exports.OrderMonitorWorker = void 0;
const bullmq_1 = require("bullmq");
const queueManager_js_1 = require("./queueManager.js");
const unifiedPriceService_js_1 = require("../unifiedPriceService.js");
const dealsService_js_1 = require("../dealsService.js");
const notifications_js_1 = require("../notifications.js");
const db_js_1 = require("../../db.js");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
/**
 * Order Monitor Worker
 * Main worker responsible for monitoring open orders and executing TP/SL
 */
class OrderMonitorWorker {
    worker;
    isShuttingDown = false;
    processedOrders = new Set();
    failedAttempts = new Map();
    // Performance metrics
    metrics = {
        totalProcessed: 0,
        successfulClosures: 0,
        failedClosures: 0,
        skippedOrders: 0,
        averageProcessingTime: 0,
        lastProcessedAt: new Date(),
    };
    constructor() {
        this.worker = new bullmq_1.Worker('orderMonitor', this.processOrder.bind(this), {
            connection: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT || '6379'),
                password: process.env.REDIS_PASSWORD,
                db: parseInt(process.env.REDIS_DB || '0'),
            },
            concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5'),
            removeOnComplete: 100,
            removeOnFail: 50,
            maxStalledCount: 3,
            stalledInterval: 30000,
        });
        this.setupEventHandlers();
        // Register with queue manager
        queueManager_js_1.queueManager.registerWorker('orderMonitor', this.worker);
        console.log('[OrderMonitorWorker] Worker initialized and ready');
    }
    /**
     * Process individual order monitoring job
     */
    async processOrder(job) {
        const startTime = Date.now();
        const { dealId, userId, symbol, direction, amount, multiplier, openPrice, takeProfit, stopLoss } = job.data;
        try {
            // Skip if shutting down
            if (this.isShuttingDown) {
                throw new bullmq_1.UnrecoverableError('Worker shutting down');
            }
            console.log(`[OrderMonitorWorker] Processing order ${dealId} for ${symbol}`);
            // Check if order still exists and is open
            const orderExists = await this.validateOrderStatus(dealId);
            if (!orderExists) {
                console.log(`[OrderMonitorWorker] Order ${dealId} no longer exists or is closed`);
                await job.remove(); // Remove repeating job
                return;
            }
            // Get current price
            const currentPrice = await this.getCurrentPrice(symbol);
            if (!currentPrice) {
                console.warn(`[OrderMonitorWorker] Cannot get current price for ${symbol}`);
                this.incrementFailedAttempts(dealId);
                return; // Retry later
            }
            // Check TP/SL conditions
            const checkResult = this.checkTPSLConditions({
                currentPrice: currentPrice.price,
                openPrice,
                direction,
                amount,
                multiplier,
                takeProfit,
                stopLoss,
            });
            if (checkResult.shouldClose) {
                await this.executeOrderClosure(job.data, checkResult);
                await job.remove(); // Remove repeating job after successful closure
                this.metrics.successfulClosures++;
            }
            else {
                // Log progress for debugging
                this.logOrderProgress(dealId, symbol, checkResult);
            }
            // Update metrics
            this.updateMetrics(Date.now() - startTime);
        }
        catch (error) {
            this.metrics.failedClosures++;
            if (error instanceof bullmq_1.UnrecoverableError) {
                console.error(`[OrderMonitorWorker] Unrecoverable error for order ${dealId}:`, error.message);
                await queueManager_js_1.queueManager.moveToDeadLetter(job.data, error.message);
                await job.remove();
                throw error;
            }
            console.error(`[OrderMonitorWorker] Error processing order ${dealId}:`, error);
            this.incrementFailedAttempts(dealId);
            // Move to dead letter after too many failures
            const failures = this.failedAttempts.get(dealId) || 0;
            if (failures >= 10) {
                await queueManager_js_1.queueManager.moveToDeadLetter(job.data, `Too many failures: ${failures}`);
                await job.remove();
                throw new bullmq_1.UnrecoverableError(`Order ${dealId} failed too many times`);
            }
            throw error; // Trigger retry
        }
    }
    /**
     * Validate that order still exists and is open
     */
    async validateOrderStatus(dealId) {
        try {
            const [deal] = await db_js_1.db.select().from(schema_1.deals).where((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId));
            return deal && deal.status === 'open';
        }
        catch (error) {
            console.error(`[OrderMonitorWorker] Error validating order ${dealId}:`, error);
            return false;
        }
    }
    /**
     * Get current price for symbol
     */
    async getCurrentPrice(symbol) {
        try {
            let priceData = unifiedPriceService_js_1.unifiedPriceService.getPrice(symbol);
            if (!priceData) {
                await unifiedPriceService_js_1.unifiedPriceService.addPair(symbol);
                // Wait a bit for price to be fetched
                await new Promise(resolve => setTimeout(resolve, 2000));
                priceData = unifiedPriceService_js_1.unifiedPriceService.getPrice(symbol);
            }
            return priceData;
        }
        catch (error) {
            console.error(`[OrderMonitorWorker] Error getting price for ${symbol}:`, error);
            return null;
        }
    }
    /**
     * Check if TP or SL conditions are met
     */
    checkTPSLConditions({ currentPrice, openPrice, direction, amount, multiplier, takeProfit, stopLoss, }) {
        // Calculate PnL
        const volume = amount * multiplier;
        const priceChange = (currentPrice - openPrice) / openPrice;
        let pnl = direction === 'up' ? volume * priceChange : volume * (-priceChange);
        // Subtract commission (0.05%)
        const commission = volume * 0.0005;
        pnl -= commission;
        const pnlPercentage = (pnl / amount) * 100;
        // Check Take Profit
        if (takeProfit && pnl >= takeProfit) {
            return {
                shouldClose: true,
                reason: 'take_profit',
                currentPrice,
                pnl,
                pnlPercentage,
            };
        }
        // Check Stop Loss
        if (stopLoss && pnl <= -Math.abs(stopLoss)) {
            return {
                shouldClose: true,
                reason: 'stop_loss',
                currentPrice,
                pnl,
                pnlPercentage,
            };
        }
        return {
            shouldClose: false,
            reason: 'none',
            currentPrice,
            pnl,
            pnlPercentage,
        };
    }
    /**
     * Execute order closure
     */
    async executeOrderClosure(orderData, checkResult) {
        const { dealId, userId } = orderData;
        try {
            console.log(`[OrderMonitorWorker] Executing ${checkResult.reason} closure for order ${dealId}, PnL: ${checkResult.pnl.toFixed(2)}`);
            // Close the deal using existing service
            const result = await dealsService_js_1.dealsService.closeDeal({ userId, dealId });
            // Send notification to user
            await this.sendClosureNotification(orderData, checkResult, result);
            console.log(`[OrderMonitorWorker] Successfully closed order ${dealId} via ${checkResult.reason}`);
        }
        catch (error) {
            console.error(`[OrderMonitorWorker] Failed to close order ${dealId}:`, error);
            throw error;
        }
    }
    /**
     * Send notification about order closure
     */
    async sendClosureNotification(orderData, checkResult, closureResult) {
        try {
            const { userId, symbol, direction, amount } = orderData;
            const isProfit = checkResult.pnl > 0;
            const title = checkResult.reason === 'take_profit'
                ? '🎯 Take Profit Achieved!'
                : '🛡️ Stop Loss Triggered';
            const message = `Your ${direction.toUpperCase()} position on ${symbol} was automatically closed.\n` +
                `Amount: $${amount}\n` +
                `P&L: ${isProfit ? '+' : ''}$${checkResult.pnl.toFixed(2)} (${checkResult.pnlPercentage.toFixed(1)}%)\n` +
                `Price: ${checkResult.currentPrice.toFixed(4)}`;
            await notifications_js_1.NotificationService.createNotification({
                userId,
                type: 'auto_close_trade',
                title,
                message,
            });
        }
        catch (error) {
            console.error('[OrderMonitorWorker] Failed to send closure notification:', error);
            // Don't throw - notification failure shouldn't fail the closure
        }
    }
    /**
     * Log order progress for debugging
     */
    logOrderProgress(dealId, symbol, checkResult) {
        // Log every 10th check to avoid spam
        if (this.metrics.totalProcessed % 10 === 0) {
            console.log(`[OrderMonitorWorker] Order ${dealId} (${symbol}) - Current P&L: ${checkResult.pnl.toFixed(2)} (${checkResult.pnlPercentage.toFixed(1)}%)`);
        }
    }
    /**
     * Increment failed attempts counter
     */
    incrementFailedAttempts(dealId) {
        const current = this.failedAttempts.get(dealId) || 0;
        this.failedAttempts.set(dealId, current + 1);
    }
    /**
     * Update performance metrics
     */
    updateMetrics(processingTime) {
        this.metrics.totalProcessed++;
        this.metrics.lastProcessedAt = new Date();
        // Calculate rolling average processing time
        this.metrics.averageProcessingTime =
            (this.metrics.averageProcessingTime * (this.metrics.totalProcessed - 1) + processingTime) /
                this.metrics.totalProcessed;
    }
    /**
     * Get worker metrics
     */
    getMetrics() {
        return {
            ...this.metrics,
            failedAttempts: Object.fromEntries(this.failedAttempts),
            isShuttingDown: this.isShuttingDown,
        };
    }
    /**
     * Setup event handlers
     */
    setupEventHandlers() {
        this.worker.on('completed', (job) => {
            console.log(`[OrderMonitorWorker] Job ${job.id} completed`);
        });
        this.worker.on('failed', (job, err) => {
            console.error(`[OrderMonitorWorker] Job ${job?.id} failed:`, err.message);
        });
        this.worker.on('error', (error) => {
            console.error('[OrderMonitorWorker] Worker error:', error);
        });
        this.worker.on('stalled', (jobId) => {
            console.warn(`[OrderMonitorWorker] Job ${jobId} stalled`);
        });
    }
    /**
     * Gracefully shutdown worker
     */
    async shutdown() {
        console.log('[OrderMonitorWorker] Starting graceful shutdown...');
        this.isShuttingDown = true;
        try {
            await this.worker.close();
            console.log('[OrderMonitorWorker] Shutdown completed');
        }
        catch (error) {
            console.error('[OrderMonitorWorker] Error during shutdown:', error);
            throw error;
        }
    }
}
exports.OrderMonitorWorker = OrderMonitorWorker;
// Export worker instance
exports.orderMonitorWorker = new OrderMonitorWorker();
