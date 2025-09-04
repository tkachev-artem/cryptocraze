import { useEffect, useRef, useState, type RefObject } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
  /**
   * Whether to trigger only once when the element enters the viewport
   * @default true
   */
  triggerOnce?: boolean;
  /**
   * Whether the hook is enabled
   * @default true
   */
  enabled?: boolean;
  /**
   * Delay before triggering the callback (in milliseconds)
   * @default 0
   */
  delay?: number;
}

interface UseIntersectionObserverReturn {
  /** Ref to attach to the element you want to observe */
  ref: RefObject<Element>;
  /** Whether the element is currently intersecting */
  isIntersecting: boolean;
  /** Whether the element has intersected at least once */
  hasIntersected: boolean;
  /** The intersection observer entry */
  entry: IntersectionObserverEntry | null;
}

/**
 * Hook for detecting when an element enters or leaves the viewport
 * Optimized for performance with built-in debouncing and memory management
 */
export function useIntersectionObserver(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn {
  const {
    root = null,
    rootMargin = '50px', // Preload 50px before element is visible
    threshold = 0.1,
    triggerOnce = true,
    enabled = true,
    delay = 0,
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  
  const elementRef = useRef<Element>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !elementRef.current) {
      return;
    }

    // Clean up previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Don't observe if already intersected and triggerOnce is true
    if (hasIntersected && triggerOnce) {
      return;
    }

    // Create new observer
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [currentEntry] = entries;
        
        if (!currentEntry) return;

        setEntry(currentEntry);

        const handleIntersection = () => {
          const isCurrentlyIntersecting = currentEntry.isIntersecting;
          setIsIntersecting(isCurrentlyIntersecting);

          if (isCurrentlyIntersecting && !hasIntersected) {
            setHasIntersected(true);
          }

          // If triggerOnce and element has intersected, disconnect observer
          if (triggerOnce && isCurrentlyIntersecting && !hasIntersected) {
            observerRef.current?.disconnect();
          }
        };

        // Apply delay if specified
        if (delay > 0) {
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
          }
          timeoutRef.current = setTimeout(handleIntersection, delay);
        } else {
          handleIntersection();
        }
      },
      {
        root,
        rootMargin,
        threshold,
      }
    );

    // Start observing
    observerRef.current.observe(elementRef.current);

    // Cleanup function
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [root, rootMargin, threshold, triggerOnce, enabled, delay, hasIntersected]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    ref: elementRef,
    isIntersecting,
    hasIntersected,
    entry,
  };
}

/**
 * Hook for lazy loading components when they enter the viewport
 * Combines intersection observer with component loading state
 */
export function useLazyLoad(
  options: UseIntersectionObserverOptions = {}
): UseIntersectionObserverReturn & {
  shouldLoad: boolean;
} {
  const observer = useIntersectionObserver(options);
  
  return {
    ...observer,
    shouldLoad: observer.hasIntersected,
  };
}