import { EventEmitter } from 'events';
import { storage } from '../storage.js';
import { cryptoApi, type PriceData } from './cryptoApi.js';

export interface TradeResult { success: boolean; error?: string }

export class TradingEngine extends EventEmitter {
  private priceSubscriptions = new Map<number, string>(); // tradeId -> symbol
  
  constructor() {
    super();
    this.setupPriceListener();
  }

  private setupPriceListener(): void {
    cryptoApi.on('priceUpdate', (priceData: PriceData) => {
      this.checkTradeClosures(priceData);
    });
  }

  async openTrade(): Promise<TradeResult> { return { success: false, error: 'Trades disabled' } }

  async closeTrade(): Promise<TradeResult> { return { success: false, error: 'Trades disabled' } }

  async updateTrade(): Promise<TradeResult> { return { success: false, error: 'Trades disabled' } }

  private async checkTradeClosures(priceData: PriceData): Promise<void> {
    // Get all trades that are subscribed to this symbol
    const tradesToCheck = Array.from(this.priceSubscriptions.entries())
      .filter(([_, symbol]) => symbol === priceData.symbol)
      .map(([tradeId]) => tradeId);

    for (const tradeId of tradesToCheck) {
      try {
        // Trades disabled: просто чистим подписки на всякий случай
          this.priceSubscriptions.delete(tradeId);
      } catch (error) {
        console.error(`Error checking trade ${tradeId} for closure:`, error);
      }
    }
  }

  getCurrentPrice(symbol: string): number | undefined {
    const priceData = cryptoApi.getPrice(symbol);
    return priceData?.price;
  }

  async getCandlestickData(symbol: string, interval: string, limit: number = 100) {
    return cryptoApi.getCandlestickData(symbol, interval, limit);
  }

  destroy(): void {
    this.priceSubscriptions.clear();
    this.removeAllListeners();
  }
}

export const tradingEngine = new TradingEngine();
