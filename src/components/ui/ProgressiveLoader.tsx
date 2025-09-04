import React, { useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import { useIntersectionObserver } from '../../hooks/useIntersectionObserver';
import { usePreloader } from '../../hooks/usePreloader';

interface LoadStage {
  id: string;
  priority: number;
  delay?: number;
  loader: () => Promise<any>;
  component: React.ComponentType<any>;
  props?: Record<string, any>;
  fallback?: ReactNode;
  errorFallback?: ReactNode;
  cacheKey?: string;
  cacheTTL?: number;
}

interface ProgressiveLoaderProps {
  stages: LoadStage[];
  initialStage?: string;
  onStageComplete?: (stageId: string, data: any) => void;
  onAllStagesComplete?: () => void;
  onError?: (stageId: string, error: Error) => void;
  rootMargin?: string;
  threshold?: number;
  enableIntersectionObserver?: boolean;
  className?: string;
  children?: ReactNode;
}

interface StageData {
  stage: LoadStage;
  data: any;
  isLoading: boolean;
  error: Error | null;
  isComplete: boolean;
}

/**
 * Progressive loading component that orchestrates multi-stage data loading
 * with smart preloading, caching, and error handling
 */
export const ProgressiveLoader: React.FC<ProgressiveLoaderProps> = ({
  stages,
  initialStage,
  onStageComplete,
  onAllStagesComplete,
  onError,
  rootMargin = '100px',
  threshold = 0.1,
  enableIntersectionObserver = true,
  className = '',
  children,
}) => {
  const [stageData, setStageData] = useState<Map<string, StageData>>(new Map());
  const [currentStageIndex, setCurrentStageIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(!enableIntersectionObserver);

  // Intersection observer for viewport-based loading
  const { ref, hasIntersected } = useIntersectionObserver({
    rootMargin,
    threshold,
    triggerOnce: true,
    enabled: enableIntersectionObserver,
  });

  // Update visibility when intersection occurs
  useEffect(() => {
    if (hasIntersected && enableIntersectionObserver) {
      setIsVisible(true);
    }
  }, [hasIntersected, enableIntersectionObserver]);

  // Sort stages by priority
  const sortedStages = useMemo(() => {
    return [...stages].sort((a, b) => b.priority - a.priority);
  }, [stages]);

  // Initialize stage data
  useEffect(() => {
    const initialData = new Map<string, StageData>();
    sortedStages.forEach(stage => {
      initialData.set(stage.id, {
        stage,
        data: null,
        isLoading: false,
        error: null,
        isComplete: false,
      });
    });
    setStageData(initialData);
    
    // Set initial stage if specified
    if (initialStage) {
      const initialIndex = sortedStages.findIndex(s => s.id === initialStage);
      if (initialIndex !== -1) {
        setCurrentStageIndex(initialIndex);
      }
    }
  }, [sortedStages, initialStage]);

  // Preloader for current stage
  const currentStage = sortedStages[currentStageIndex];
  const { data, isLoading, error } = usePreloader(
    currentStage?.id || 'none',
    currentStage?.loader || (() => Promise.resolve(null)),
    {
      priority: currentStage?.priority || 0,
      delay: currentStage?.delay || 0,
      immediate: isVisible && !!currentStage,
      cacheKey: currentStage?.cacheKey,
      cacheTTL: currentStage?.cacheTTL,
    }
  );

  // Update stage data when current stage loads
  useEffect(() => {
    if (!currentStage) return;

    setStageData(prev => {
      const updated = new Map(prev);
      const stageInfo = updated.get(currentStage.id);
      
      if (stageInfo) {
        updated.set(currentStage.id, {
          ...stageInfo,
          data,
          isLoading,
          error,
          isComplete: !isLoading && !error && data !== null,
        });
      }
      
      return updated;
    });

    // Handle stage completion
    if (!isLoading && !error && data !== null) {
      onStageComplete?.(currentStage.id, data);
      
      // Move to next stage
      if (currentStageIndex < sortedStages.length - 1) {
        setCurrentStageIndex(prev => prev + 1);
      } else {
        // All stages complete
        onAllStagesComplete?.();
      }
    }

    // Handle errors
    if (error) {
      onError?.(currentStage.id, error);
    }
  }, [currentStage, data, isLoading, error, currentStageIndex, sortedStages.length, onStageComplete, onAllStagesComplete, onError]);

  // Get completed stages for rendering
  const completedStages = useMemo(() => {
    return Array.from(stageData.values()).filter(s => s.isComplete);
  }, [stageData]);

  // Get loading/error stages
  const loadingStages = useMemo(() => {
    return Array.from(stageData.values()).filter(s => s.isLoading);
  }, [stageData]);

  const errorStages = useMemo(() => {
    return Array.from(stageData.values()).filter(s => s.error !== null);
  }, [stageData]);

  // Render completed components
  const renderCompletedStages = useCallback(() => {
    return completedStages.map(({ stage, data }) => {
      const Component = stage.component;
      return (
        <React.Fragment key={stage.id}>
          <Component {...(stage.props || {})} data={data} />
        </React.Fragment>
      );
    });
  }, [completedStages]);

  // Render loading fallbacks
  const renderLoadingFallbacks = useCallback(() => {
    return loadingStages.map(({ stage }) => (
      <React.Fragment key={`loading-${stage.id}`}>
        {stage.fallback || <div className="animate-pulse bg-gray-200 rounded h-20" />}
      </React.Fragment>
    ));
  }, [loadingStages]);

  // Render error fallbacks
  const renderErrorFallbacks = useCallback(() => {
    return errorStages.map(({ stage, error }) => (
      <React.Fragment key={`error-${stage.id}`}>
        {stage.errorFallback || (
          <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
            Error loading {stage.id}: {error?.message}
          </div>
        )}
      </React.Fragment>
    ));
  }, [errorStages]);

  return (
    <div ref={ref} className={className}>
      {children}
      {renderCompletedStages()}
      {renderLoadingFallbacks()}
      {renderErrorFallbacks()}
    </div>
  );
};

/**
 * Higher-order component for wrapping components with progressive loading
 */
export function withProgressiveLoading<T extends object>(
  WrappedComponent: React.ComponentType<T>,
  loader: () => Promise<any>,
  options: {
    priority?: number;
    delay?: number;
    cacheKey?: string;
    cacheTTL?: number;
    fallback?: ReactNode;
    errorFallback?: ReactNode;
  } = {}
) {
  const {
    priority = 1,
    delay = 0,
    cacheKey,
    cacheTTL,
    fallback,
    errorFallback,
  } = options;

  return function ProgressiveComponent(props: T) {
    const { data, isLoading, error } = usePreloader(
      cacheKey || WrappedComponent.displayName || 'anonymous',
      loader,
      {
        priority,
        delay,
        immediate: true,
        cacheKey,
        cacheTTL,
      }
    );

    if (error) {
      return (
        <>
          {errorFallback || (
            <div className="text-red-500 text-sm p-2 bg-red-50 rounded">
              Error loading component: {error.message}
            </div>
          )}
        </>
      );
    }

    if (isLoading || data === null) {
      return (
        <>
          {fallback || <div className="animate-pulse bg-gray-200 rounded h-20" />}
        </>
      );
    }

    return <WrappedComponent {...props} data={data} />;
  };
}

/**
 * Hook for managing progressive loading state in custom components
 */
export function useProgressiveLoading(
  stages: Omit<LoadStage, 'component'>[]
) {
  const [completedStages, setCompletedStages] = useState<Set<string>>(new Set());
  const [loadingStages, setLoadingStages] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());

  const preloaders = stages.map(stage =>
    usePreloader(stage.id, stage.loader, {
      priority: stage.priority,
      delay: stage.delay || 0,
      immediate: true,
      cacheKey: stage.cacheKey,
      cacheTTL: stage.cacheTTL,
    })
  );

  useEffect(() => {
    const newCompleted = new Set<string>();
    const newLoading = new Set<string>();
    const newErrors = new Map<string, Error>();

    preloaders.forEach((preloader, index) => {
      const stage = stages[index];
      
      if (preloader.error) {
        newErrors.set(stage.id, preloader.error);
      } else if (preloader.isLoading) {
        newLoading.add(stage.id);
      } else if (preloader.data !== null) {
        newCompleted.add(stage.id);
      }
    });

    setCompletedStages(newCompleted);
    setLoadingStages(newLoading);
    setErrors(newErrors);
  }, [preloaders, stages]);

  const getStageData = useCallback((stageId: string) => {
    const index = stages.findIndex(s => s.id === stageId);
    if (index === -1) return null;
    return preloaders[index];
  }, [stages, preloaders]);

  const isStageComplete = useCallback((stageId: string) => {
    return completedStages.has(stageId);
  }, [completedStages]);

  const isStageLoading = useCallback((stageId: string) => {
    return loadingStages.has(stageId);
  }, [loadingStages]);

  const getStageError = useCallback((stageId: string) => {
    return errors.get(stageId) || null;
  }, [errors]);

  const isAllComplete = completedStages.size === stages.length && errors.size === 0;
  const hasAnyError = errors.size > 0;
  const isAnyLoading = loadingStages.size > 0;

  return {
    completedStages,
    loadingStages,
    errors,
    getStageData,
    isStageComplete,
    isStageLoading,
    getStageError,
    isAllComplete,
    hasAnyError,
    isAnyLoading,
  };
}

export default ProgressiveLoader;