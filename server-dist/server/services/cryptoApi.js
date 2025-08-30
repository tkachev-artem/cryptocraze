"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cryptoApi = exports.CryptoApiService = void 0;
const events_1 = require("events");
class CryptoApiService extends events_1.EventEmitter {
    priceCache = new Map();
    activePairs = new Set();
    priceInterval = null;
    API_BASE = 'https://api.coingecko.com/api/v3';
    // Mapping from our symbols to CoinGecko IDs
    symbolToId = new Map([
        ['BTCUSDT', 'bitcoin'],
        ['ETHUSDT', 'ethereum'],
        ['ADAUSDT', 'cardano'],
        ['DOTUSDT', 'polkadot'],
        ['LINKUSDT', 'chainlink'],
        ['LTCUSDT', 'litecoin'],
        ['BCHUSDT', 'bitcoin-cash'],
        ['XLMUSDT', 'stellar'],
        ['EOSUSDT', 'eos'],
        ['TRXUSDT', 'tron'],
    ]);
    constructor() {
        super();
        this.startPriceUpdates();
    }
    async addPair(symbol) {
        if (!this.symbolToId.has(symbol)) {
            throw new Error(`Unsupported trading pair: ${symbol}`);
        }
        this.activePairs.add(symbol);
        // Fetch initial price
        try {
            const priceData = await this.fetchPrice(symbol);
            this.priceCache.set(symbol, priceData);
            this.emit('priceUpdate', priceData);
        }
        catch (error) {
            console.error(`Failed to fetch initial price for ${symbol}:`, error);
        }
    }
    removePair(symbol) {
        this.activePairs.delete(symbol);
        this.priceCache.delete(symbol);
    }
    getPrice(symbol) {
        return this.priceCache.get(symbol);
    }
    async getCandlestickData(symbol, interval, limit = 100) {
        const coinId = this.symbolToId.get(symbol);
        if (!coinId) {
            throw new Error(`Unsupported trading pair: ${symbol}`);
        }
        try {
            // Convert interval to days for CoinGecko API
            const days = this.intervalToDays(interval);
            const response = await fetch(`${this.API_BASE}/coins/${coinId}/market_chart?vs_currency=usd&days=${days}&interval=${interval}`);
            if (!response.ok) {
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            const data = await response.json();
            // Convert to candlestick format (CoinGecko doesn't provide OHLC, so we simulate it)
            const candlesticks = [];
            const prices = data.prices || [];
            const volumes = data.total_volumes || [];
            for (let i = 0; i < Math.min(prices.length, limit); i++) {
                const [timestamp, price] = prices[i];
                const [, volume] = volumes[i] || [timestamp, 0];
                // Simulate OHLC from price data
                const volatility = 0.005; // 0.5% volatility
                const variation = price * volatility * (Math.random() - 0.5);
                candlesticks.push({
                    timestamp,
                    open: price + variation,
                    high: price + Math.abs(variation),
                    low: price - Math.abs(variation),
                    close: price,
                    volume,
                });
            }
            return candlesticks.reverse(); // Most recent first
        }
        catch (error) {
            console.error(`Failed to fetch candlestick data for ${symbol}:`, error);
            return [];
        }
    }
    async fetchPrice(symbol) {
        const coinId = this.symbolToId.get(symbol);
        if (!coinId) {
            throw new Error(`Unsupported trading pair: ${symbol}`);
        }
        try {
            // Добавляем задержку для избежания rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));
            const response = await fetch(`${this.API_BASE}/simple/price?ids=${coinId}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit exceeded, use fallback data
                    console.warn(`Rate limit exceeded for ${symbol}, using fallback data`);
                    return this.getFallbackPrice(symbol);
                }
                throw new Error(`CoinGecko API error: ${response.status}`);
            }
            const data = await response.json();
            const coinData = data[coinId];
            if (!coinData) {
                throw new Error(`No data found for ${symbol}`);
            }
            return {
                symbol,
                price: coinData.usd,
                volume24h: coinData.usd_24h_vol || 0,
                priceChange24h: coinData.usd_24h_change || 0,
                timestamp: Date.now(),
            };
        }
        catch (error) {
            console.error(`Failed to fetch price for ${symbol}:`, error);
            // Используем fallback данные при ошибке
            return this.getFallbackPrice(symbol);
        }
    }
    getFallbackPrice(symbol) {
        // Fallback цены для демонстрации
        const fallbackPrices = {
            'BTCUSDT': 112000 + Math.random() * 2000,
            'ETHUSDT': 3500 + Math.random() * 200,
            'ADAUSDT': 0.5 + Math.random() * 0.1,
            'DOTUSDT': 7 + Math.random() * 1,
            'LINKUSDT': 15 + Math.random() * 2,
            'LTCUSDT': 80 + Math.random() * 10,
            'BCHUSDT': 400 + Math.random() * 50,
            'XLMUSDT': 0.1 + Math.random() * 0.02,
            'EOSUSDT': 0.8 + Math.random() * 0.1,
            'TRXUSDT': 0.08 + Math.random() * 0.01,
        };
        const basePrice = fallbackPrices[symbol] || 100;
        const volatility = 0.02; // 2% волатильность
        const variation = basePrice * volatility * (Math.random() - 0.5);
        return {
            symbol,
            price: basePrice + variation,
            volume24h: basePrice * 1000000 * (0.5 + Math.random()),
            priceChange24h: (Math.random() - 0.5) * 10, // -5% to +5%
            timestamp: Date.now(),
        };
    }
    async updatePrices() {
        if (this.activePairs.size === 0) {
            return;
        }
        const symbols = Array.from(this.activePairs);
        try {
            // Добавляем задержку для избежания rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
            const coinIds = symbols
                .map(symbol => this.symbolToId.get(symbol))
                .filter(Boolean)
                .join(',');
            const response = await fetch(`${this.API_BASE}/simple/price?ids=${coinIds}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`);
            if (!response.ok) {
                if (response.status === 429) {
                    // Rate limit exceeded, use fallback data for all symbols
                    console.warn('Rate limit exceeded, using fallback data for all symbols');
                    for (const symbol of symbols) {
                        const priceData = this.getFallbackPrice(symbol);
                        this.priceCache.set(symbol, priceData);
                        this.emit('priceUpdate', priceData);
                    }
                    return;
                }
                console.error(`CoinGecko API error: ${response.status}`);
                return;
            }
            const data = await response.json();
            for (const symbol of symbols) {
                const coinId = this.symbolToId.get(symbol);
                if (!coinId || !data[coinId]) {
                    // Если нет данных для символа, используем fallback
                    const priceData = this.getFallbackPrice(symbol);
                    this.priceCache.set(symbol, priceData);
                    this.emit('priceUpdate', priceData);
                    continue;
                }
                const coinData = data[coinId];
                const priceData = {
                    symbol,
                    price: coinData.usd,
                    volume24h: coinData.usd_24h_vol || 0,
                    priceChange24h: coinData.usd_24h_change || 0,
                    timestamp: Date.now(),
                };
                // Add some realistic price volatility
                const volatility = 0.001; // 0.1% volatility
                const variation = priceData.price * volatility * (Math.random() - 0.5);
                priceData.price += variation;
                this.priceCache.set(symbol, priceData);
                this.emit('priceUpdate', priceData);
            }
        }
        catch (error) {
            console.error('Failed to update prices:', error);
            // При ошибке используем fallback данные
            for (const symbol of symbols) {
                const priceData = this.getFallbackPrice(symbol);
                this.priceCache.set(symbol, priceData);
                this.emit('priceUpdate', priceData);
            }
        }
    }
    startPriceUpdates() {
        // Update prices every 5 seconds
        this.priceInterval = setInterval(() => {
            this.updatePrices();
        }, 5000);
    }
    intervalToDays(interval) {
        switch (interval) {
            case '1m':
            case '5m':
            case '15m':
                return 1;
            case '1h':
                return 7;
            case '4h':
                return 30;
            case '1d':
                return 365;
            default:
                return 7;
        }
    }
    destroy() {
        if (this.priceInterval) {
            clearInterval(this.priceInterval);
            this.priceInterval = null;
        }
        this.activePairs.clear();
        this.priceCache.clear();
        this.removeAllListeners();
    }
}
exports.CryptoApiService = CryptoApiService;
exports.cryptoApi = new CryptoApiService();
