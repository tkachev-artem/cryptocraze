"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.priceMonitorService = exports.PriceMonitorService = void 0;
const events_1 = require("events");
const unifiedPriceService_js_1 = require("../unifiedPriceService.js");
const redisService_js_1 = require("../redisService.js");
/**
 * Price Monitor Service
 * Integrates with unifiedPriceService to provide real-time price monitoring for TP/SL workers
 */
class PriceMonitorService extends events_1.EventEmitter {
    static instance;
    // Price tracking
    trackedSymbols = new Set();
    priceAlerts = new Map();
    lastPrices = new Map();
    // Performance metrics
    stats = {
        trackedSymbols: 0,
        priceUpdatesReceived: 0,
        alertsTriggered: 0,
        averageLatency: 0,
        lastUpdateTime: new Date(),
        failedPricesFetches: 0,
    };
    // Intervals and monitoring
    priceCheckInterval = null;
    healthCheckInterval = null;
    isRunning = false;
    // Configuration
    UPDATE_INTERVAL = 1000; // 1 second
    HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
    MAX_FAILED_FETCHES = 50;
    constructor() {
        super();
        this.setupPriceServiceIntegration();
    }
    static getInstance() {
        if (!PriceMonitorService.instance) {
            PriceMonitorService.instance = new PriceMonitorService();
        }
        return PriceMonitorService.instance;
    }
    /**
     * Start price monitoring service
     */
    async start() {
        if (this.isRunning) {
            console.log('[PriceMonitorService] Already running');
            return;
        }
        console.log('[PriceMonitorService] Starting price monitoring...');
        try {
            // Initialize with existing tracked symbols from unifiedPriceService
            await this.initializeTrackedSymbols();
            // Start price monitoring loop
            this.startPriceMonitoring();
            // Start health checks
            this.startHealthMonitoring();
            this.isRunning = true;
            console.log(`[PriceMonitorService] Started monitoring ${this.trackedSymbols.size} symbols`);
        }
        catch (error) {
            console.error('[PriceMonitorService] Failed to start:', error);
            throw error;
        }
    }
    /**
     * Stop price monitoring service
     */
    async stop() {
        console.log('[PriceMonitorService] Stopping price monitoring...');
        this.isRunning = false;
        if (this.priceCheckInterval) {
            clearInterval(this.priceCheckInterval);
            this.priceCheckInterval = null;
        }
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
            this.healthCheckInterval = null;
        }
        console.log('[PriceMonitorService] Price monitoring stopped');
    }
    /**
     * Add symbol to monitoring
     */
    async addSymbolToMonitoring(symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (this.trackedSymbols.has(upperSymbol)) {
            return; // Already tracking
        }
        try {
            // Add to unified price service if not already there
            await unifiedPriceService_js_1.unifiedPriceService.addPair(upperSymbol);
            // Add to our tracking
            this.trackedSymbols.add(upperSymbol);
            this.stats.trackedSymbols = this.trackedSymbols.size;
            console.log(`[PriceMonitorService] Added ${upperSymbol} to monitoring`);
        }
        catch (error) {
            console.error(`[PriceMonitorService] Failed to add ${upperSymbol} to monitoring:`, error);
            throw error;
        }
    }
    /**
     * Remove symbol from monitoring
     */
    removeSymbolFromMonitoring(symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (this.trackedSymbols.has(upperSymbol)) {
            this.trackedSymbols.delete(upperSymbol);
            this.priceAlerts.delete(upperSymbol);
            this.lastPrices.delete(upperSymbol);
            this.stats.trackedSymbols = this.trackedSymbols.size;
            console.log(`[PriceMonitorService] Removed ${upperSymbol} from monitoring`);
        }
    }
    /**
     * Add price alert for TP/SL
     */
    addPriceAlert(alert) {
        const { symbol } = alert;
        const upperSymbol = symbol.toUpperCase();
        if (!this.priceAlerts.has(upperSymbol)) {
            this.priceAlerts.set(upperSymbol, []);
        }
        const alerts = this.priceAlerts.get(upperSymbol);
        // Remove existing alert for the same deal
        const existingIndex = alerts.findIndex(a => a.dealId === alert.dealId);
        if (existingIndex >= 0) {
            alerts.splice(existingIndex, 1);
        }
        alerts.push(alert);
        console.log(`[PriceMonitorService] Added ${alert.alertType} alert for ${upperSymbol} at ${alert.targetPrice}`);
    }
    /**
     * Remove price alert
     */
    removePriceAlert(dealId, symbol) {
        if (symbol) {
            const upperSymbol = symbol.toUpperCase();
            const alerts = this.priceAlerts.get(upperSymbol);
            if (alerts) {
                const index = alerts.findIndex(a => a.dealId === dealId);
                if (index >= 0) {
                    alerts.splice(index, 1);
                    if (alerts.length === 0) {
                        this.priceAlerts.delete(upperSymbol);
                    }
                }
            }
        }
        else {
            // Remove from all symbols
            for (const [symbol, alerts] of this.priceAlerts.entries()) {
                const index = alerts.findIndex(a => a.dealId === dealId);
                if (index >= 0) {
                    alerts.splice(index, 1);
                    if (alerts.length === 0) {
                        this.priceAlerts.delete(symbol);
                    }
                }
            }
        }
    }
    /**
     * Get current price for symbol
     */
    getCurrentPrice(symbol) {
        return this.lastPrices.get(symbol.toUpperCase()) || null;
    }
    /**
     * Get all current prices
     */
    getAllCurrentPrices() {
        return new Map(this.lastPrices);
    }
    /**
     * Get monitoring statistics
     */
    getStats() {
        return { ...this.stats };
    }
    /**
     * Get health status
     */
    getHealthStatus() {
        const isHealthy = this.isRunning &&
            this.stats.failedPricesFetches < this.MAX_FAILED_FETCHES &&
            (Date.now() - this.stats.lastUpdateTime.getTime()) < 10000; // Last update within 10s
        return {
            isHealthy,
            isRunning: this.isRunning,
            trackedSymbols: this.stats.trackedSymbols,
            recentFailures: this.stats.failedPricesFetches,
            uptime: this.isRunning ? Date.now() - this.stats.lastUpdateTime.getTime() : 0,
        };
    }
    /**
     * Initialize tracked symbols from unifiedPriceService
     */
    async initializeTrackedSymbols() {
        try {
            // Get all currently tracked pairs from the unified service
            // This will be populated as orders are created and pairs are added
            this.stats.trackedSymbols = this.trackedSymbols.size;
        }
        catch (error) {
            console.error('[PriceMonitorService] Failed to initialize tracked symbols:', error);
        }
    }
    /**
     * Setup integration with unifiedPriceService
     */
    setupPriceServiceIntegration() {
        // Listen for price updates from unified service
        unifiedPriceService_js_1.unifiedPriceService.on('priceUpdate', (priceData) => {
            this.handlePriceUpdate(priceData);
        });
        // Listen for Redis price updates (for distributed scenarios)
        redisService_js_1.redisService.on('priceUpdate', (priceData) => {
            this.handlePriceUpdate(priceData);
        });
    }
    /**
     * Handle incoming price update
     */
    handlePriceUpdate(priceData) {
        const { symbol } = priceData;
        // Only process if we're tracking this symbol
        if (!this.trackedSymbols.has(symbol)) {
            return;
        }
        // Update our price cache
        this.lastPrices.set(symbol, priceData);
        // Update stats
        this.stats.priceUpdatesReceived++;
        this.stats.lastUpdateTime = new Date();
        // Check for triggered alerts
        this.checkPriceAlerts(symbol, priceData);
        // Emit price update event for other components
        this.emit('priceUpdate', priceData);
    }
    /**
     * Check if any price alerts are triggered
     */
    checkPriceAlerts(symbol, priceData) {
        const alerts = this.priceAlerts.get(symbol);
        if (!alerts || alerts.length === 0) {
            return;
        }
        const triggeredAlerts = alerts.filter(alert => {
            if (alert.condition === 'above' && priceData.price >= alert.targetPrice) {
                return true;
            }
            if (alert.condition === 'below' && priceData.price <= alert.targetPrice) {
                return true;
            }
            return false;
        });
        // Process triggered alerts
        for (const alert of triggeredAlerts) {
            this.handleTriggeredAlert(alert, priceData);
        }
        if (triggeredAlerts.length > 0) {
            this.stats.alertsTriggered += triggeredAlerts.length;
            // Remove triggered alerts
            const remainingAlerts = alerts.filter(alert => !triggeredAlerts.find(ta => ta.dealId === alert.dealId));
            if (remainingAlerts.length === 0) {
                this.priceAlerts.delete(symbol);
            }
            else {
                this.priceAlerts.set(symbol, remainingAlerts);
            }
        }
    }
    /**
     * Handle triggered price alert
     */
    handleTriggeredAlert(alert, priceData) {
        console.log(`[PriceMonitorService] Alert triggered: ${alert.alertType} for deal ${alert.dealId} at ${priceData.price}`);
        // Emit alert event
        this.emit('alertTriggered', {
            alert,
            currentPrice: priceData.price,
            timestamp: new Date(),
        });
        // Could also trigger immediate job processing here if needed
        // The worker will pick up the change on its next cycle
    }
    /**
     * Start price monitoring loop
     */
    startPriceMonitoring() {
        this.priceCheckInterval = setInterval(async () => {
            await this.performPriceCheck();
        }, this.UPDATE_INTERVAL);
    }
    /**
     * Perform periodic price check
     */
    async performPriceCheck() {
        if (!this.isRunning)
            return;
        try {
            // The actual price updates come via events from unifiedPriceService
            // This method can be used for additional monitoring or fallback logic
            const startTime = Date.now();
            // Update latency stats
            const latency = Date.now() - startTime;
            this.updateLatencyStats(latency);
        }
        catch (error) {
            console.error('[PriceMonitorService] Error during price check:', error);
            this.stats.failedPricesFetches++;
        }
    }
    /**
     * Start health monitoring
     */
    startHealthMonitoring() {
        this.healthCheckInterval = setInterval(() => {
            this.performHealthCheck();
        }, this.HEALTH_CHECK_INTERVAL);
    }
    /**
     * Perform health check
     */
    performHealthCheck() {
        const health = this.getHealthStatus();
        if (!health.isHealthy) {
            console.warn('[PriceMonitorService] Health check failed:', health);
        }
        // Reset failed fetches counter periodically
        if (this.stats.failedPricesFetches > 0) {
            this.stats.failedPricesFetches = Math.max(0, this.stats.failedPricesFetches - 1);
        }
    }
    /**
     * Update latency statistics
     */
    updateLatencyStats(latency) {
        if (this.stats.averageLatency === 0) {
            this.stats.averageLatency = latency;
        }
        else {
            // Rolling average
            this.stats.averageLatency = (this.stats.averageLatency * 0.9) + (latency * 0.1);
        }
    }
}
exports.PriceMonitorService = PriceMonitorService;
// Export singleton instance
exports.priceMonitorService = PriceMonitorService.getInstance();
