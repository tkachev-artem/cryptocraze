"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.binanceApi = exports.BinanceApiService = void 0;
const redisService_js_1 = require("./redisService.js");
class BinanceApiService {
    basePath = '/api/v3';
    baseDomains = [
        'https://api.binance.com',
        'https://api1.binance.com',
        'https://api2.binance.com',
        'https://api3.binance.com',
    ];
    domainIndex = 0;
    get currentBaseUrl() {
        return `${this.baseDomains[this.domainIndex % this.baseDomains.length]}${this.basePath}`;
    }
    rotateDomain() {
        this.domainIndex = (this.domainIndex + 1) % this.baseDomains.length;
    }
    /**
     * Получение свечного графика (Kline/Candlestick)
     * @param symbol - Торговая пара (например: BTCUSDT)
     * @param interval - Интервал (1m, 3m, 5m, 15m, 30m, 1h, 2h, 4h, 6h, 8h, 12h, 1d, 3d, 1w, 1M)
     * @param limit - Количество свечей (максимум 1000)
     */
    async getCandlestickData(symbol, interval = '1h', limit = 100) {
        const upperSymbol = symbol.toUpperCase();
        const cacheKeyInfo = { symbol: upperSymbol, interval, limit };
        // 1) Попробуем достать из кэша сначала (лучше отдавать быстро при нагрузке)
        try {
            const cached = await redisService_js_1.redisService.getCandles(upperSymbol, interval);
            if (cached && Array.isArray(cached) && cached.length > 0) {
                return cached.slice(0, limit);
            }
        }
        catch {
            // игнорируем ошибки кэша
        }
        // 2) Делаем до 1 полного круга по доменам
        let lastError = null;
        for (let i = 0; i < this.baseDomains.length; i++) {
            const url = `${this.currentBaseUrl}/klines?symbol=${upperSymbol}&interval=${interval}&limit=${limit}`;
            try {
                const response = await fetch(url, {
                    signal: AbortSignal.timeout(15000),
                    headers: { 'User-Agent': 'CryptoAnalyzer/1.0' },
                });
                if (!response.ok) {
                    // Если 4xx/418 — пробуем отдать из кэша
                    if (response.status >= 400 && response.status < 500) {
                        const cached = await redisService_js_1.redisService.getCandles(upperSymbol, interval);
                        if (cached && Array.isArray(cached) && cached.length > 0) {
                            return cached.slice(0, limit);
                        }
                    }
                    // Иначе пробуем следующий домен
                    this.rotateDomain();
                    lastError = new Error(`Binance API error: ${response.status} ${response.statusText}`);
                    continue;
                }
                const data = await response.json();
                const candlesticks = data.map((candle) => ({
                    openTime: candle[0],
                    open: parseFloat(candle[1]),
                    high: parseFloat(candle[2]),
                    low: parseFloat(candle[3]),
                    close: parseFloat(candle[4]),
                    volume: parseFloat(candle[5]),
                    closeTime: candle[6],
                    quoteAssetVolume: parseFloat(candle[7]),
                    numberOfTrades: parseInt(candle[8]),
                    takerBuyBaseAssetVolume: parseFloat(candle[9]),
                    takerBuyQuoteAssetVolume: parseFloat(candle[10])
                }));
                // Сохраняем в кэш 60–120 сек
                await redisService_js_1.redisService.setCandles(upperSymbol, interval, candlesticks);
                return candlesticks;
            }
            catch (error) {
                // Ошибка сети/таймаут — пробуем следующий домен
                this.rotateDomain();
                lastError = error;
                continue;
            }
        }
        // 3) Последняя попытка — только кэш, иначе ошибка
        try {
            const cached = await redisService_js_1.redisService.getCandles(upperSymbol, interval);
            if (cached && Array.isArray(cached) && cached.length > 0) {
                return cached.slice(0, limit);
            }
        }
        catch { }
        console.error(`❌ Ошибка получения данных свечей для ${upperSymbol}:`, lastError);
        throw lastError instanceof Error ? lastError : new Error('Binance klines failed');
    }
    /**
     * Получение текущей цены
     * @param symbol - Торговая пара
     */
    async getCurrentPrice(symbol) {
        try {
            const url = `${this.currentBaseUrl}/ticker/price?symbol=${symbol.toUpperCase()}`;
            const response = await fetch(url, {
                signal: AbortSignal.timeout(15000), // 15 сек таймаут
                headers: { 'User-Agent': 'CryptoAnalyzer/1.0' },
            });
            // Проверяем weight limits
            const usedWeight = response.headers.get('x-mbx-used-weight');
            const usedWeight1m = response.headers.get('x-mbx-used-weight-1m');
            if (usedWeight1m && parseInt(usedWeight1m) > 1000) {
                console.warn(`⚠️ Высокое потребление weight: ${usedWeight1m}/1200`);
            }
            if (!response.ok) {
                if (response.status === 429) {
                    console.error('🚫 Binance rate limit exceeded! Ждем 60 секунд...');
                    throw new Error('Rate limit exceeded');
                }
                // попробуем другой домен
                this.rotateDomain();
                throw new Error(`Binance API error: ${response.status}`);
            }
            const data = await response.json();
            return parseFloat(data.price);
        }
        catch (error) {
            console.error(`❌ Ошибка получения цены для ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Получение информации о торговой паре
     * @param symbol - Торговая пара
     */
    async getSymbolInfo(symbol) {
        try {
            const url = `${this.currentBaseUrl}/exchangeInfo`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }
            const data = await response.json();
            const symbolInfo = data.symbols.find((s) => s.symbol === symbol.toUpperCase());
            if (!symbolInfo) {
                throw new Error(`Symbol ${symbol} not found`);
            }
            return symbolInfo;
        }
        catch (error) {
            console.error(`❌ Ошибка получения информации о символе ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Получение 24-часовой статистики
     * @param symbol - Торговая пара
     */
    async get24hrStats(symbol) {
        try {
            const url = `${this.currentBaseUrl}/ticker/24hr?symbol=${symbol.toUpperCase()}`;
            const response = await fetch(url, {
                signal: AbortSignal.timeout(15000), // 15 сек таймаут
                headers: { 'User-Agent': 'CryptoAnalyzer/1.0' },
            });
            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }
            const data = await response.json();
            return {
                symbol: data.symbol,
                priceChange: parseFloat(data.priceChange),
                priceChangePercent: parseFloat(data.priceChangePercent),
                weightedAvgPrice: parseFloat(data.weightedAvgPrice),
                prevClosePrice: parseFloat(data.prevClosePrice),
                lastPrice: parseFloat(data.lastPrice),
                lastQty: parseFloat(data.lastQty),
                bidPrice: parseFloat(data.bidPrice),
                askPrice: parseFloat(data.askPrice),
                openPrice: parseFloat(data.openPrice),
                highPrice: parseFloat(data.highPrice),
                lowPrice: parseFloat(data.lowPrice),
                volume: parseFloat(data.volume),
                quoteVolume: parseFloat(data.quoteVolume),
                openTime: data.openTime,
                closeTime: data.closeTime,
                count: data.count
            };
        }
        catch (error) {
            console.error(`❌ Ошибка получения 24ч статистики для ${symbol}:`, error);
            throw error;
        }
    }
    /**
     * Получение списка всех торговых пар
     */
    async getAllSymbols() {
        try {
            const url = `${this.currentBaseUrl}/exchangeInfo`;
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`Binance API error: ${response.status}`);
            }
            const data = await response.json();
            // Возвращаем только активные спотовые пары
            return data.symbols
                .filter((symbol) => symbol.status === 'TRADING' && symbol.quoteAsset === 'USDT')
                .map((symbol) => symbol.symbol);
        }
        catch (error) {
            console.error('❌ Ошибка получения списка символов:', error);
            throw error;
        }
    }
}
exports.BinanceApiService = BinanceApiService;
exports.binanceApi = new BinanceApiService();
