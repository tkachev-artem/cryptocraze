"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.binanceWs = exports.BinanceWsService = void 0;
const events_1 = require("events");
const ws_1 = __importDefault(require("ws"));
/**
 * Lightweight Binance WebSocket client focused on price ticks.
 * - Connects to wss://stream.binance.com:9443/ws
 * - Subscribes per symbol to @trade stream
 * - Emits 'price' with normalized payload
 * - Auto-reconnects and re-subscribes on connection loss
 */
class BinanceWsService extends events_1.EventEmitter {
    static BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';
    ws = null;
    isConnecting = false;
    reconnectAttempt = 0;
    heartbeatTimer = null;
    subscribedSymbols = new Set();
    constructor() {
        super();
        this.connect();
    }
    async subscribe(symbol) {
        const lower = symbol.toLowerCase();
        if (this.subscribedSymbols.has(lower))
            return;
        this.subscribedSymbols.add(lower);
        console.log(`📡 Подписываемся на ${symbol} (всего символов: ${this.subscribedSymbols.size})`);
        // Защита от флуда: максимум 1 подписка в секунду
        await new Promise(resolve => setTimeout(resolve, 1000));
        this.sendJson({
            method: 'SUBSCRIBE',
            params: [`${lower}@trade`],
            id: Date.now(),
        });
    }
    async unsubscribe(symbol) {
        const lower = symbol.toLowerCase();
        if (!this.subscribedSymbols.has(lower))
            return;
        this.subscribedSymbols.delete(lower);
        this.sendJson({
            method: 'UNSUBSCRIBE',
            params: [`${lower}@trade`],
            id: Date.now(),
        });
    }
    destroy() {
        if (this.heartbeatTimer)
            clearTimeout(this.heartbeatTimer);
        this.heartbeatTimer = null;
        this.subscribedSymbols.clear();
        this.ws?.removeAllListeners();
        this.ws?.close();
        this.ws = null;
    }
    // --- internals ---
    connect() {
        if (this.isConnecting)
            return;
        this.isConnecting = true;
        try {
            console.log('🔄 Подключение к Binance WebSocket...');
            this.ws = new ws_1.default(BinanceWsService.BINANCE_WS_URL);
            this.ws.on('open', () => {
                console.log('✅ Binance WebSocket подключен');
                this.isConnecting = false;
                this.reconnectAttempt = 0;
                // Re-subscribe all symbols
                if (this.subscribedSymbols.size > 0) {
                    console.log(`📡 Подписываемся на символы: ${Array.from(this.subscribedSymbols).join(', ')}`);
                    this.sendJson({
                        method: 'SUBSCRIBE',
                        params: Array.from(this.subscribedSymbols).map((s) => `${s}@trade`),
                        id: Date.now(),
                    });
                }
                this.startHeartbeat();
            });
            this.ws.on('message', (raw) => {
                this.handleMessage(raw.toString());
            });
            this.ws.on('close', (code, reason) => {
                console.log(`❌ Binance WebSocket закрыт: ${code} ${reason?.toString() || ''}`);
                this.scheduleReconnect();
            });
            this.ws.on('error', (error) => {
                console.error('❌ Ошибка Binance WebSocket:', error);
                this.scheduleReconnect();
            });
        }
        catch {
            this.scheduleReconnect();
        }
    }
    startHeartbeat() {
        if (this.heartbeatTimer)
            clearTimeout(this.heartbeatTimer);
        // Binance auto-pings, but we guard against silent stalls
        this.heartbeatTimer = setTimeout(() => {
            // If no message in a while, nudge the connection
            this.ws?.ping?.();
            this.startHeartbeat();
        }, 30_000);
    }
    scheduleReconnect() {
        if (this.heartbeatTimer)
            clearTimeout(this.heartbeatTimer);
        this.heartbeatTimer = null;
        if (this.isConnecting)
            return;
        this.isConnecting = false;
        this.ws?.removeAllListeners();
        this.ws = null;
        const backoffMs = Math.min(30_000, 500 * Math.pow(2, this.reconnectAttempt++)) + Math.floor(Math.random() * 250);
        setTimeout(() => this.connect(), backoffMs);
    }
    sendJson(payload) {
        if (!this.ws || this.ws.readyState !== ws_1.default.OPEN)
            return;
        try {
            this.ws.send(JSON.stringify(payload));
        }
        catch {
            // ignore
        }
    }
    handleMessage(text) {
        try {
            const msg = JSON.parse(text);
            // Ignore non-stream data
            // Combined or single stream messages may have different shapes
            // Trade event example fields: e (event type), E (event time), s (symbol), p (price)
            const data = msg.data ?? msg;
            if (data && (data.e === 'trade' || data.e === 'aggTrade')) {
                const symbol = String(data.s ?? '').toUpperCase();
                const price = parseFloat(String(data.p ?? data.P ?? ''));
                const exchangeTimestamp = Number(data.T ?? data.E ?? Date.now());
                if (symbol && Number.isFinite(price)) {
                    const payload = { symbol, price, exchangeTimestamp };
                    console.log(`📊 ${symbol}: $${price.toFixed(2)}`);
                    this.emit('price', payload);
                }
            }
        }
        catch {
            // ignore non-JSON payloads
        }
    }
}
exports.BinanceWsService = BinanceWsService;
exports.binanceWs = new BinanceWsService();
