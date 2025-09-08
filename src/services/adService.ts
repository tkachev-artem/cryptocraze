import type { User } from '@/shared/schema';
import { API_BASE_URL } from '@/lib/api';

// Enhanced TypeScript types for comprehensive ad system
export type AdType = 'rewarded_video' | 'interstitial' | 'banner' | 'native';
export type AdPlacement = 'task_completion' | 'wheel_spin' | 'box_opening' | 'trading_bonus' | 'screen_transition';
export type AdProvider = 'google_admob' | 'google_adsense' | 'simulation';

export interface AdConfig {
  type: AdType;
  placement: AdPlacement;
  provider: AdProvider;
  clientId?: string;
  slotId?: string;
  testMode?: boolean;
  rewardMultiplier?: number; // Bonus percentage (e.g., 1.05 for +5%)
}

export interface AdReward {
  type: 'money' | 'coins' | 'energy' | 'trading_bonus';
  amount: number;
  multiplier?: number;
  bonusPercentage?: number; // For trading bonus ads
}

export interface AdWatchResult {
  success: boolean;
  reward?: AdReward;
  adId: string;
  watchTime: number;
  placement: AdPlacement;
  error?: string;
  fraudDetected?: boolean;
}

export interface AdSession {
  id: string;
  userId: string;
  adId: string;
  placement: AdPlacement;
  startTime: number;
  endTime?: number;
  completed: boolean;
  rewardClaimed: boolean;
  ipAddress: string;
  userAgent: string;
}

export interface AdAnalytics {
  impressions: number;
  completions: number;
  rewards: number;
  revenue: number;
  completionRate: number;
  fraudRate: number;
}

// Google AdSense/AdMob types
declare global {
  interface Window {
    adsbygoogle?: unknown[];
    google?: {
      ima: GoogleIMA;
    };
  }
}

type GoogleIMA = {
  AdDisplayContainer: new (container: HTMLElement, video: HTMLVideoElement) => AdDisplayContainer;
  AdsLoader: new (adDisplayContainer: AdDisplayContainer) => AdsLoader;
  AdsRequest: new () => AdsRequest;
  AdsRenderingSettings: new () => AdsRenderingSettings;
  AdEvent: {
    Type: {
      COMPLETE: string;
      ALL_ADS_COMPLETED: string;
      STARTED: string;
      FIRST_QUARTILE: string;
      MIDPOINT: string;
      THIRD_QUARTILE: string;
    };
  };
  AdErrorEvent: {
    Type: {
      AD_ERROR: string;
    };
  };
  AdsManagerLoadedEvent: {
    Type: {
      ADS_MANAGER_LOADED: string;
    };
  };
  ViewMode: {
    FULLSCREEN: string;
  };
};

type AdDisplayContainer = {
  initialize(): void;
  destroy(): void;
};

type AdsLoader = {
  addEventListener(eventType: string, handler: (event: unknown) => void): void;
  requestAds(adsRequest: AdsRequest): void;
  destroy(): void;
};

type AdsRequest = {
  adTagUrl: string;
  linearAdSlotWidth: number;
  linearAdSlotHeight: number;
  nonLinearAdSlotWidth?: number;
  nonLinearAdSlotHeight?: number;
};

type AdsRenderingSettings = {
  restoreCustomPlaybackStateOnAdBreakComplete: boolean;
  enablePreloading: boolean;
  uiElements?: string[];
};

type AdsManager = {
  addEventListener(eventType: string, handler: (event?: unknown) => void): void;
  init(width: number, height: number, viewMode: string): void;
  start(): void;
  pause(): void;
  resume(): void;
  destroy(): void;
  getVolume(): number;
  setVolume(volume: number): void;
};

type AdsManagerLoadedEvent = {
  getAdsManager(video: HTMLVideoElement, container: AdDisplayContainer, settings: AdsRenderingSettings): AdsManager;
};

type AdErrorEvent = {
  getError(): { message: string; code?: number };
};

// Custom errors for ad system
export class AdError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly placement?: AdPlacement,
    public readonly adId?: string
  ) {
    super(message);
    this.name = 'AdError';
  }
}

export class AdFraudError extends AdError {
  constructor(message: string, placement?: AdPlacement, adId?: string) {
    super(message, 'AD_FRAUD', placement, adId);
    this.name = 'AdFraudError';
  }
}

export class AdLoadError extends AdError {
  constructor(message: string, placement?: AdPlacement) {
    super(message, 'AD_LOAD_ERROR', placement);
    this.name = 'AdLoadError';
  }
}

