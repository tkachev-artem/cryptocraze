"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.workerManager = exports.WorkerManager = void 0;
const events_1 = require("events");
const queueManager_js_1 = require("./queueManager.js");
const orderMonitorWorker_js_1 = require("./orderMonitorWorker.js");
const priceMonitorService_js_1 = require("./priceMonitorService.js");
const orderClosureService_js_1 = require("./orderClosureService.js");
/**
 * Worker Manager
 * Central orchestrator for the entire TP/SL worker system
 */
class WorkerManager extends events_1.EventEmitter {
    static instance;
    isInitialized = false;
    isShuttingDown = false;
    // Health monitoring
    healthCheckInterval = null;
    HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
    // Performance tracking
    systemStartTime = new Date();
    lastHealthCheck = null;
    constructor() {
        super();
    }
    static getInstance() {
        if (!WorkerManager.instance) {
            WorkerManager.instance = new WorkerManager();
        }
        return WorkerManager.instance;
    }
    /**
     * Initialize the entire worker system
     */
    async initialize() {
        if (this.isInitialized) {
            console.log('[WorkerManager] System already initialized');
            return;
        }
        console.log('[WorkerManager] Initializing TP/SL worker system...');
        try {
            // Start price monitoring service
            await priceMonitorService_js_1.priceMonitorService.start();
            console.log('[WorkerManager] ✅ Price monitor service started');
            // Setup event handlers between services
            this.setupServiceIntegrations();
            console.log('[WorkerManager] ✅ Service integrations configured');
            // Start health monitoring
            this.startHealthMonitoring();
            console.log('[WorkerManager] ✅ Health monitoring started');
            this.isInitialized = true;
            console.log('[WorkerManager] 🚀 Worker system initialization complete');
            this.emit('initialized');
        }
        catch (error) {
            console.error('[WorkerManager] Failed to initialize worker system:', error);
            throw error;
        }
    }
    /**
     * Add order to TP/SL monitoring
     */
    async addOrderToMonitoring(orderData) {
        try {
            if (!this.isInitialized) {
                throw new Error('Worker system not initialized');
            }
            console.log(`[WorkerManager] Adding order ${orderData.dealId} to monitoring`);
            // Add to queue manager
            await queueManager_js_1.queueManager.addOrderToMonitoring(orderData);
            // Add symbol to price monitoring
            await priceMonitorService_js_1.priceMonitorService.addSymbolToMonitoring(orderData.symbol);
            // Set up price alerts if needed
            if (orderData.takeProfit) {
                const condition = orderData.direction === 'up' ? 'above' : 'below';
                const targetPrice = orderData.direction === 'up'
                    ? orderData.openPrice * (1 + orderData.takeProfit / (orderData.amount * orderData.multiplier))
                    : orderData.openPrice * (1 - orderData.takeProfit / (orderData.amount * orderData.multiplier));
                priceMonitorService_js_1.priceMonitorService.addPriceAlert({
                    symbol: orderData.symbol,
                    targetPrice,
                    condition,
                    dealId: orderData.dealId,
                    userId: orderData.userId,
                    alertType: 'take_profit',
                });
            }
            if (orderData.stopLoss) {
                const condition = orderData.direction === 'up' ? 'below' : 'above';
                const targetPrice = orderData.direction === 'up'
                    ? orderData.openPrice * (1 - Math.abs(orderData.stopLoss) / (orderData.amount * orderData.multiplier))
                    : orderData.openPrice * (1 + Math.abs(orderData.stopLoss) / (orderData.amount * orderData.multiplier));
                priceMonitorService_js_1.priceMonitorService.addPriceAlert({
                    symbol: orderData.symbol,
                    targetPrice,
                    condition,
                    dealId: orderData.dealId,
                    userId: orderData.userId,
                    alertType: 'stop_loss',
                });
            }
            console.log(`[WorkerManager] Successfully added order ${orderData.dealId} to monitoring`);
            return true;
        }
        catch (error) {
            console.error(`[WorkerManager] Failed to add order ${orderData.dealId} to monitoring:`, error);
            return false;
        }
    }
    /**
     * Remove order from monitoring
     */
    async removeOrderFromMonitoring(dealId) {
        try {
            console.log(`[WorkerManager] Removing order ${dealId} from monitoring`);
            // Remove from queue manager
            const removed = await queueManager_js_1.queueManager.removeOrderFromMonitoring(dealId);
            // Remove price alerts
            priceMonitorService_js_1.priceMonitorService.removePriceAlert(dealId);
            console.log(`[WorkerManager] Order ${dealId} removal: ${removed ? 'success' : 'not found'}`);
            return removed;
        }
        catch (error) {
            console.error(`[WorkerManager] Failed to remove order ${dealId} from monitoring:`, error);
            return false;
        }
    }
    /**
     * Get comprehensive system health status
     */
    async getSystemHealth() {
        try {
            const [queueStats, priceStats, closureStats, workerMetrics] = await Promise.all([
                queueManager_js_1.queueManager.getQueueStats(),
                priceMonitorService_js_1.priceMonitorService.getStats(),
                orderClosureService_js_1.orderClosureService.getStats(),
                orderMonitorWorker_js_1.orderMonitorWorker.getMetrics(),
            ]);
            const queueHealth = queueManager_js_1.queueManager.getHealthStatus();
            const priceHealth = priceMonitorService_js_1.priceMonitorService.getHealthStatus();
            const closureHealth = orderClosureService_js_1.orderClosureService.getHealthStatus();
            // Calculate overall health
            const componentHealthy = priceHealth.isHealthy && closureHealth.isHealthy;
            const queueHealthy = queueStats.orderMonitor.failed < 10;
            const isOverallHealthy = componentHealthy && queueHealthy && this.isInitialized && !this.isShuttingDown;
            // Calculate overall stats
            const totalProcessed = workerMetrics.totalProcessed;
            const successRate = closureHealth.successRate;
            const averageLatency = priceStats.averageLatency;
            const activeOrders = queueStats.orderMonitor.active + queueStats.orderMonitor.waiting;
            const health = {
                isHealthy: isOverallHealthy,
                components: {
                    queueManager: {
                        isHealthy: queueHealthy,
                        queues: queueStats,
                    },
                    priceMonitor: {
                        isHealthy: priceHealth.isHealthy,
                        stats: priceStats,
                    },
                    orderClosure: {
                        isHealthy: closureHealth.isHealthy,
                        stats: closureStats,
                    },
                    orderWorker: {
                        isHealthy: !workerMetrics.isShuttingDown,
                        metrics: workerMetrics,
                    },
                },
                overallStats: {
                    activeOrders,
                    totalProcessed,
                    successRate,
                    averageLatency,
                },
                lastHealthCheck: new Date(),
            };
            this.lastHealthCheck = health;
            return health;
        }
        catch (error) {
            console.error('[WorkerManager] Error getting system health:', error);
            return {
                isHealthy: false,
                components: {
                    queueManager: { isHealthy: false, queues: null },
                    priceMonitor: { isHealthy: false, stats: null },
                    orderClosure: { isHealthy: false, stats: null },
                    orderWorker: { isHealthy: false, metrics: null },
                },
                overallStats: {
                    activeOrders: 0,
                    totalProcessed: 0,
                    successRate: 0,
                    averageLatency: 0,
                },
                lastHealthCheck: new Date(),
            };
        }
    }
    /**
     * Get system uptime
     */
    getUptime() {
        const uptime = Date.now() - this.systemStartTime.getTime();
        const days = Math.floor(uptime / (24 * 60 * 60 * 1000));
        const hours = Math.floor((uptime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
        const minutes = Math.floor((uptime % (60 * 60 * 1000)) / (60 * 1000));
        return {
            uptime,
            uptimeFormatted: `${days}d ${hours}h ${minutes}m`,
            startTime: this.systemStartTime,
        };
    }
    /**
     * Get last health check result
     */
    getLastHealthCheck() {
        return this.lastHealthCheck;
    }
    /**
     * Gracefully shutdown the entire worker system
     */
    async shutdown() {
        if (this.isShuttingDown) {
            console.log('[WorkerManager] Shutdown already in progress');
            return;
        }
        console.log('[WorkerManager] Starting graceful shutdown...');
        this.isShuttingDown = true;
        try {
            // Stop health monitoring
            if (this.healthCheckInterval) {
                clearInterval(this.healthCheckInterval);
                this.healthCheckInterval = null;
            }
            // Shutdown components in reverse order of initialization
            const shutdownPromises = [
                orderMonitorWorker_js_1.orderMonitorWorker.shutdown(),
                priceMonitorService_js_1.priceMonitorService.stop(),
                queueManager_js_1.queueManager.shutdown(),
            ];
            await Promise.allSettled(shutdownPromises);
            this.isInitialized = false;
            console.log('[WorkerManager] ✅ Graceful shutdown completed');
            this.emit('shutdown');
        }
        catch (error) {
            console.error('[WorkerManager] Error during shutdown:', error);
            throw error;
        }
    }
    /**
     * Emergency stop (force shutdown)
     */
    async emergencyStop() {
        console.log('[WorkerManager] ⚠️  Emergency stop initiated');
        this.isShuttingDown = true;
        // Force stop all components immediately
        try {
            await Promise.allSettled([
                orderMonitorWorker_js_1.orderMonitorWorker.shutdown(),
                priceMonitorService_js_1.priceMonitorService.stop(),
                queueManager_js_1.queueManager.shutdown(),
            ]);
        }
        catch (error) {
            console.error('[WorkerManager] Errors during emergency stop:', error);
        }
        this.isInitialized = false;
        this.emit('emergencyStop');
    }
    /**
     * Setup integrations between services
     */
    setupServiceIntegrations() {
        // Handle price alerts from price monitor service
        priceMonitorService_js_1.priceMonitorService.on('alertTriggered', ({ alert, currentPrice, timestamp }) => {
            console.log(`[WorkerManager] Price alert triggered for deal ${alert.dealId}: ${alert.alertType} at ${currentPrice}`);
            this.emit('priceAlertTriggered', { alert, currentPrice, timestamp });
        });
        // Handle order closures
        orderClosureService_js_1.orderClosureService.on('orderClosed', (result) => {
            console.log(`[WorkerManager] Order ${result.dealId} closed successfully`);
            this.emit('orderClosed', result);
            // Remove from monitoring after successful closure
            this.removeOrderFromMonitoring(result.dealId);
        });
        // Handle closure errors
        orderClosureService_js_1.orderClosureService.on('closureError', ({ dealId, error, userId }) => {
            console.error(`[WorkerManager] Order closure error for ${dealId}:`, error);
            this.emit('closureError', { dealId, error, userId });
        });
        // Handle price updates for system monitoring
        priceMonitorService_js_1.priceMonitorService.on('priceUpdate', (priceData) => {
            // Can emit or log price updates if needed for monitoring
            // Avoid spamming logs, but useful for debug mode
            if (process.env.NODE_ENV === 'development') {
                // Log price updates less frequently in development
            }
        });
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(async () => {
            try {
                const health = await this.getSystemHealth();
                if (!health.isHealthy) {
                    console.warn('[WorkerManager] ⚠️  System health check failed:', {
                        priceMonitor: health.components.priceMonitor.isHealthy,
                        orderClosure: health.components.orderClosure.isHealthy,
                        queueManager: health.components.queueManager.isHealthy,
                        orderWorker: health.components.orderWorker.isHealthy,
                    });
                    this.emit('healthCheckFailed', health);
                }
            }
            catch (error) {
                console.error('[WorkerManager] Health check error:', error);
            }
        }, this.HEALTH_CHECK_INTERVAL);
    }
}
exports.WorkerManager = WorkerManager;
// Export singleton instance
exports.workerManager = WorkerManager.getInstance();
