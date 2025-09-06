import { EventEmitter } from 'events';
import { unifiedPriceService, PriceData } from '../unifiedPriceService.js';
import { redisService } from '../redisService.js';
import { queueManager, OrderMonitorJobData } from './queueManager.js';

export interface PriceAlert {
  symbol: string;
  targetPrice: number;
  condition: 'above' | 'below';
  dealId: number;
  userId: string;
  alertType: 'take_profit' | 'stop_loss';
}

export interface PriceMonitorStats {
  trackedSymbols: number;
  priceUpdatesReceived: number;
  alertsTriggered: number;
  averageLatency: number;
  lastUpdateTime: Date;
  failedPricesFetches: number;
}

/**
 * Price Monitor Service
 * Integrates with unifiedPriceService to provide real-time price monitoring for TP/SL workers
 */
export class PriceMonitorService extends EventEmitter {
  private static instance: PriceMonitorService;
  
  // Price tracking
  private trackedSymbols = new Set<string>();
  private priceAlerts = new Map<string, PriceAlert[]>();
  private lastPrices = new Map<string, PriceData>();
  
  // Performance metrics
  private stats: PriceMonitorStats = {
    trackedSymbols: 0,
    priceUpdatesReceived: 0,
    alertsTriggered: 0,
    averageLatency: 0,
    lastUpdateTime: new Date(),
    failedPricesFetches: 0,
  };
  
  // Intervals and monitoring
  private priceCheckInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isRunning = false;
  
  // Configuration
  private readonly UPDATE_INTERVAL = 1000; // 1 second
  private readonly HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly MAX_FAILED_FETCHES = 50;

  private constructor() {
    super();
    this.setupPriceServiceIntegration();
  }

  public static getInstance(): PriceMonitorService {
    if (!PriceMonitorService.instance) {
      PriceMonitorService.instance = new PriceMonitorService();
    }
    return PriceMonitorService.instance;
  }

  /**
   * Start price monitoring service
   */
  async start(): Promise<void> {
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
      
    } catch (error) {
      console.error('[PriceMonitorService] Failed to start:', error);
      throw error;
    }
  }

  /**
   * Stop price monitoring service
   */
  async stop(): Promise<void> {
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
  async addSymbolToMonitoring(symbol: string): Promise<void> {
    const upperSymbol = symbol.toUpperCase();
    
    if (this.trackedSymbols.has(upperSymbol)) {
      return; // Already tracking
    }
    
    try {
      // Add to unified price service if not already there
      await unifiedPriceService.addPair(upperSymbol);
      
      // Add to our tracking
      this.trackedSymbols.add(upperSymbol);
      this.stats.trackedSymbols = this.trackedSymbols.size;
      
      console.log(`[PriceMonitorService] Added ${upperSymbol} to monitoring`);
      
    } catch (error) {
      console.error(`[PriceMonitorService] Failed to add ${upperSymbol} to monitoring:`, error);
      throw error;
    }
  }

  /**
   * Remove symbol from monitoring
   */
  removeSymbolFromMonitoring(symbol: string): void {
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
  addPriceAlert(alert: PriceAlert): void {
    const { symbol } = alert;
    const upperSymbol = symbol.toUpperCase();
    
    if (!this.priceAlerts.has(upperSymbol)) {
      this.priceAlerts.set(upperSymbol, []);
    }
    
    const alerts = this.priceAlerts.get(upperSymbol)!;
    
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
  removePriceAlert(dealId: number, symbol?: string): void {
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
    } else {
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
  getCurrentPrice(symbol: string): PriceData | null {
    return this.lastPrices.get(symbol.toUpperCase()) || null;
  }

  /**
   * Get all current prices
   */
  getAllCurrentPrices(): Map<string, PriceData> {
    return new Map(this.lastPrices);
  }

  /**
   * Get monitoring statistics
   */
  getStats(): PriceMonitorStats {
    return { ...this.stats };
  }

  /**
   * Get health status
   */
  getHealthStatus(): {
    isHealthy: boolean;
    isRunning: boolean;
    trackedSymbols: number;
    recentFailures: number;
    uptime: number;
  } {
    const isHealthy = this.isRunning && 
                     this.stats.failedPricesFetches < this.MAX_FAILED_FETCHES &&
                     (this.stats.trackedSymbols === 0 || (Date.now() - this.stats.lastUpdateTime.getTime()) < 60000); // Allow 60s for updates, or pass if no symbols
    
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
  private async initializeTrackedSymbols(): Promise<void> {
    try {
      // Get all currently tracked pairs from the unified service
      // This will be populated as orders are created and pairs are added
      this.stats.trackedSymbols = this.trackedSymbols.size;
      
    } catch (error) {
      console.error('[PriceMonitorService] Failed to initialize tracked symbols:', error);
    }
  }

  /**
   * Setup integration with unifiedPriceService
   */
  private setupPriceServiceIntegration(): void {
    // Listen for price updates from unified service
    unifiedPriceService.on('priceUpdate', (priceData: PriceData) => {
      this.handlePriceUpdate(priceData);
    });

    // Listen for Redis price updates (for distributed scenarios)
    redisService.on('priceUpdate', (priceData: PriceData) => {
      this.handlePriceUpdate(priceData);
    });
  }

  /**
   * Handle incoming price update
   */
  private handlePriceUpdate(priceData: PriceData): void {
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
  private checkPriceAlerts(symbol: string, priceData: PriceData): void {
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
      const remainingAlerts = alerts.filter(alert => 
        !triggeredAlerts.find(ta => ta.dealId === alert.dealId)
      );
      
      if (remainingAlerts.length === 0) {
        this.priceAlerts.delete(symbol);
      } else {
        this.priceAlerts.set(symbol, remainingAlerts);
      }
    }
  }

  /**
   * Handle triggered price alert
   */
  private handleTriggeredAlert(alert: PriceAlert, priceData: PriceData): void {
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
  private startPriceMonitoring(): void {
    this.priceCheckInterval = setInterval(async () => {
      await this.performPriceCheck();
    }, this.UPDATE_INTERVAL);
  }

  /**
   * Perform periodic price check
   */
  private async performPriceCheck(): Promise<void> {
    if (!this.isRunning) return;
    
    try {
      // The actual price updates come via events from unifiedPriceService
      // This method can be used for additional monitoring or fallback logic
      
      const startTime = Date.now();
      
      // Update latency stats
      const latency = Date.now() - startTime;
      this.updateLatencyStats(latency);
      
    } catch (error) {
      console.error('[PriceMonitorService] Error during price check:', error);
      this.stats.failedPricesFetches++;
    }
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, this.HEALTH_CHECK_INTERVAL);
  }

  /**
   * Perform health check
   */
  private performHealthCheck(): void {
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
  private updateLatencyStats(latency: number): void {
    if (this.stats.averageLatency === 0) {
      this.stats.averageLatency = latency;
    } else {
      // Rolling average
      this.stats.averageLatency = (this.stats.averageLatency * 0.9) + (latency * 0.1);
    }
  }
}

// Export singleton instance
export const priceMonitorService = PriceMonitorService.getInstance();