// Enhanced Ad Service with comprehensive functionality
export class AdService {
  private static instance: AdService;
  private adSenseLoaded = false;
  private imaLoaded = false;
  private currentSession: AdSession | null = null;
  private fraudDetectionEnabled = true;
  private testMode = false;
  
  // Configuration
  private readonly config = {
    adSense: {
      clientId: import.meta.env.VITE_ADSENSE_CLIENT as string,
      videoSlot: import.meta.env.VITE_ADSENSE_SLOT_VIDEO as string,
      bannerSlot: import.meta.env.VITE_ADSENSE_SLOT_BANNER as string,
    },
    ima: {
      adTagUrl: import.meta.env.VITE_IMA_AD_TAG_URL as string || 'https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=',
    },
    rewards: {
      defaultMoneyReward: 100,
      defaultEnergyReward: 5,
      tradingBonusPercentage: 5, // 5% bonus
      wheelSpinCost: 10, // Energy cost for wheel spin
    },
    fraud: {
      minWatchTime: 15000, // Minimum 15 seconds
      maxSessionsPerHour: 10,
      maxRewardsPerDay: 50,
    }
  };

  private constructor() {}

  public static getInstance(): AdService {
    if (!AdService.instance) {
      AdService.instance = new AdService();
    }
    return AdService.instance;
  }

  // Initialize the ad service
  public async initialize(testMode = false): Promise<void> {
    this.testMode = testMode;
    console.log(`[AdService] Initializing in ${testMode ? 'test' : 'production'} mode`);
    
    try {
      // Load both AdSense and IMA SDKs in parallel
      await Promise.all([
        this.loadAdSenseSDK(),
        this.loadIMASDK()
      ]);
      
      console.log('[AdService] Successfully initialized');
    } catch (error) {
      console.warn('[AdService] Failed to initialize SDKs, using simulation mode:', error);
    }
  }

