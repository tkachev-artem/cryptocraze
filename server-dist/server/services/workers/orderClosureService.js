"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderClosureService = exports.OrderClosureService = void 0;
const events_1 = require("events");
const db_js_1 = require("../../db.js");
const schema_1 = require("../../../shared/schema");
const drizzle_orm_1 = require("drizzle-orm");
const dealsService_js_1 = require("../dealsService.js");
const notifications_js_1 = require("../notifications.js");
const storage_js_1 = require("../../storage.js");
const autoRewards_js_1 = require("../autoRewards.js");
/**
 * Order Closure Service
 * Handles automatic order closure with comprehensive P&L calculation and user management
 */
class OrderClosureService extends events_1.EventEmitter {
    static instance;
    // Statistics tracking
    stats = {
        totalClosures: 0,
        successfulClosures: 0,
        failedClosures: 0,
        takeProfitClosures: 0,
        stopLossClosures: 0,
        averageProfit: 0,
        averageLoss: 0,
        averageProcessingTime: 0,
        lastClosureAt: null,
    };
    // Performance tracking
    closureTimings = [];
    MAX_TIMING_SAMPLES = 1000;
    // Error tracking
    recentErrors = [];
    MAX_ERROR_HISTORY = 100;
    constructor() {
        super();
    }
    static getInstance() {
        if (!OrderClosureService.instance) {
            OrderClosureService.instance = new OrderClosureService();
        }
        return OrderClosureService.instance;
    }
    /**
     * Execute order closure with comprehensive handling
     */
    async executeOrderClosure(request) {
        const startTime = Date.now();
        const { dealId, userId, closePrice, reason, triggeredBy, metadata } = request;
        console.log(`[OrderClosureService] Executing ${reason} closure for order ${dealId} by ${triggeredBy}`);
        try {
            // Validate order exists and is open
            const orderValidation = await this.validateOrder(dealId, userId);
            if (!orderValidation.isValid) {
                throw new Error(orderValidation.error || 'Order validation failed');
            }
            const order = orderValidation.order;
            // Calculate P&L with precision
            const pnlCalculation = this.calculatePrecisePnL({
                openPrice: Number(order.openPrice),
                closePrice,
                direction: order.direction,
                amount: Number(order.amount),
                multiplier: order.multiplier,
            });
            // Execute closure transaction
            const closureResult = await this.executeClosureTransaction({
                order,
                closePrice,
                profit: pnlCalculation.finalProfit,
                reason,
                triggeredBy,
            });
            // IMPORTANT: Update task progress after deal closure (same as dealsService.closeDeal)
            console.log(`[OrderClosureService] Обновляем прогресс заданий после закрытия сделки: userId=${userId}, прибыль=${pnlCalculation.finalProfit}`);
            try {
                await dealsService_js_1.dealsService.updateDailyTradeTasks(userId);
                await dealsService_js_1.dealsService.updateCryptoKingTasks(userId, pnlCalculation.finalProfit);
                await dealsService_js_1.dealsService.updateNewTradeTasksOnClose(userId, pnlCalculation.finalProfit);
                console.log(`[OrderClosureService] Прогресс заданий обновлен`);
            }
            catch (error) {
                console.error(`[OrderClosureService] Ошибка при обновлении прогресса заданий:`, error);
                // Don't fail deal closure due to task update errors
            }
            // Update user balance and statistics
            await this.updateUserFinancials(userId, {
                returnedAmount: Number(order.amount),
                profit: pnlCalculation.finalProfit,
                tradeVolume: Number(order.amount),
            });
            // Send notification
            await this.sendClosureNotification({
                userId,
                order,
                closePrice,
                profit: pnlCalculation.finalProfit,
                reason,
            });
            // Update statistics
            this.updateClosureStats(reason, pnlCalculation.finalProfit, Date.now() - startTime);
            const result = {
                success: true,
                dealId,
                closePrice,
                profit: pnlCalculation.finalProfit,
                profitPercentage: pnlCalculation.profitPercentage,
                newBalance: await this.getUserBalance(userId),
                closedAt: new Date(),
                metadata: {
                    ...metadata,
                    processingTime: Date.now() - startTime,
                    pnlBreakdown: pnlCalculation,
                },
            };
            // Emit success event
            this.emit('orderClosed', result);
            console.log(`[OrderClosureService] Successfully closed order ${dealId}, P&L: ${pnlCalculation.finalProfit.toFixed(2)}`);
            return result;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            // Track error
            this.trackError(dealId, errorMessage);
            this.stats.failedClosures++;
            const result = {
                success: false,
                dealId,
                closePrice,
                profit: 0,
                profitPercentage: 0,
                newBalance: await this.getUserBalance(userId),
                closedAt: new Date(),
                error: errorMessage,
            };
            // Emit error event
            this.emit('closureError', { dealId, error: errorMessage, userId });
            console.error(`[OrderClosureService] Failed to close order ${dealId}:`, error);
            return result;
        }
    }
    /**
     * Batch closure for multiple orders (useful for liquidation scenarios)
     */
    async executeBatchClosure(requests) {
        console.log(`[OrderClosureService] Executing batch closure for ${requests.length} orders`);
        const results = [];
        const concurrentLimit = 5; // Process 5 orders at a time to avoid overwhelming the system
        for (let i = 0; i < requests.length; i += concurrentLimit) {
            const batch = requests.slice(i, i + concurrentLimit);
            const batchResults = await Promise.allSettled(batch.map(request => this.executeOrderClosure(request)));
            for (const result of batchResults) {
                if (result.status === 'fulfilled') {
                    results.push(result.value);
                }
                else {
                    console.error('[OrderClosureService] Batch closure error:', result.reason);
                }
            }
        }
        return results;
    }
    /**
     * Get closure statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get recent errors
     */
    getRecentErrors() {
        return [...this.recentErrors];
    }
    /**
     * Get health status
     */
    getHealthStatus() {
        const totalClosures = this.stats.totalClosures;
        const successRate = totalClosures > 0 ? (this.stats.successfulClosures / totalClosures) * 100 : 100;
        // Count errors in the last 5 minutes
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        const recentErrorCount = this.recentErrors.filter(e => e.timestamp > fiveMinutesAgo).length;
        const isHealthy = successRate > 95 && recentErrorCount < 10 && this.stats.averageProcessingTime < 5000;
        return {
            isHealthy,
            successRate,
            averageProcessingTime: this.stats.averageProcessingTime,
            recentErrorCount,
        };
    }
    /**
     * Validate order exists and can be closed
     */
    async validateOrder(dealId, userId) {
        try {
            const [order] = await db_js_1.db.select().from(schema_1.deals).where((0, drizzle_orm_1.eq)(schema_1.deals.id, dealId));
            if (!order) {
                return { isValid: false, error: 'Order not found' };
            }
            if (order.userId !== userId) {
                return { isValid: false, error: 'Order does not belong to user' };
            }
            if (order.status !== 'open') {
                return { isValid: false, error: `Order is already ${order.status}` };
            }
            return { isValid: true, order };
        }
        catch (error) {
            console.error('[OrderClosureService] Order validation error:', error);
            return { isValid: false, error: 'Database validation error' };
        }
    }
    /**
     * Calculate precise P&L with detailed breakdown
     */
    calculatePrecisePnL({ openPrice, closePrice, direction, amount, multiplier, }) {
        // Calculate volume (leveraged amount)
        const volume = amount * multiplier;
        // Calculate price change
        const priceChange = (closePrice - openPrice) / openPrice;
        const priceChangePercent = priceChange * 100;
        // Calculate gross profit based on direction
        let grossProfit = 0;
        if (direction === 'up') {
            grossProfit = volume * priceChange;
        }
        else {
            grossProfit = volume * (-priceChange);
        }
        // Calculate commission (0.05% of volume)
        const commission = volume * 0.0005;
        // Calculate final profit after commission
        const finalProfit = grossProfit - commission;
        // Calculate profit percentage relative to invested amount
        const profitPercentage = (finalProfit / amount) * 100;
        return {
            volume,
            priceChange,
            priceChangePercent,
            grossProfit,
            commission,
            finalProfit,
            profitPercentage,
        };
    }
    /**
     * Execute database transaction for order closure
     */
    async executeClosureTransaction({ order, closePrice, profit, reason, triggeredBy, }) {
        try {
            // Update the deal record
            await db_js_1.db.update(schema_1.deals)
                .set({
                status: 'closed',
                closedAt: new Date(),
                closePrice: closePrice.toString(),
                profit: profit.toString(),
                // Add metadata about closure
                metadata: {
                    reason,
                    triggeredBy,
                    closedAt: new Date().toISOString(),
                },
            })
                .where((0, drizzle_orm_1.eq)(schema_1.deals.id, order.id));
        }
        catch (error) {
            console.error('[OrderClosureService] Database transaction error:', error);
            throw new Error('Failed to update order in database');
        }
    }
    /**
     * Update user financial data after order closure
     */
    async updateUserFinancials(userId, { returnedAmount, profit, tradeVolume, }) {
        try {
            // Return invested amount plus profit to free balance
            await storage_js_1.storage.updateUserFreeBalance(userId, returnedAmount + profit);
            // Update trading statistics
            await storage_js_1.storage.updateUserTradingStats(userId, profit, tradeVolume);
            // Apply auto rewards based on new balance
            await (0, autoRewards_js_1.applyAutoRewards)(userId);
        }
        catch (error) {
            console.error('[OrderClosureService] User financials update error:', error);
            throw new Error('Failed to update user finances');
        }
    }
    /**
     * Send closure notification to user
     */
    async sendClosureNotification({ userId, order, closePrice, profit, reason, }) {
        try {
            const isProfit = profit > 0;
            const profitPercentage = (profit / Number(order.amount)) * 100;
            let title;
            let emoji;
            switch (reason) {
                case 'take_profit':
                    title = 'Take Profit Achieved!';
                    emoji = '🎯';
                    break;
                case 'stop_loss':
                    title = 'Stop Loss Triggered';
                    emoji = '🛡️';
                    break;
                case 'manual':
                    title = 'Position Closed';
                    emoji = '✅';
                    break;
                default:
                    title = 'Position Closed';
                    emoji = '📈';
            }
            const message = `${emoji} Your ${order.direction.toUpperCase()} position on ${order.symbol} was closed.\n\n` +
                `💰 Amount: $${Number(order.amount).toFixed(2)}\n` +
                `📊 P&L: ${isProfit ? '+' : ''}$${profit.toFixed(2)} (${profitPercentage.toFixed(1)}%)\n` +
                `💲 Close Price: ${closePrice.toFixed(4)}\n` +
                `⏰ Closed: ${new Date().toLocaleTimeString()}`;
            await notifications_js_1.NotificationService.createNotification({
                userId,
                type: 'auto_close_trade',
                title,
                message,
            });
        }
        catch (error) {
            console.error('[OrderClosureService] Notification error:', error);
            // Don't throw - notification failure shouldn't fail the closure
        }
    }
    /**
     * Get user's current balance
     */
    async getUserBalance(userId) {
        try {
            const [user] = await db_js_1.db.select().from(schema_1.users).where((0, drizzle_orm_1.eq)(schema_1.users.id, userId));
            return user ? Number(user.freeBalance || 0) : 0;
        }
        catch (error) {
            console.error('[OrderClosureService] Error getting user balance:', error);
            return 0;
        }
    }
    /**
     * Track error for monitoring
     */
    trackError(dealId, error) {
        this.recentErrors.unshift({
            timestamp: new Date(),
            error,
            dealId,
        });
        // Keep only recent errors
        if (this.recentErrors.length > this.MAX_ERROR_HISTORY) {
            this.recentErrors = this.recentErrors.slice(0, this.MAX_ERROR_HISTORY);
        }
    }
    /**
     * Update closure statistics
     */
    updateClosureStats(reason, profit, processingTime) {
        this.stats.totalClosures++;
        this.stats.successfulClosures++;
        this.stats.lastClosureAt = new Date();
        // Track by closure type
        if (reason === 'take_profit') {
            this.stats.takeProfitClosures++;
        }
        else if (reason === 'stop_loss') {
            this.stats.stopLossClosures++;
        }
        // Update profit/loss averages
        if (profit > 0) {
            this.stats.averageProfit = (this.stats.averageProfit + profit) / 2;
        }
        else {
            this.stats.averageLoss = (this.stats.averageLoss + Math.abs(profit)) / 2;
        }
        // Update processing time average
        this.closureTimings.push(processingTime);
        if (this.closureTimings.length > this.MAX_TIMING_SAMPLES) {
            this.closureTimings.shift();
        }
        this.stats.averageProcessingTime = this.closureTimings.reduce((a, b) => a + b, 0) / this.closureTimings.length;
    }
}
exports.OrderClosureService = OrderClosureService;
// Export singleton instance
exports.orderClosureService = OrderClosureService.getInstance();
