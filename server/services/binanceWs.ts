import { EventEmitter } from 'events';
import WebSocket from 'ws';

type LowerSymbol = string;

export interface BinanceWsPriceEvent {
  symbol: string; // UPPERCASE, e.g., BTCUSDT
  price: number;
  exchangeTimestamp: number; // ms
}

/**
 * Lightweight Binance WebSocket client focused on price ticks.
 * - Connects to wss://stream.binance.com:9443/ws
 * - Subscribes per symbol to @trade stream
 * - Emits 'price' with normalized payload
 * - Auto-reconnects and re-subscribes on connection loss
 */
export class BinanceWsService extends EventEmitter {
  private static readonly BINANCE_WS_URL = 'wss://stream.binance.com:9443/ws';

  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectAttempt = 0;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  private readonly subscribedSymbols = new Set<LowerSymbol>();

  constructor() {
    super();
    this.connect();
  }

  async subscribe(symbol: string): Promise<void> {
    const lower = symbol.toLowerCase();
    if (this.subscribedSymbols.has(lower)) return;
    
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

  async unsubscribe(symbol: string): Promise<void> {
    const lower = symbol.toLowerCase();
    if (!this.subscribedSymbols.has(lower)) return;
    this.subscribedSymbols.delete(lower);
    this.sendJson({
      method: 'UNSUBSCRIBE',
      params: [`${lower}@trade`],
      id: Date.now(),
    });
  }

  destroy(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = null;
    this.subscribedSymbols.clear();
    this.ws?.removeAllListeners();
    this.ws?.close();
    this.ws = null;
  }

  // --- internals ---
  private connect(): void {
    if (this.isConnecting) return;
    this.isConnecting = true;
    try {
      console.log('🔄 Подключение к Binance WebSocket...');
      this.ws = new WebSocket(BinanceWsService.BINANCE_WS_URL);

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

      this.ws.on('message', (raw: WebSocket.RawData) => {
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
    } catch {
      this.scheduleReconnect();
    }
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    // Binance auto-pings, but we guard against silent stalls
    this.heartbeatTimer = setTimeout(() => {
      // If no message in a while, nudge the connection
      this.ws?.ping?.();
      this.startHeartbeat();
    }, 30_000);
  }

  private scheduleReconnect(): void {
    if (this.heartbeatTimer) clearTimeout(this.heartbeatTimer);
    this.heartbeatTimer = null;
    if (this.isConnecting) return;
    this.isConnecting = false;
    this.ws?.removeAllListeners();
    this.ws = null;
    const backoffMs = Math.min(30_000, 500 * Math.pow(2, this.reconnectAttempt++)) + Math.floor(Math.random() * 250);
    setTimeout(() => this.connect(), backoffMs);
  }

  private sendJson(payload: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    try {
      this.ws.send(JSON.stringify(payload));
    } catch {
      // ignore
    }
  }

  private handleMessage(text: string): void {
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
          const payload: BinanceWsPriceEvent = { symbol, price, exchangeTimestamp };
          console.log(`📊 ${symbol}: $${price.toFixed(2)}`);
          this.emit('price', payload);
        }
      }
    } catch {
      // ignore non-JSON payloads
    }
  }
}

export const binanceWs = new BinanceWsService();