  // Load Google AdSense SDK
  private async loadAdSenseSDK(): Promise<boolean> {
    if (this.adSenseLoaded || !this.config.adSense.clientId) {
      return this.adSenseLoaded;
    }

    return new Promise((resolve) => {
      const existingScript = document.querySelector('script[data-adsense-script="true"]');
      if (existingScript) {
        this.adSenseLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.async = true;
      script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(this.config.adSense.clientId)}`;
      script.setAttribute('crossorigin', 'anonymous');
      script.setAttribute('data-adsense-script', 'true');
      
      script.onload = () => {
        this.adSenseLoaded = true;
        console.log('[AdService] AdSense SDK loaded successfully');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('[AdService] Failed to load AdSense SDK');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  }

  // Load Google IMA SDK for video ads
  private async loadIMASDK(): Promise<boolean> {
    if (this.imaLoaded) return true;

    return new Promise((resolve) => {
      if (window.google?.ima) {
        this.imaLoaded = true;
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
      script.async = true;
      
      script.onload = () => {
        this.imaLoaded = true;
        console.log('[AdService] IMA SDK loaded successfully');
        resolve(true);
      };
      
      script.onerror = () => {
        console.error('[AdService] Failed to load IMA SDK');
        resolve(false);
      };
      
      document.head.appendChild(script);
    });
  }

  // Check if user has premium (ad-free experience)
  public async checkPremiumStatus(user: User): Promise<boolean> {
    return Boolean(user.proExpiresAt && new Date(user.proExpiresAt) > new Date());
  }

  // Show rewarded video ad
  public async showRewardedVideo(
    placement: AdPlacement,
    videoElement: HTMLVideoElement,
    adContainer: HTMLElement
  ): Promise<AdWatchResult> {
    const adId = this.generateAdId();
    const startTime = Date.now();

    try {
      // Start ad session tracking
      await this.startAdSession(adId, placement);

      let watchResult: AdWatchResult;

      // Try IMA first, fall back to simulation
      if (this.imaLoaded && !this.testMode) {
        watchResult = await this.showIMAVideo(adId, placement, videoElement, adContainer);
      } else {
        watchResult = await this.simulateVideoAd(adId, placement, startTime);
      }

      // Complete the session
      if (watchResult.success) {
        await this.completeAdSession(adId, watchResult);
      }

      return watchResult;
    } catch (error) {
      console.error('[AdService] Error showing rewarded video:', error);
      
      // Try simulation as fallback
      if (!this.testMode) {
        console.log('[AdService] Falling back to simulation');
        return this.simulateVideoAd(adId, placement, startTime);
      }
      
      throw error;
    }
  }

  // Show IMA video ad
  private async showIMAVideo(
    adId: string,
    placement: AdPlacement,
    videoElement: HTMLVideoElement,
    adContainer: HTMLElement
  ): Promise<AdWatchResult> {
    return new Promise((resolve, reject) => {
      if (!window.google?.ima) {
        reject(new AdLoadError('IMA SDK not available', placement));
        return;
      }

      const startTime = Date.now();
      let completed = false;
      let watchTime = 0;

      try {
        // Create ad display container
        const adDisplayContainer = new window.google.ima.AdDisplayContainer(adContainer, videoElement);
        adDisplayContainer.initialize();

        // Create ads loader
        const adsLoader = new window.google.ima.AdsLoader(adDisplayContainer);

        // Set up event listeners
        adsLoader.addEventListener(
          window.google.ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
          (event: unknown) => {
            const adsManagerEvent = event as AdsManagerLoadedEvent;
            const adsRenderingSettings = new window.google.ima.AdsRenderingSettings();
            adsRenderingSettings.restoreCustomPlaybackStateOnAdBreakComplete = true;
            adsRenderingSettings.enablePreloading = true;

            const adsManager = adsManagerEvent.getAdsManager(
              videoElement,
              adDisplayContainer,
              adsRenderingSettings
            );

            // Ad event listeners
            adsManager.addEventListener(window.google.ima.AdEvent.Type.STARTED, () => {
              console.log('[AdService] Ad started');
            });

            adsManager.addEventListener(window.google.ima.AdEvent.Type.COMPLETE, () => {
              completed = true;
              watchTime = Date.now() - startTime;
              console.log('[AdService] Ad completed');
            });

            adsManager.addEventListener(window.google.ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
              if (completed) {
                const reward = this.calculateReward(placement);
                resolve({
                  success: true,
                  reward,
                  adId,
                  watchTime,
                  placement
                });
              }
              adsManager.destroy();
              adDisplayContainer.destroy();
            });

            // Error handling
            adsManager.addEventListener(window.google.ima.AdErrorEvent.Type.AD_ERROR, (errorEvent: unknown) => {
              const adErrorEvent = errorEvent as AdErrorEvent;
              const error = adErrorEvent.getError();
              console.error('[AdService] Ad error:', error);
              
              adsManager.destroy();
              adDisplayContainer.destroy();
              
              reject(new AdLoadError(`Ad failed to load: ${error.message}`, placement));
            });

            // Initialize and start
            adsManager.init(
              videoElement.clientWidth,
              videoElement.clientHeight,
              window.google.ima.ViewMode.FULLSCREEN
            );
            adsManager.start();
          }
        );

        // Loader error handling
        adsLoader.addEventListener(window.google.ima.AdErrorEvent.Type.AD_ERROR, (errorEvent: unknown) => {
          const adErrorEvent = errorEvent as AdErrorEvent;
          const error = adErrorEvent.getError();
          console.error('[AdService] Loader error:', error);
          reject(new AdLoadError(`Ad loader failed: ${error.message}`, placement));
        });

        // Request ads
        const adsRequest = new window.google.ima.AdsRequest();
        adsRequest.adTagUrl = this.config.ima.adTagUrl;
        adsRequest.linearAdSlotWidth = videoElement.clientWidth;
        adsRequest.linearAdSlotHeight = videoElement.clientHeight;

        adsLoader.requestAds(adsRequest);

        // Safety timeout
        setTimeout(() => {
          if (!completed) {
            reject(new AdError('Ad timeout', 'AD_TIMEOUT', placement, adId));
          }
        }, 30000); // 30 second timeout

      } catch (error) {
        reject(new AdError(
          `IMA setup failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          'IMA_SETUP_ERROR',
          placement,
          adId
        ));
      }
    });
  }

  // Simulate video ad (for testing or fallback)
  private async simulateVideoAd(
    adId: string,
    placement: AdPlacement,
    startTime: number
  ): Promise<AdWatchResult> {
    console.log(`[AdService] Simulating video ad for ${placement}`);
    
    // Simulate realistic ad duration
    const adDuration = 15000 + Math.random() * 15000; // 15-30 seconds
    await new Promise(resolve => setTimeout(resolve, adDuration));
    
    const watchTime = Date.now() - startTime;
    const reward = this.calculateReward(placement);
    
    return {
      success: true,
      reward,
      adId,
      watchTime,
      placement
    };
  }

  // Show banner ad using AdSense
  public async showBannerAd(container: HTMLElement, placement: AdPlacement): Promise<boolean> {
    if (!this.adSenseLoaded) {
      console.warn('[AdService] AdSense not loaded, skipping banner ad');
      return false;
    }

    try {
      // Clear existing content
      container.innerHTML = '';

      // Create ad element
      const adElement = document.createElement('ins');
      adElement.className = 'adsbygoogle';
      adElement.style.display = 'block';
      adElement.setAttribute('data-ad-client', this.config.adSense.clientId);
      adElement.setAttribute('data-ad-slot', this.config.adSense.bannerSlot);
      adElement.setAttribute('data-ad-format', 'auto');
      adElement.setAttribute('data-full-width-responsive', 'true');

      container.appendChild(adElement);

      // Push ad to AdSense
      try {
        window.adsbygoogle = window.adsbygoogle || [];
        (window.adsbygoogle as unknown[]).push({});
        console.log(`[AdService] Banner ad loaded for ${placement}`);
        return true;
      } catch (error) {
        console.error('[AdService] Failed to push banner ad:', error);
        return false;
      }
    } catch (error) {
      console.error('[AdService] Error showing banner ad:', error);
      return false;
    }
  }

  // Calculate reward based on placement
  private calculateReward(placement: AdPlacement): AdReward {
    switch (placement) {
      case 'task_completion':
        return {
          type: 'energy',
          amount: this.config.rewards.defaultEnergyReward
        };
      case 'wheel_spin':
        return {
          type: 'energy',
          amount: this.config.rewards.wheelSpinCost
        };
      case 'box_opening':
        return {
          type: 'coins',
          amount: this.config.rewards.defaultMoneyReward
        };
      case 'trading_bonus':
        return {
          type: 'trading_bonus',
          amount: this.config.rewards.defaultMoneyReward,
          bonusPercentage: this.config.rewards.tradingBonusPercentage
        };
      default:
        return {
          type: 'coins',
          amount: this.config.rewards.defaultMoneyReward
        };
    }
  }

  // Start ad session tracking
  private async startAdSession(adId: string, placement: AdPlacement): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/ads/session/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          adId,
          placement,
          userAgent: navigator.userAgent,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const session = await response.json() as AdSession;
      this.currentSession = session;
      
      console.log('[AdService] Ad session started:', adId);
    } catch (error) {
      console.warn('[AdService] Failed to start ad session tracking:', error);
    }
  }

  // Complete ad session and process reward
  private async completeAdSession(adId: string, result: AdWatchResult): Promise<void> {
    try {
      // Fraud detection
      if (this.fraudDetectionEnabled && result.watchTime < this.config.fraud.minWatchTime) {
        throw new AdFraudError('Watch time too short', result.placement, adId);
      }

      const response = await fetch(`${API_BASE_URL}/ads/session/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          adId,
          watchTime: result.watchTime,
          reward: result.reward,
          completed: result.success,
          timestamp: Date.now()
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const completionData = await response.json();
      
      if (completionData.fraudDetected) {
        throw new AdFraudError('Fraud detected by server', result.placement, adId);
      }

      console.log('[AdService] Ad session completed and reward processed:', adId);
      this.currentSession = null;
    } catch (error) {
      console.error('[AdService] Failed to complete ad session:', error);
      throw error;
    }
  }

  // Get ad analytics
  public async getAnalytics(timeframe: 'day' | 'week' | 'month' = 'day'): Promise<AdAnalytics> {
    try {
      const response = await fetch(`${API_BASE_URL}/ads/analytics?timeframe=${timeframe}`, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('[AdService] Failed to fetch analytics:', error);
      return {
        impressions: 0,
        completions: 0,
        rewards: 0,
        revenue: 0,
        completionRate: 0,
        fraudRate: 0
      };
    }
  }

  // Utility methods
  private generateAdId(): string {
    return `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public isReady(): boolean {
    return this.adSenseLoaded || this.imaLoaded || this.testMode;
  }

  public setTestMode(enabled: boolean): void {
    this.testMode = enabled;
    console.log(`[AdService] Test mode ${enabled ? 'enabled' : 'disabled'}`);
  }

  public setFraudDetection(enabled: boolean): void {
    this.fraudDetectionEnabled = enabled;
    console.log(`[AdService] Fraud detection ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Cleanup method
  public destroy(): void {
    if (this.currentSession) {
      console.log('[AdService] Cleaning up active session');
      this.currentSession = null;
    }
    console.log('[AdService] Service destroyed');
  }
}

// Export singleton instance
export const adService = AdService.getInstance();
export default adService;