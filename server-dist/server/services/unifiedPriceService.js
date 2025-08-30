"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.unifiedPriceService = exports.UnifiedPriceService = void 0;
const events_1 = require("events");
const binanceApi_1 = require("./binanceApi");
const binanceWs_1 = require("./binanceWs");
const redisService_1 = require("./redisService");
class UnifiedPriceService extends events_1.EventEmitter {
    priceCache = new Map();
    activePairs = new Set();
    priceInterval = null;
    statsInterval = null;
    binanceApi;
    // Поддерживаемые торговые пары
    supportedSymbols = new Set([
        'BTCUSDT', 'ETHUSDT', 'ADAUSDT', 'DOTUSDT', 'LINKUSDT',
        'LTCUSDT', 'BCHUSDT', 'XLMUSDT', 'EOSUSDT', 'TRXUSDT',
        'BNBUSDT', 'XRPUSDT', 'SOLUSDT', 'MATICUSDT', 'AVAXUSDT'
    ]);
    constructor() {
        super();
        this.binanceApi = new binanceApi_1.BinanceApiService();
        this.startPriceUpdates();
        this.setupWsListener();
        this.setupRedisListener();
    }
    /**
     * Добавить торговую пару для отслеживания
     */
    async addPair(symbol) {
        const upperSymbol = symbol.toUpperCase();
        if (!this.supportedSymbols.has(upperSymbol)) {
            throw new Error(`Неподдерживаемая торговая пара: ${symbol}`);
        }
        this.activePairs.add(upperSymbol);
        // Подписываемся на поток Binance WS
        await binanceWs_1.binanceWs.subscribe(upperSymbol);
        // Получаем начальную цену
        try {
            const priceData = await this.fetchPrice(upperSymbol);
            this.priceCache.set(upperSymbol, priceData);
            this.emit('priceUpdate', priceData);
            // info: pair added
        }
        catch (error) {
            console.error(`❌ Ошибка получения начальной цены для ${upperSymbol}:`, error);
            throw error;
        }
    }
    /**
     * Удалить торговую пару из отслеживания
     */
    removePair(symbol) {
        const upperSymbol = symbol.toUpperCase();
        this.activePairs.delete(upperSymbol);
        this.priceCache.delete(upperSymbol);
        binanceWs_1.binanceWs.unsubscribe(upperSymbol).catch(() => { });
        // info: pair removed
    }
    /**
     * Получить текущую цену
     */
    getPrice(symbol) {
        const upperSymbol = symbol.toUpperCase();
        return this.priceCache.get(upperSymbol);
    }
    /**
     * Получить цену из Redis (асинхронно)
     */
    async getPriceFromRedis(symbol) {
        return await redisService_1.redisService.getPrice(symbol.toUpperCase());
    }
    /**
     * Получить свечные данные
     */
    async getCandlestickData(symbol, interval, limit = 100) {
        const upperSymbol = symbol.toUpperCase();
        if (!this.supportedSymbols.has(upperSymbol)) {
            throw new Error(`Неподдерживаемая торговая пара: ${symbol}`);
        }
        try {
            const candlesticks = await this.binanceApi.getCandlestickData(upperSymbol, interval, limit);
            // Преобразуем в наш формат
            return candlesticks.map(candle => ({
                timestamp: candle.openTime,
                open: candle.open,
                high: candle.high,
                low: candle.low,
                close: candle.close,
                volume: candle.volume
            }));
        }
        catch (error) {
            console.error(`❌ Ошибка получения свечных данных для ${upperSymbol}:`, error);
            throw error;
        }
    }
    /**
     * Получить цену с Binance API
     */
    async fetchPrice(symbol) {
        const upperSymbol = symbol.toUpperCase();
        try {
            // Получаем текущую цену
            const currentPrice = await this.binanceApi.getCurrentPrice(upperSymbol);
            // Получаем 24-часовую статистику
            const stats24h = await this.binanceApi.get24hrStats(upperSymbol);
            return {
                symbol: upperSymbol,
                price: currentPrice,
                volume24h: stats24h.quoteVolume || 0,
                priceChange24h: stats24h.priceChangePercent || 0,
                timestamp: Date.now(),
            };
        }
        catch (error) {
            console.error(`❌ Ошибка получения цены для ${upperSymbol}:`, error);
            // Fallback данные при ошибке
            return this.getFallbackPrice(upperSymbol);
        }
    }
    /**
     * Fallback данные при ошибках API
     */
    getFallbackPrice(symbol) {
        const fallbackPrices = {
            'BTCUSDT': 116000 + Math.random() * 2000,
            'ETHUSDT': 3500 + Math.random() * 200,
            'ADAUSDT': 0.5 + Math.random() * 0.1,
            'DOTUSDT': 7 + Math.random() * 1,
            'LINKUSDT': 15 + Math.random() * 2,
            'LTCUSDT': 80 + Math.random() * 10,
            'BCHUSDT': 400 + Math.random() * 50,
            'XLMUSDT': 0.1 + Math.random() * 0.02,
            'EOSUSDT': 0.8 + Math.random() * 0.1,
            'TRXUSDT': 0.08 + Math.random() * 0.01,
            'BNBUSDT': 300 + Math.random() * 20,
            'XRPUSDT': 0.6 + Math.random() * 0.1,
            'SOLUSDT': 100 + Math.random() * 10,
            'MATICUSDT': 0.8 + Math.random() * 0.1,
            'AVAXUSDT': 30 + Math.random() * 3,
        };
        const basePrice = fallbackPrices[symbol] || 100;
        const volatility = 0.02; // 2% волатильность
        const variation = basePrice * volatility * (Math.random() - 0.5);
        console.warn(`⚠️ Используются fallback данные для ${symbol}`);
        return {
            symbol,
            price: basePrice + variation,
            volume24h: basePrice * 1000000 * (0.5 + Math.random()),
            priceChange24h: (Math.random() - 0.5) * 10, // -5% to +5%
            timestamp: Date.now(),
        };
    }
    /**
     * Обновление цен для всех активных пар
     */
    async updatePrices() {
        if (this.activePairs.size === 0) {
            return;
        }
        const symbols = Array.from(this.activePairs);
        for (const symbol of symbols) {
            try {
                const priceData = await this.fetchPrice(symbol);
                this.priceCache.set(symbol, priceData);
                this.emit('priceUpdate', priceData);
            }
            catch (error) {
                console.error(`❌ Ошибка обновления цены для ${symbol}:`, error);
            }
        }
    }
    /**
     * Запуск периодического обновления цен
     */
    startPriceUpdates() {
        // REST фолбэк только при проблемах с WS (редко)
        this.priceInterval = setInterval(() => {
            // Проверяем, есть ли активность от WS за последние 2 минуты
            const hasRecentWsData = Array.from(this.activePairs).some(symbol => {
                const data = this.priceCache.get(symbol);
                return data && (Date.now() - data.timestamp) < 120_000;
            });
            if (!hasRecentWsData) {
                console.log('⚠️ WS неактивен, используем REST фолбэк');
                this.updatePrices();
            }
        }, 180_000); // проверяем каждые 3 минуты
        // 24h статистика реже и с батчингом
        this.statsInterval = setInterval(async () => {
            const symbols = Array.from(this.activePairs);
            if (symbols.length === 0)
                return;
            // Батчим по 5 символов с задержкой для соблюдения weight limits
            for (let i = 0; i < symbols.length; i += 5) {
                const batch = symbols.slice(i, i + 5);
                for (const symbol of batch) {
                    try {
                        const stats24h = await this.binanceApi.get24hrStats(symbol);
                        const current = this.priceCache.get(symbol);
                        if (current) {
                            const updated = {
                                ...current,
                                volume24h: stats24h.quoteVolume || current.volume24h,
                                priceChange24h: stats24h.priceChangePercent || current.priceChange24h,
                            };
                            this.priceCache.set(symbol, updated);
                            // НЕ эмитим priceUpdate для статистики, только для цен
                        }
                    }
                    catch (error) {
                        console.warn(`Не удалось обновить статистику для ${symbol}`);
                    }
                }
                // Пауза между батчами
                if (i + 5 < symbols.length) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }
        }, 300_000); // каждые 5 минут
        console.log('📊 Запущены таймеры: REST фолбэк (3 мин), статистика (5 мин)');
    }
    /**
     * Остановка сервиса
     */
    destroy() {
        if (this.priceInterval) {
            clearInterval(this.priceInterval);
            this.priceInterval = null;
        }
        if (this.statsInterval) {
            clearInterval(this.statsInterval);
            this.statsInterval = null;
        }
        this.priceCache.clear();
        this.activePairs.clear();
        // info: price service stopped
    }
    setupWsListener() {
        // Получаем тики из Binance WS и отправляем в Redis
        binanceWs_1.binanceWs.on('price', async ({ symbol, price, exchangeTimestamp }) => {
            if (!this.activePairs.has(symbol))
                return;
            const prev = this.priceCache.get(symbol);
            const updated = {
                symbol,
                price,
                volume24h: prev?.volume24h ?? 0,
                priceChange24h: prev?.priceChange24h ?? 0,
                timestamp: exchangeTimestamp || Date.now(),
            };
            // Обновляем локальный кэш
            this.priceCache.set(symbol, updated);
            // Отправляем в Redis для дистрибуции между процессами
            await redisService_1.redisService.setPrice(symbol, updated);
            // Локальное событие (для backwards compatibility)
            this.emit('priceUpdate', updated);
        });
    }
    setupRedisListener() {
        // Получаем обновления из Redis от других процессов
        redisService_1.redisService.on('priceUpdate', (priceData) => {
            // Обновляем локальный кэш
            this.priceCache.set(priceData.symbol, priceData);
            // Эмитим событие для Socket.io
            this.emit('priceUpdate', priceData);
        });
    }
}
exports.UnifiedPriceService = UnifiedPriceService;
// Экспортируем единственный экземпляр
exports.unifiedPriceService = new UnifiedPriceService();
