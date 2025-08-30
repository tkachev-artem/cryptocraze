import { config } from '../lib/config';

interface AnalyticsEvent {
  eventType: string;
  eventData: Record<string, any>;
  sessionId: string;
  timestamp: number;
}

class AnalyticsService {
  private eventQueue: AnalyticsEvent[] = [];
  private sessionId: string;
  private batchSize: number = 20;
  private flushInterval: number = 30000; // 30 seconds
  private maxRetries: number = 3;
  private flushTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupFlushTimer();
    this.setupBeforeUnloadHandler();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private setupFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    this.flushTimer = setInterval(() => {
      if (this.eventQueue.length > 0) {
        this.flushEvents();
      }
    }, this.flushInterval);
  }

  private setupBeforeUnloadHandler(): void {
    // Flush events before page unload
    window.addEventListener('beforeunload', () => {
      if (this.eventQueue.length > 0) {
        // Use sendBeacon for reliable delivery on page unload
        this.flushEventsSync();
      }
    });

    // Flush events when page becomes hidden (mobile app backgrounding)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && this.eventQueue.length > 0) {
        this.flushEventsSync();
      }
    });
  }

  /**
   * Track an analytics event
   */
  trackEvent(eventType: string, eventData: Record<string, any> = {}): void {
    const event: AnalyticsEvent = {
      eventType,
      eventData: {
        ...eventData,
        url: window.location.pathname,
        userAgent: navigator.userAgent,
        timestamp: Date.now()
      },
      sessionId: this.sessionId,
      timestamp: Date.now()
    };

    this.eventQueue.push(event);

    // Auto-flush if batch size reached
    if (this.eventQueue.length >= this.batchSize) {
      this.flushEvents();
    }
  }

  /**
   * Flush events asynchronously
   */
  private async flushEvents(retryCount: number = 0): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const eventsToSend = [...this.eventQueue];
    this.eventQueue = []; // Clear queue immediately

    try {
      const response = await fetch(`${config.api.baseUrl}/analytics/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ events: eventsToSend })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.debug(`Analytics: Sent ${eventsToSend.length} events`);
    } catch (error) {
      console.error('Analytics: Failed to send events:', error);

      // Retry logic
      if (retryCount < this.maxRetries) {
        // Put events back in queue for retry
        this.eventQueue.unshift(...eventsToSend);
        
        // Exponential backoff
        const delay = Math.pow(2, retryCount) * 1000;
        setTimeout(() => {
          this.flushEvents(retryCount + 1);
        }, delay);
      } else {
        console.error(`Analytics: Giving up after ${this.maxRetries} retries`);
      }
    }
  }

  /**
   * Synchronous flush using sendBeacon (for page unload)
   */
  private flushEventsSync(): void {
    if (this.eventQueue.length === 0) return;

    const data = JSON.stringify({ events: this.eventQueue });
    const blob = new Blob([data], { type: 'application/json' });

    if (navigator.sendBeacon) {
      const success = navigator.sendBeacon(`${config.api.baseUrl}/analytics/batch`, blob);
      if (success) {
        console.debug(`Analytics: Beacon sent ${this.eventQueue.length} events`);
        this.eventQueue = [];
      }
    }
  }

  /**
   * Force flush all pending events
   */
  flush(): void {
    if (this.eventQueue.length > 0) {
      this.flushEvents();
    }
  }

  /**
   * Get current queue size (for debugging)
   */
  getQueueSize(): number {
    return this.eventQueue.length;
  }

  // ===== PREDEFINED EVENT TRACKERS =====

  /**
   * Track page view
   */
  trackPageView(page: string, additionalData: Record<string, any> = {}): void {
    this.trackEvent('page_view', {
      page,
      referrer: document.referrer,
      ...additionalData
    });
  }

  /**
   * Track trade opening
   */
  trackTradeOpen(symbol: string, amount: number, direction: 'up' | 'down', multiplier: number): void {
    this.trackEvent('trade_open', {
      symbol,
      amount,
      direction,
      multiplier,
      timestamp: Date.now()
    });
  }

  /**
   * Track trade closing
   */
  trackTradeClosed(tradeId: number, profit: number, duration: number, reason: string = 'manual'): void {
    this.trackEvent('trade_closed', {
      tradeId,
      profit,
      duration, // in milliseconds
      reason, // 'manual', 'take_profit', 'stop_loss'
      profitPercentage: profit ? ((profit / 100) * 100).toFixed(2) : '0'
    });
  }

  /**
   * Track user engagement
   */
  trackEngagement(action: string, component: string, value?: string | number): void {
    this.trackEvent('engagement', {
      action, // 'click', 'view', 'scroll', 'focus'
      component, // 'chart', 'deal_button', 'menu'
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Track feature usage
   */
  trackFeatureUsage(feature: string, action: string, additionalData: Record<string, any> = {}): void {
    this.trackEvent('feature_usage', {
      feature, // 'pro_mode', 'wheel', 'tasks', 'energy'
      action, // 'activate', 'use', 'complete'
      ...additionalData
    });
  }

  /**
   * Track error occurrence
   */
  trackError(error: Error, component: string, additionalData: Record<string, any> = {}): void {
    this.trackEvent('error', {
      errorMessage: error.message,
      errorStack: error.stack,
      component,
      ...additionalData
    });
  }

  /**
   * Track performance metrics
   */
  trackPerformance(metric: string, value: number, unit: string = 'ms'): void {
    this.trackEvent('performance', {
      metric, // 'page_load_time', 'api_response_time', 'chart_render_time'
      value,
      unit
    });
  }

  /**
   * Track tutorial/onboarding progress
   */
  trackTutorialProgress(step: string, action: 'start' | 'complete' | 'skip'): void {
    this.trackEvent('tutorial_progress', {
      step,
      action,
      timestamp: Date.now()
    });
  }

  /**
   * Track premium/monetization events
   */
  trackMonetization(action: string, data: Record<string, any> = {}): void {
    this.trackEvent('monetization', {
      action, // 'premium_view', 'premium_purchase', 'ad_watched'
      ...data
    });
  }

  /**
   * Track search and discovery
   */
  trackSearch(query: string, results: number, component: string): void {
    this.trackEvent('search', {
      query,
      results,
      component // 'crypto_list', 'help'
    });
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush();
  }
}

// Create singleton instance
export const analyticsService = new AnalyticsService();

// Auto-track page views on route changes (for SPA)
if (typeof window !== 'undefined') {
  let currentPath = window.location.pathname;
  
  // Track initial page view
  analyticsService.trackPageView(currentPath);

  // Listen for navigation changes
  const trackNavigation = () => {
    const newPath = window.location.pathname;
    if (newPath !== currentPath) {
      currentPath = newPath;
      analyticsService.trackPageView(newPath);
    }
  };

  // Listen to both popstate and pushstate/replacestate
  window.addEventListener('popstate', trackNavigation);
  
  // Override pushState and replaceState to catch programmatic navigation
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  
  history.pushState = function(...args) {
    originalPushState.apply(history, args);
    setTimeout(trackNavigation, 0);
  };
  
  history.replaceState = function(...args) {
    originalReplaceState.apply(history, args);
    setTimeout(trackNavigation, 0);
  };
}

export default analyticsService;