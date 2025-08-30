import { API_BASE_URL } from './api';

// Типы для API ответов
export type CandlestickData = {
  openTime: number;
  open: string;
  high: string;
  low: string;
  close: string;
  volume: string;
}

export type BinanceStats = {
  symbol: string;
  priceChange: string;
  priceChangePercent: string;
  lastPrice: string;
  volume: string;
  highPrice: string;
  lowPrice: string;
  openPrice: string;
}

// Конфигурация retry
type RetryConfig = {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
};

// Mock данные для разработки
const mockCandlestickData: CandlestickData[] = Array.from({ length: 100 }, (_, i) => {
  const basePrice = 50000;
  const time = Date.now() - (100 - i) * 60000; // Каждую минуту
  const volatility = 0.02;
  const change = (Math.random() - 0.5) * volatility;
  const price = basePrice * (1 + change);
  
  return {
    openTime: time,
    open: price.toFixed(2),
    high: (price * 1.01).toFixed(2),
    low: (price * 0.99).toFixed(2),
    close: (price * (1 + (Math.random() - 0.5) * 0.01)).toFixed(2),
    volume: (Math.random() * 1000).toFixed(2),
  };
});

const mockStats: BinanceStats = {
  symbol: 'BTCUSDT',
  priceChange: '1234.56',
  priceChangePercent: '2.47',
  lastPrice: '51234.56',
  volume: '123456.78',
  highPrice: '52000.00',
  lowPrice: '49500.00',
  openPrice: '50000.00',
};

// Утилита для exponential backoff
const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

const calculateDelay = (attempt: number, config: RetryConfig): number => {
  const delay = config.baseDelay * Math.pow(2, attempt);
  return Math.min(delay, config.maxDelay);
};

// Улучшенная функция fetch с retry логикой
async function resilientFetch<T>(
  url: string, 
  options: RequestInit = {},
  config: RetryConfig = DEFAULT_RETRY_CONFIG
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: Object.assign(
          {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
          options.headers ?? {}
        ),
      });

      if (response.ok) {
        return await response.json() as T;
      }

      // Специальная обработка Binance ошибок
      if (response.status === 418) {
        const errorText = await response.text();
        console.warn(`Binance rate limit (418) на попытке ${(attempt + 1).toString()}:`, errorText);
        
        // При 418 ошибке увеличиваем задержку
        if (attempt < config.maxRetries) {
          const delay = calculateDelay(attempt + 2, config); // Больше задержка для rate limit
          console.log(`Ожидание ${delay.toString()}ms перед повторной попыткой...`);
          await sleep(delay);
          continue;
        }
      }

      // Для других HTTP ошибок
      const errorText = await response.text();
      lastError = new Error(`HTTP ${response.status.toString()}: ${errorText}`);
      
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        console.log(`Ошибка на попытке ${(attempt + 1).toString()}, повтор через ${delay.toString()}ms:`, lastError.message);
        await sleep(delay);
        continue;
      }

    } catch (error) {
      lastError = error as Error;
      console.error(`Ошибка сети на попытке ${(attempt + 1).toString()}:`, error);
      
      if (attempt < config.maxRetries) {
        const delay = calculateDelay(attempt, config);
        await sleep(delay);
        continue;
      }
    }
  }

  throw lastError ?? new Error('Неизвестная ошибка');
}

// Проверка доступности API
export async function checkApiHealth(): Promise<boolean> {
  try {
    const env = (import.meta as { env: Record<string, string | undefined> }).env
    const healthPath: string | undefined = env.VITE_HEALTHCHECK_PATH

    // Если путь не задан — не делаем сетевой запрос, считаем неизвестным/офлайн
    if (!healthPath) {
      return false
    }

    const url = `${API_BASE_URL}${healthPath.startsWith('/') ? '' : '/'}${healthPath}`
    const controller = new AbortController()
    const id = setTimeout(() => { controller.abort(); }, 5000)

    const response = await fetch(url, {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller.signal,
    })
    clearTimeout(id)
    return response.ok
  } catch {
    return false
  }
}

// API функции с fallback на mock данные
export async function fetchCandlestickData(
  symbol: string,
  interval = '1m',
  limit = 100
): Promise<CandlestickData[]> {
  const url = `${API_BASE_URL}/binance/candlestick/${symbol}?interval=${interval}&limit=${limit.toString()}`;
  
  try {
    console.log(`Запрос свечей: ${url}`);
    return await resilientFetch<CandlestickData[]>(url);
  } catch (error) {
    console.warn('Fallback на mock данные для свечей:', error);
    
    // Используем mock данные при ошибке
    return mockCandlestickData.slice(-limit);
  }
}

export async function fetchBinanceStats(symbol: string): Promise<BinanceStats> {
  const url = `${API_BASE_URL}/binance/stats/${symbol}`;
  
  try {
    console.log(`Запрос статистики: ${url}`);
    return await resilientFetch<BinanceStats>(url);
  } catch (error) {
    console.warn('Fallback на mock данные для статистики:', error);
    
    // Используем mock данные при ошибке
    return { ...mockStats, symbol };
  }
}

// Кеширование для уменьшения нагрузки на API
class SimpleCache<T> {
  private cache = new Map<string, { data: T; timestamp: number; ttl: number }>();

  set(key: string, data: T, ttlMs = 30000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl: ttlMs,
    });
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new SimpleCache();

// Кешированные версии API функций
export async function getCachedCandlestickData(
  symbol: string,
  interval = '1m',
  limit = 100
): Promise<CandlestickData[]> {
  const cacheKey = `candlestick:${symbol}:${interval}:${limit.toString()}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached) {
    console.log('Используем кешированные данные свечей');
    return cached as CandlestickData[];
  }

  const data = await fetchCandlestickData(symbol, interval, limit);
  apiCache.set(cacheKey, data, 15000); // Кеш на 15 секунд
  return data;
}

export async function getCachedBinanceStats(symbol: string): Promise<BinanceStats> {
  const cacheKey = `stats:${symbol}`;
  const cached = apiCache.get(cacheKey);
  
  if (cached) {
    console.log('Используем кешированную статистику');
    return cached as BinanceStats;
  }

  const data = await fetchBinanceStats(symbol);
  apiCache.set(cacheKey, data, 10000); // Кеш на 10 секунд
  return data;
}