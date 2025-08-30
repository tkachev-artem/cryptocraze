// Optimized API client with caching, retry logic, and performance monitoring

import { logger, performanceLogger } from './logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface RequestOptions extends Omit<RequestInit, 'cache'> {
  retry?: boolean;
  retryAttempts?: number;
  retryDelay?: number;
  cache?: boolean;
  cacheTTL?: number;
  timeout?: number;
}

class ApiClient {
  private baseURL: string;
  private cache = new Map<string, CacheEntry<unknown>>();
  private requestQueue = new Map<string, Promise<unknown>>();

  constructor(baseURL: string = '/api') {
    this.baseURL = baseURL;
    
    // Clean cache periodically
    setInterval(() => this.cleanExpiredCache(), 5 * 60 * 1000); // Every 5 minutes
  }

  private cleanExpiredCache(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
      }
    }
  }

  private getCacheKey(url: string, options?: RequestInit): string {
    const method = options?.method || 'GET';
    const body = options?.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  private getFromCache<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    logger.debug('Cache hit', { key }, 'ApiClient');
    return entry.data;
  }

  private setToCache<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
    logger.debug('Cache set', { key, ttl }, 'ApiClient');
  }

  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private async fetchWithTimeout(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<T> {
    const {
      retry = true,
      retryAttempts = 3,
      retryDelay = 1000,
      cache = false,
      cacheTTL = 5 * 60 * 1000, // 5 minutes default
      timeout = 10000, // 10 seconds default
      ...fetchOptions
    } = options;

    const url = `${this.baseURL}${endpoint}`;
    const cacheKey = this.getCacheKey(url, fetchOptions);

    // Check cache first
    if (cache && fetchOptions.method !== 'POST') {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) return cached;
    }

    // Prevent duplicate requests
    if (this.requestQueue.has(cacheKey)) {
      logger.debug('Request deduplication', { endpoint }, 'ApiClient');
      return this.requestQueue.get(cacheKey) as Promise<T>;
    }

    const requestPromise = this.performRequest<T>(
      url,
      fetchOptions,
      timeout,
      retry,
      retryAttempts,
      retryDelay
    );

    this.requestQueue.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;

      // Cache successful GET requests
      if (cache && fetchOptions.method !== 'POST') {
        this.setToCache(cacheKey, result, cacheTTL);
      }

      return result;
    } finally {
      this.requestQueue.delete(cacheKey);
    }
  }

  private async performRequest<T>(
    url: string,
    options: RequestInit,
    timeout: number,
    retry: boolean,
    retryAttempts: number,
    retryDelay: number
  ): Promise<T> {
    const endTiming = performanceLogger.startTiming(`API ${options.method || 'GET'} ${url}`);
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
      try {
        const response = await this.fetchWithTimeout(url, options, timeout);

        endTiming();
        performanceLogger.markApiCall(
          url,
          options.method || 'GET',
          performance.now(),
          response.ok
        );

        if (!response.ok) {
          const errorText = await response.text().catch(() => 'Unknown error');
          throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType?.includes('application/json')) {
          return await response.json();
        } else {
          return await response.text() as T;
        }
      } catch (error) {
        lastError = error as Error;
        logger.warn(`API request failed (attempt ${attempt}/${retryAttempts})`, {
          url,
          method: options.method || 'GET',
          error: lastError.message,
          attempt,
        }, 'ApiClient');

        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.name === 'AbortError' || error.message.includes('401') || error.message.includes('403')) {
            break;
          }
        }

        // Don't retry on last attempt
        if (!retry || attempt === retryAttempts) {
          break;
        }

        // Exponential backoff
        const delay = retryDelay * Math.pow(2, attempt - 1);
        await this.sleep(delay);
      }
    }

    endTiming();
    performanceLogger.markApiCall(
      url,
      options.method || 'GET',
      performance.now(),
      false
    );

    logger.error('API request failed after all retries', {
      url,
      method: options.method || 'GET',
      error: lastError?.message,
    }, 'ApiClient');

    throw lastError || new Error('Request failed');
  }

  // HTTP Methods
  async get<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: unknown, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, {
      ...options,
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string, options: Omit<RequestOptions, 'method'> = {}): Promise<T> {
    return this.makeRequest<T>(endpoint, { ...options, method: 'DELETE' });
  }

  // Cache management
  clearCache(): void {
    this.cache.clear();
    logger.info('API cache cleared', {}, 'ApiClient');
  }

  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Helper functions for common operations
export const api = {
  get: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiClient.get<T>(endpoint, options),
  
  post: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiClient.post<T>(endpoint, data, options),
  
  put: <T>(endpoint: string, data?: unknown, options?: Omit<RequestOptions, 'method'>) =>
    apiClient.put<T>(endpoint, data, options),
  
  delete: <T>(endpoint: string, options?: Omit<RequestOptions, 'method'>) =>
    apiClient.delete<T>(endpoint, options),
  
  clearCache: () => apiClient.clearCache(),
  
  getCacheStats: () => apiClient.getCacheStats(),
};