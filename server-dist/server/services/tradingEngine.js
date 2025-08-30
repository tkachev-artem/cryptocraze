"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tradingEngine = exports.TradingEngine = void 0;
const events_1 = require("events");
const cryptoApi_js_1 = require("./cryptoApi.js");
class TradingEngine extends events_1.EventEmitter {
    priceSubscriptions = new Map(); // tradeId -> symbol
    constructor() {
        super();
        this.setupPriceListener();
    }
    setupPriceListener() {
        cryptoApi_js_1.cryptoApi.on('priceUpdate', (priceData) => {
            this.checkTradeClosures(priceData);
        });
    }
    async openTrade() { return { success: false, error: 'Trades disabled' }; }
    async closeTrade() { return { success: false, error: 'Trades disabled' }; }
    async updateTrade() { return { success: false, error: 'Trades disabled' }; }
    async checkTradeClosures(priceData) {
        // Get all trades that are subscribed to this symbol
        const tradesToCheck = Array.from(this.priceSubscriptions.entries())
            .filter(([_, symbol]) => symbol === priceData.symbol)
            .map(([tradeId]) => tradeId);
        for (const tradeId of tradesToCheck) {
            try {
                // Trades disabled: просто чистим подписки на всякий случай
                this.priceSubscriptions.delete(tradeId);
            }
            catch (error) {
                console.error(`Error checking trade ${tradeId} for closure:`, error);
            }
        }
    }
    getCurrentPrice(symbol) {
        const priceData = cryptoApi_js_1.cryptoApi.getPrice(symbol);
        return priceData?.price;
    }
    async getCandlestickData(symbol, interval, limit = 100) {
        return cryptoApi_js_1.cryptoApi.getCandlestickData(symbol, interval, limit);
    }
    destroy() {
        this.priceSubscriptions.clear();
        this.removeAllListeners();
    }
}
exports.TradingEngine = TradingEngine;
exports.tradingEngine = new TradingEngine();
