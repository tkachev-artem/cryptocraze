import { createClient, RedisClientType } from 'redis';
import { EventEmitter } from 'events';

export interface PriceData {
  symbol: string;
  price: number;
  volume24h: number;
  priceChange24h: number;
  timestamp: number;
}

export class RedisService extends EventEmitter {
  private client: RedisClientType;
  private subscriber: RedisClientType;
  private publisher: RedisClientType;
  
  private readonly PRICE_KEY_PREFIX = 'price:';
  private readonly PRICE_CHANNEL_PREFIX = 'price_update:';
  private readonly CANDLE_KEY_PREFIX = 'candles:'; // key: candles:SYMBOL:INTERVAL
  
  constructor() {
    super();
    
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    // Основной клиент для операций
    this.client = createClient({ url: redisUrl });
    
    // Отдельные клиенты для pub/sub (требование Redis)
    this.subscriber = createClient({ url: redisUrl });
    this.publisher = createClient({ url: redisUrl });
    
    this.setupConnections();
  }

  private async setupConnections(): Promise<void> {
    try {
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
        this.publisher.connect()
      ]);
      
      console.log('✅ Redis подключен успешно');
      
      // Подписываемся на все обновления цен
      await this.subscriber.pSubscribe(`${this.PRICE_CHANNEL_PREFIX}*`, (message, channel) => {
        try {
          const symbol = channel.replace(this.PRICE_CHANNEL_PREFIX, '');
          const priceData: PriceData = JSON.parse(message);
          this.emit('priceUpdate', priceData);
        } catch (error) {
          console.error('Ошибка обработки сообщения Redis:', error);
        }
      });
      
      console.log('📡 Подписка на Redis price updates активна');
      
    } catch (error) {
      console.error('❌ Ошибка подключения к Redis:', error);
      // Fallback без Redis
      setTimeout(() => this.setupConnections(), 5000);
    }
  }

  /**
   * Сохранить свечи в Redis с TTL (по умолчанию 60–120 сек, случайно)
   */
  async setCandles(symbol: string, interval: string, candles: any[], ttlSeconds?: number): Promise<void> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const key = `${this.CANDLE_KEY_PREFIX}${upperSymbol}:${interval}`;
      const ttl = typeof ttlSeconds === 'number' && ttlSeconds > 0
        ? Math.floor(ttlSeconds)
        : 60 + Math.floor(Math.random() * 61); // 60..120 сек
      await this.client.setEx(key, ttl, JSON.stringify(candles));
    } catch (error) {
      console.error(`Ошибка сохранения свечей ${symbol} ${interval} в Redis:`, error);
    }
  }

  /**
   * Получить свечи из Redis кэша
   */
  async getCandles(symbol: string, interval: string): Promise<any[] | null> {
    try {
      const upperSymbol = symbol.toUpperCase();
      const key = `${this.CANDLE_KEY_PREFIX}${upperSymbol}:${interval}`;
      const data = await this.client.get(key);
      return data && typeof data === 'string' ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Ошибка получения свечей ${symbol} ${interval} из Redis:`, error);
      return null;
    }
  }

  /**
   * Сохранить цену в Redis и отправить через Pub/Sub
   */
  async setPrice(symbol: string, priceData: PriceData): Promise<void> {
    try {
      const key = `${this.PRICE_KEY_PREFIX}${symbol}`;
      const channel = `${this.PRICE_CHANNEL_PREFIX}${symbol}`;
      
      // Сохраняем в кэш с TTL 1 час
      await this.client.setEx(key, 3600, JSON.stringify(priceData));
      
      // Публикуем обновление для всех процессов
      await this.publisher.publish(channel, JSON.stringify(priceData));
      
    } catch (error) {
      console.error(`Ошибка сохранения цены ${symbol} в Redis:`, error);
    }
  }

  /**
   * Получить цену из Redis кэша
   */
  async getPrice(symbol: string): Promise<PriceData | null> {
    try {
      const key = `${this.PRICE_KEY_PREFIX}${symbol}`;
      const data = await this.client.get(key);
      return data && typeof data === 'string' ? JSON.parse(data) : null;
    } catch (error) {
      console.error(`Ошибка получения цены ${symbol} из Redis:`, error);
      return null;
    }
  }

  /**
   * Получить все цены
   */
  async getAllPrices(): Promise<Record<string, PriceData>> {
    try {
      const keys = await this.client.keys(`${this.PRICE_KEY_PREFIX}*`);
      const prices: Record<string, PriceData> = {};
      
      for (const key of keys) {
        const symbol = key.replace(this.PRICE_KEY_PREFIX, '');
        const data = await this.client.get(key);
        if (data && typeof data === 'string') {
          prices[symbol] = JSON.parse(data);
        }
      }
      
      return prices;
    } catch (error) {
      console.error('Ошибка получения всех цен из Redis:', error);
      return {};
    }
  }

  /**
   * Получить статистику подключений
   */
  async getStats(): Promise<{ totalPrices: number; redisConnected: boolean }> {
    try {
      const keys = await this.client.keys(`${this.PRICE_KEY_PREFIX}*`);
      return {
        totalPrices: keys.length,
        redisConnected: this.client.isReady && this.subscriber.isReady && this.publisher.isReady
      };
    } catch {
      return { totalPrices: 0, redisConnected: false };
    }
  }

  /**
   * Батчевое обновление множества цен
   */
  async setBatchPrices(prices: Record<string, PriceData>): Promise<void> {
    try {
      const pipeline = this.client.multi();
      
      for (const [symbol, priceData] of Object.entries(prices)) {
        const key = `${this.PRICE_KEY_PREFIX}${symbol}`;
        pipeline.setEx(key, 3600, JSON.stringify(priceData));
      }
      
      await pipeline.exec();
      
      // Публикуем каждую цену отдельно (pub/sub не поддерживает batch)
      for (const [symbol, priceData] of Object.entries(prices)) {
        const channel = `${this.PRICE_CHANNEL_PREFIX}${symbol}`;
        await this.publisher.publish(channel, JSON.stringify(priceData));
      }
      
    } catch (error) {
      console.error('Ошибка батчевого обновления цен:', error);
    }
  }

  /**
   * Закрыть все соединения
   */
  async destroy(): Promise<void> {
    try {
      await Promise.all([
        this.client.quit(),
        this.subscriber.quit(),
        this.publisher.quit()
      ]);
      console.log('Redis соединения закрыты');
    } catch (error) {
      console.error('Ошибка закрытия Redis соединений:', error);
    }
  }
}

export const redisService = new RedisService();