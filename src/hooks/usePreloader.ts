import { useEffect, useRef, useState, useCallback } from 'react';

interface PreloadConfig {
  /** Priority of the preload operation (higher numbers load first) */
  priority: number;
  /** Delay before starting preload (in milliseconds) */
  delay?: number;
  /** Whether to preload immediately or wait for trigger */
  immediate?: boolean;
  /** Cache key for the data */
  cacheKey?: string;
  /** TTL for cached data in milliseconds */
  cacheTTL?: number;
}

interface PreloadResult<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  isStale: boolean;
}

interface PreloadTask<T> {
  id: string;
  loader: () => Promise<T>;
  config: PreloadConfig;
  result: PreloadResult<T>;
  timestamp: number;
}

// Global preload cache and queue management
class PreloadManager {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private queue: PreloadTask<any>[] = [];
  private activeLoads = new Set<string>();
  private maxConcurrentLoads = 3;

  // Cache management
  setCache<T>(key: string, data: T, ttl: number = 5 * 60 * 1000): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  getCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    const isExpired = Date.now() - cached.timestamp > cached.ttl;
    if (isExpired) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  isCacheStale(key: string, maxAge: number = 2 * 60 * 1000): boolean {
    const cached = this.cache.get(key);
    if (!cached) return true;
    return Date.now() - cached.timestamp > maxAge;
  }

  // Queue management
  addToQueue<T>(task: PreloadTask<T>): void {
    // Remove existing task with same ID
    this.queue = this.queue.filter(t => t.id !== task.id);
    
    // Add new task
    this.queue.push(task);
    
    // Sort by priority (higher priority first)
    this.queue.sort((a, b) => b.config.priority - a.config.priority);
    
    // Process queue
    this.processQueue();
  }

  private async processQueue(): Promise<void> {
    if (this.activeLoads.size >= this.maxConcurrentLoads) {
      return;
    }

    const task = this.queue.find(t => !this.activeLoads.has(t.id));
    if (!task) return;

    // Remove from queue and mark as active
    this.queue = this.queue.filter(t => t.id !== task.id);
    this.activeLoads.add(task.id);

    try {
      // Check cache first
      if (task.config.cacheKey) {
        const cached = this.getCache(task.config.cacheKey);
        if (cached) {
          task.result.data = cached;
          task.result.isLoading = false;
          task.result.isStale = this.isCacheStale(task.config.cacheKey);
          this.activeLoads.delete(task.id);
          this.processQueue(); // Continue processing
          return;
        }
      }

      // Apply delay if specified
      if (task.config.delay && task.config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, task.config.delay));
      }

      // Load data
      task.result.isLoading = true;
      const data = await task.loader();
      
      // Update result
      task.result.data = data;
      task.result.isLoading = false;
      task.result.error = null;
      task.result.isStale = false;

      // Cache if specified
      if (task.config.cacheKey) {
        this.setCache(task.config.cacheKey, data, task.config.cacheTTL);
      }

    } catch (error) {
      task.result.error = error as Error;
      task.result.isLoading = false;
    } finally {
      this.activeLoads.delete(task.id);
      // Continue processing queue
      this.processQueue();
    }
  }

  clearCache(): void {
    this.cache.clear();
  }

  // Preload specific data immediately
  async preload<T>(key: string, loader: () => Promise<T>, config: PreloadConfig): Promise<T | null> {
    try {
      // Check cache first
      if (config.cacheKey) {
        const cached = this.getCache<T>(config.cacheKey);
        if (cached && !this.isCacheStale(config.cacheKey)) {
          return cached;
        }
      }

      const data = await loader();
      
      // Cache the result
      if (config.cacheKey) {
        this.setCache(config.cacheKey, data, config.cacheTTL);
      }

      return data;
    } catch (error) {
      console.error(`Preload failed for ${key}:`, error);
      return null;
    }
  }
}

// Global instance
const preloadManager = new PreloadManager();

/**
 * Hook for smart data preloading with priority queue and caching
 * Optimized for perceived performance and efficient resource usage
 */
