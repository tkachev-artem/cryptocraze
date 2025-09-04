import { useEffect, useCallback, useRef, useState } from 'react';

interface PerformanceMetrics {
  loadTime: number;
  renderTime: number;
  interactionTime: number;
  cacheHitRate: number;
  errorRate: number;
}

interface PerformanceOptions {
  enableProfiling?: boolean;
  logMetrics?: boolean;
  trackInteractions?: boolean;
}

/**
 * Hook for tracking and optimizing profile page performance
 * Provides metrics and optimizations for better user experience
 */
export function useProfilePerformance(
  componentName: string = 'ProfileComponent',
  options: PerformanceOptions = {}
) {
  const {
    enableProfiling = process.env.NODE_ENV === 'development',
    logMetrics = false,
    trackInteractions = true,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    loadTime: 0,
    renderTime: 0,
    interactionTime: 0,
    cacheHitRate: 0,
    errorRate: 0,
  });

  const startTimeRef = useRef<number>(performance.now());
  const renderStartRef = useRef<number>(0);
  const interactionCountRef = useRef<number>(0);
  const cacheHitsRef = useRef<number>(0);
  const cacheAttemptsRef = useRef<number>(0);
  const errorCountRef = useRef<number>(0);
  const totalOperationsRef = useRef<number>(0);

  // Mark component mount
  useEffect(() => {
    if (!enableProfiling) return;
    
    startTimeRef.current = performance.now();
    
    // Mark render start
    renderStartRef.current = performance.now();
    
    return () => {
      // Calculate load time on unmount
      const loadTime = performance.now() - startTimeRef.current;
      setMetrics(prev => ({ ...prev, loadTime }));
      
      if (logMetrics) {
        console.log(`[ProfilePerformance] ${componentName}:`, {
          loadTime: `${loadTime.toFixed(2)}ms`,
          interactions: interactionCountRef.current,
          cacheHitRate: `${((cacheHitsRef.current / Math.max(cacheAttemptsRef.current, 1)) * 100).toFixed(1)}%`,
          errorRate: `${((errorCountRef.current / Math.max(totalOperationsRef.current, 1)) * 100).toFixed(1)}%`,
        });
      }
    };
  }, [componentName, enableProfiling, logMetrics]);

  // Mark render complete
  useEffect(() => {
    if (!enableProfiling) return;
    
    const renderTime = performance.now() - renderStartRef.current;
    setMetrics(prev => ({ ...prev, renderTime }));
  }, [enableProfiling]); // Add dependency array

  // Track cache performance
  const trackCacheHit = useCallback((hit: boolean) => {
    if (!enableProfiling) return;
    
    cacheAttemptsRef.current++;
    if (hit) cacheHitsRef.current++;
    
    const cacheHitRate = (cacheHitsRef.current / cacheAttemptsRef.current) * 100;
    setMetrics(prev => ({ ...prev, cacheHitRate }));
  }, [enableProfiling]);

  // Track interactions
  const trackInteraction = useCallback((type: string = 'click') => {
    if (!enableProfiling || !trackInteractions) return;
    
    const interactionStart = performance.now();
    interactionCountRef.current++;
    
    return () => {
      const interactionTime = performance.now() - interactionStart;
      setMetrics(prev => ({ 
        ...prev, 
        interactionTime: Math.max(prev.interactionTime, interactionTime)
      }));
    };
  }, [enableProfiling, trackInteractions]);

  // Track errors
  const trackError = useCallback(() => {
    if (!enableProfiling) return;
    
    errorCountRef.current++;
    totalOperationsRef.current++;
    
    const errorRate = (errorCountRef.current / totalOperationsRef.current) * 100;
    setMetrics(prev => ({ ...prev, errorRate }));
  }, [enableProfiling]);

  // Track successful operations
  const trackSuccess = useCallback(() => {
    if (!enableProfiling) return;
    
    totalOperationsRef.current++;
    
    const errorRate = (errorCountRef.current / totalOperationsRef.current) * 100;
    setMetrics(prev => ({ ...prev, errorRate }));
  }, [enableProfiling]);

  // Performance recommendations based on metrics
  const getRecommendations = useCallback(() => {
    const recommendations: string[] = [];
    
    if (metrics.loadTime > 1000) {
      recommendations.push('Consider reducing initial bundle size or implementing code splitting');
    }
    
    if (metrics.renderTime > 100) {
      recommendations.push('Optimize render performance with React.memo or useMemo');
    }
    
    if (metrics.cacheHitRate < 70) {
      recommendations.push('Improve caching strategy to reduce network requests');
    }
    
    if (metrics.errorRate > 5) {
      recommendations.push('Implement better error handling and retry mechanisms');
    }
    
    if (metrics.interactionTime > 50) {
      recommendations.push('Optimize user interactions with debouncing or virtualization');
    }
    
    return recommendations;
  }, [metrics]);

  // Get performance grade
  const getPerformanceGrade = useCallback(() => {
    let score = 100;
    
    // Deduct points based on metrics
    if (metrics.loadTime > 500) score -= 10;
    if (metrics.loadTime > 1000) score -= 20;
    if (metrics.renderTime > 50) score -= 10;
    if (metrics.renderTime > 100) score -= 20;
    if (metrics.cacheHitRate < 80) score -= 15;
    if (metrics.cacheHitRate < 50) score -= 25;
    if (metrics.errorRate > 2) score -= 15;
    if (metrics.errorRate > 10) score -= 30;
    if (metrics.interactionTime > 50) score -= 10;
    if (metrics.interactionTime > 100) score -= 20;
    
    if (score >= 90) return 'A+';
    if (score >= 80) return 'A';
    if (score >= 70) return 'B';
    if (score >= 60) return 'C';
    if (score >= 50) return 'D';
    return 'F';
  }, [metrics]);

  return {
    metrics,
    trackCacheHit,
    trackInteraction,
    trackError,
    trackSuccess,
    getRecommendations,
    getPerformanceGrade,
    isPerformant: metrics.loadTime < 1000 && metrics.renderTime < 100 && metrics.errorRate < 5,
  };
}

