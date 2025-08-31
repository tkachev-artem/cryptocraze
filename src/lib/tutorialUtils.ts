/**
 * Tutorial utility functions
 * Provides shared functionality for tutorial positioning, event handling, and state management
 */

import type { 
  BaseTutorialStep, 
  PositioningResult, 
  TutorialPlacement, 
  CleanupFunction,
  TutorialLogger,
  TutorialLogLevel
} from '../types/tutorial';
import { TUTORIAL_CONFIG } from '../types/tutorial';

/**
 * Tutorial logger implementation
 */
export class TutorialLoggerImpl implements TutorialLogger {
  private isProduction = process.env.NODE_ENV === 'production';

  debug(message: string, data?: Record<string, unknown>): void {
    if (!this.isProduction) {
      console.debug(`[Tutorial] ${message}`, data || '');
    }
  }

  info(message: string, data?: Record<string, unknown>): void {
    if (!this.isProduction) {
      console.info(`[Tutorial] ${message}`, data || '');
    }
  }

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[Tutorial] ${message}`, data || '');
  }

  error(message: string, error?: Error, data?: Record<string, unknown>): void {
    console.error(`[Tutorial] ${message}`, error, data || '');
  }
}

// Global tutorial logger instance
export const tutorialLogger = new TutorialLoggerImpl();

/**
 * Debounce function for performance optimization
 */
export function debounce<T extends (...args: unknown[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: unknown[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

/**
 * Safe element query with error handling
 */
export function safeQueryElements(selector: string): Element[] {
  try {
    return Array.from(document.querySelectorAll(selector));
  } catch (error) {
    tutorialLogger.error('Failed to query elements', error as Error, { selector });
    return [];
  }
}

/**
 * Get combined bounding rect for multiple elements
 */
export function getCombinedRect(elements: Element[]): DOMRect | null {
  if (elements.length === 0) return null;

  try {
    const rects = elements.map(el => el.getBoundingClientRect());
    
    const left = Math.min(...rects.map(r => r.left));
    const top = Math.min(...rects.map(r => r.top));
    const right = Math.max(...rects.map(r => r.right));
    const bottom = Math.max(...rects.map(r => r.bottom));
    
    return new DOMRect(left, top, right - left, bottom - top);
  } catch (error) {
    tutorialLogger.error('Failed to calculate combined rect', error as Error);
    return null;
  }
}

/**
 * Calculate optimal modal positioning
 */
export function calculateModalPosition(
  targetSelector: string,
  preferredPlacement: TutorialPlacement,
  gap: number,
  modalHeight: number = TUTORIAL_CONFIG.MODAL.MIN_HEIGHT
): PositioningResult {
  // Default result for center placement or errors
  const defaultResult: PositioningResult = {
    placement: 'center',
    containerStyle: undefined,
    contentStyle: undefined,
  };

  if (preferredPlacement === 'center') {
    return defaultResult;
  }

  const elements = safeQueryElements(targetSelector);
  if (elements.length === 0) {
    tutorialLogger.warn('Target elements not found, falling back to center', { targetSelector });
    return defaultResult;
  }

  const combinedRect = getCombinedRect(elements);
  if (!combinedRect) {
    return defaultResult;
  }

  const viewportHeight = window.innerHeight;
  const spaceBelow = viewportHeight - combinedRect.bottom;
  const spaceAbove = combinedRect.top;

  let finalPlacement: TutorialPlacement = preferredPlacement;
  let yPosition: number;

  // Determine optimal placement
  if (preferredPlacement === 'auto') {
    finalPlacement = spaceBelow >= modalHeight + gap ? 'below' : 'above';
  }

  // Calculate Y position
  switch (finalPlacement) {
    case 'below':
      yPosition = Math.min(
        viewportHeight - modalHeight - TUTORIAL_CONFIG.POSITIONING.VIEWPORT_OFFSET,
        combinedRect.bottom + gap
      );
      break;
    case 'above':
      yPosition = Math.max(
        TUTORIAL_CONFIG.POSITIONING.VIEWPORT_OFFSET,
        combinedRect.top - gap - modalHeight
      );
      break;
    default:
      return defaultResult;
  }

  return {
    placement: finalPlacement,
    containerStyle: { position: 'relative' },
    contentStyle: {
      position: 'fixed',
      top: `${yPosition}px`,
      left: `${TUTORIAL_CONFIG.POSITIONING.LEFT_MARGIN}px`,
    },
  };
}

/**
 * Create cleanup manager for event listeners and timers
 */
export class CleanupManager {
  private cleanupFunctions: CleanupFunction[] = [];

  /**
   * Add a cleanup function
   */
  add(cleanup: CleanupFunction): void {
    this.cleanupFunctions.push(cleanup);
  }

  /**
   * Add event listener with automatic cleanup
   */
  addEventListener<K extends keyof WindowEventMap>(
    target: Window,
    type: K,
    listener: (this: Window, ev: WindowEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener<K extends keyof DocumentEventMap>(
    target: Document,
    type: K,
    listener: (this: Document, ev: DocumentEventMap[K]) => unknown,
    options?: boolean | AddEventListenerOptions
  ): void;
  addEventListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions
  ): void {
    target.addEventListener(type, listener, options);
    this.add(() => target.removeEventListener(type, listener, options));
  }

  /**
   * Add timeout with automatic cleanup
   */
  addTimeout(callback: () => void, delay: number): number {
    const timeoutId = window.setTimeout(callback, delay);
    this.add(() => clearTimeout(timeoutId));
    return timeoutId;
  }

  /**
   * Add ResizeObserver with automatic cleanup
   */
  addResizeObserver(callback: ResizeObserverCallback, target?: Element): ResizeObserver {
    const observer = new ResizeObserver(callback);
    if (target) {
      observer.observe(target);
    }
    this.add(() => observer.disconnect());
    return observer;
  }

  /**
   * Execute all cleanup functions
   */
  cleanup(): void {
    this.cleanupFunctions.forEach(cleanup => {
      try {
        cleanup();
      } catch (error) {
        tutorialLogger.error('Cleanup function failed', error as Error);
      }
    });
    this.cleanupFunctions = [];
  }
}

/**
 * Validate tutorial step configuration
 */
export function validateTutorialStep(step: BaseTutorialStep): boolean {
  if (!step.id || !step.title) {
    tutorialLogger.error('Invalid tutorial step: missing id or title', undefined, { step });
    return false;
  }

  if (step.targetSelector && !step.placement) {
    tutorialLogger.warn('Step has targetSelector but no placement specified', { step });
  }

  return true;
}

/**
 * Focus element with accessibility support
 */
export function focusElement(elementId: string, delay: number = TUTORIAL_CONFIG.TIMING.FOCUS_DELAY): void {
  setTimeout(() => {
    try {
      const element = document.getElementById(elementId) as HTMLElement | null;
      if (element) {
        element.focus();
        tutorialLogger.debug('Focused element', { elementId });
      } else {
        tutorialLogger.warn('Element not found for focus', { elementId });
      }
    } catch (error) {
      tutorialLogger.error('Failed to focus element', error as Error, { elementId });
    }
  }, delay);
}

/**
 * Dispatch custom tutorial event
 */
export function dispatchTutorialEvent(eventName: string, detail?: Record<string, unknown>): void {
  try {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
    tutorialLogger.debug('Dispatched tutorial event', { eventName, detail });
  } catch (error) {
    tutorialLogger.error('Failed to dispatch tutorial event', error as Error, { eventName, detail });
  }
}

/**
 * Get step configuration by step index
 */
export function getStepConfig(
  stepIndex: number,
  stepConfigs: Record<number, { selector: string; placement: TutorialPlacement; gap: number }>
): { selector: string; placement: TutorialPlacement; gap: number } | null {
  return stepConfigs[stepIndex] || null;
}

/**
 * Safely parse number with fallback
 */
export function safeParseNumber(value: unknown, fallback: number): number {
  const parsed = Number(value);
  return isNaN(parsed) ? fallback : parsed;
}

/**
 * Check if element is in viewport
 */
export function isElementInViewport(element: Element): boolean {
  try {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= window.innerHeight &&
      rect.right <= window.innerWidth
    );
  } catch (error) {
    tutorialLogger.error('Failed to check viewport visibility', error as Error);
    return false;
  }
}

/**
 * Create positioning recalculator with debouncing
 */
export function createPositioningRecalculator(
  recalculateFunc: () => void,
  cleanupManager: CleanupManager,
  contentRef: React.RefObject<HTMLElement>
): void {
  const debouncedRecalc = debounce(recalculateFunc, 16); // 60fps

  // Initial calculations
  recalculateFunc();
  cleanupManager.addTimeout(recalculateFunc, TUTORIAL_CONFIG.TIMING.RECALC_INITIAL);
  cleanupManager.addTimeout(recalculateFunc, TUTORIAL_CONFIG.TIMING.RECALC_DELAYED);

  // Event listeners
  cleanupManager.addEventListener(window, 'resize', debouncedRecalc);
  cleanupManager.addEventListener(window, 'scroll', debouncedRecalc, { passive: true });

  // ResizeObserver
  if (contentRef.current) {
    cleanupManager.addResizeObserver(debouncedRecalc, contentRef.current);
  }
}