export function usePreloader<T>(
  key: string,
  loader: () => Promise<T>,
  config: PreloadConfig
): PreloadResult<T> & {
  trigger: () => void;
  refetch: () => void;
  clearCache: () => void;
} {
  const [result, setResult] = useState<PreloadResult<T>>({
    data: null,
    isLoading: false,
    error: null,
    isStale: false,
  });

  const taskRef = useRef<PreloadTask<T> | null>(null);
  const mountedRef = useRef(true);

  // Create task
  useEffect(() => {
    const task: PreloadTask<T> = {
      id: key,
      loader,
      config,
      result: { ...result },
      timestamp: Date.now(),
    };

    taskRef.current = task;

    // Check cache immediately for instant loading
    if (config.cacheKey) {
      const cached = preloadManager.getCache<T>(config.cacheKey);
      if (cached) {
        const newResult = {
          data: cached,
          isLoading: false,
          error: null,
          isStale: preloadManager.isCacheStale(config.cacheKey),
        };
        setResult(newResult);
        task.result = newResult;
      }
    }

    return () => {
      mountedRef.current = false;
    };
  }, [key]);

  // Monitor task result changes
  useEffect(() => {
    if (!taskRef.current) return;

    const task = taskRef.current;
    const checkResult = () => {
      if (!mountedRef.current) return;
      
      const currentResult = task.result;
      setResult(prev => {
        if (
          prev.data !== currentResult.data ||
          prev.isLoading !== currentResult.isLoading ||
          prev.error !== currentResult.error ||
          prev.isStale !== currentResult.isStale
        ) {
          return { ...currentResult };
        }
        return prev;
      });
    };

    // Check periodically
    const interval = setInterval(checkResult, 100);
    
    return () => clearInterval(interval);
  }, []);

  // Trigger loading
  const trigger = useCallback(() => {
    if (taskRef.current) {
      preloadManager.addToQueue(taskRef.current);
    }
  }, []);

  // Force refetch (ignore cache)
  const refetch = useCallback(async () => {
    if (!taskRef.current) return;

    const task = taskRef.current;
    
    try {
      task.result.isLoading = true;
      task.result.error = null;
      setResult({ ...task.result });

      const data = await loader();
      
      if (mountedRef.current) {
        task.result.data = data;
        task.result.isLoading = false;
        task.result.isStale = false;
        setResult({ ...task.result });

        // Update cache
        if (config.cacheKey) {
          preloadManager.setCache(config.cacheKey, data, config.cacheTTL);
        }
      }
    } catch (error) {
      if (mountedRef.current) {
        task.result.error = error as Error;
        task.result.isLoading = false;
        setResult({ ...task.result });
      }
    }
  }, [loader, config.cacheKey, config.cacheTTL]);

  // Clear specific cache
  const clearCache = useCallback(() => {
    if (config.cacheKey) {
      // Remove from global cache - we'll implement this in the manager
      preloadManager['cache'].delete(config.cacheKey);
    }
  }, [config.cacheKey]);

  // Auto-trigger if immediate
  useEffect(() => {
    if (config.immediate) {
      trigger();
    }
  }, [config.immediate, trigger]);

  return {
    ...result,
    trigger,
    refetch,
    clearCache,
  };
}

/**
 * Hook for preloading multiple resources with coordinated loading
 */
export function useMultiPreloader<T extends Record<string, any>>(
  loaders: Record<keyof T, {
    loader: () => Promise<T[keyof T]>;
    config: PreloadConfig;
  }>
): Record<keyof T, PreloadResult<T[keyof T]>> & {
  triggerAll: () => void;
  refetchAll: () => void;
  isAnyLoading: boolean;
  hasAnyError: boolean;
} {
  const preloaders = Object.entries(loaders).reduce((acc, [key, { loader, config }]) => {
    acc[key] = usePreloader(key, loader, config);
    return acc;
  }, {} as Record<keyof T, ReturnType<typeof usePreloader>>);

  const triggerAll = useCallback(() => {
    Object.values(preloaders).forEach(p => p.trigger());
  }, [preloaders]);

  const refetchAll = useCallback(() => {
    Object.values(preloaders).forEach(p => p.refetch());
  }, [preloaders]);

  const isAnyLoading = Object.values(preloaders).some(p => p.isLoading);
  const hasAnyError = Object.values(preloaders).some(p => p.error !== null);

  const results = Object.entries(preloaders).reduce((acc, [key, preloader]) => {
    acc[key] = {
      data: preloader.data,
      isLoading: preloader.isLoading,
      error: preloader.error,
      isStale: preloader.isStale,
    };
    return acc;
  }, {} as Record<keyof T, PreloadResult<T[keyof T]>>);

  return {
    ...results,
    triggerAll,
    refetchAll,
    isAnyLoading,
    hasAnyError,
  };
}

// Export manager for advanced usage
export { preloadManager };