/**
 * Hook for implementing performance-aware resource loading
 * Adapts loading strategy based on network and device conditions
 */
export function useAdaptiveLoading() {
  const [connectionType, setConnectionType] = useState<string>('unknown');
  const [isSlowNetwork, setIsSlowNetwork] = useState<boolean>(false);
  const [deviceMemory, setDeviceMemory] = useState<number>(4); // Default to 4GB

  useEffect(() => {
    // Detect network conditions
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      setConnectionType(connection.effectiveType || 'unknown');
      setIsSlowNetwork(['2g', '3g'].includes(connection.effectiveType));
    }

    // Detect device memory
    if ('deviceMemory' in navigator) {
      setDeviceMemory((navigator as any).deviceMemory || 4);
    }

    // Monitor network changes
    const handleNetworkChange = () => {
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        setConnectionType(connection.effectiveType || 'unknown');
        setIsSlowNetwork(['2g', '3g'].includes(connection.effectiveType));
      }
    };

    if ('connection' in navigator) {
      (navigator as any).connection.addEventListener('change', handleNetworkChange);
    }

    return () => {
      if ('connection' in navigator) {
        (navigator as any).connection.removeEventListener('change', handleNetworkChange);
      }
    };
  }, []);

  // Get adaptive loading strategy
  const getLoadingStrategy = useCallback(() => {
    if (isSlowNetwork || deviceMemory < 2) {
      return {
        preloadDelay: 1000, // Longer delay for slow networks
        concurrentLoads: 1, // Fewer concurrent requests
        imageQuality: 'low', // Lower quality images
        cacheStrategy: 'aggressive', // More aggressive caching
        prioritizeAboveFold: true,
      };
    }

    if (deviceMemory >= 8 && !isSlowNetwork) {
      return {
        preloadDelay: 100, // Shorter delay for fast networks
        concurrentLoads: 4, // More concurrent requests
        imageQuality: 'high', // Higher quality images
        cacheStrategy: 'balanced', // Balanced caching
        prioritizeAboveFold: false,
      };
    }

    // Default strategy
    return {
      preloadDelay: 300,
      concurrentLoads: 2,
      imageQuality: 'medium',
      cacheStrategy: 'balanced',
      prioritizeAboveFold: true,
    };
  }, [isSlowNetwork, deviceMemory]);

  return {
    connectionType,
    isSlowNetwork,
    deviceMemory,
    loadingStrategy: getLoadingStrategy(),
  };
}

/**
 * Hook for memory-efficient component mounting
 * Prevents memory leaks and optimizes resource usage
 */
export function useMemoryEfficient() {
  const mountedRef = useRef(true);
  const cleanupFunctionsRef = useRef<Array<() => void>>([]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
      // Run all cleanup functions
      cleanupFunctionsRef.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      cleanupFunctionsRef.current = [];
    };
  }, []);

  const addCleanup = useCallback((cleanup: () => void) => {
    if (mountedRef.current) {
      cleanupFunctionsRef.current.push(cleanup);
    }
  }, []);

  const safeAsync = useCallback(<T,>(
    asyncFn: () => Promise<T>,
    onSuccess?: (result: T) => void,
    onError?: (error: Error) => void
  ) => {
    asyncFn()
      .then(result => {
        if (mountedRef.current && onSuccess) {
          onSuccess(result);
        }
      })
      .catch(error => {
        if (mountedRef.current && onError) {
          onError(error);
        }
      });
  }, []);

  return {
    isMounted: () => mountedRef.current,
    addCleanup,
    safeAsync,
  };
}

export default useProfilePerformance;