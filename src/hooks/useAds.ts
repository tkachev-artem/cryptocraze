import { useState, useEffect, useCallback, useRef } from 'react';
import { adService } from '../services/adService';
import { usePremium } from './usePremium';
import type { AdPlacement, AdWatchResult, AdAnalytics } from '../services/adService';
import { API_BASE_URL } from '@/lib/api';

// Types for ad hooks
export interface AdEligibility {
  eligible: boolean;
  reason: string;
  isPremium: boolean;
  canWatchAd: boolean;
  nextAdAvailableAt?: Date;
  dailyRewards: number;
  totalRewards: number;
}

export interface AdSessionState {
  isLoading: boolean;
  isWatching: boolean;
  error: string | null;
  lastResult: AdWatchResult | null;
}

export interface UseAdReturn {
  // State
  sessionState: AdSessionState;
  eligibility: AdEligibility | null;
  isReady: boolean;
  
  // Actions
  checkEligibility: (placement: AdPlacement) => Promise<AdEligibility>;
  watchAd: (placement: AdPlacement, rewardAmount?: number) => Promise<AdWatchResult>;
  refreshEligibility: () => Promise<void>;
  
  // Utils
  canWatchAd: (placement: AdPlacement) => boolean;
  getTimeUntilNextAd: () => number | null;
}

export const useAds = (): UseAdReturn => {
  const { isPremium, isLoading: premiumLoading } = usePremium();
  const [sessionState, setSessionState] = useState<AdSessionState>({
    isLoading: false,
    isWatching: false,
    error: null,
    lastResult: null,
  });
  const [eligibility, setEligibility] = useState<AdEligibility | null>(null);
  const [isReady, setIsReady] = useState(false);
  
  const initializationRef = useRef(false);

  // Initialize ad service
  useEffect(() => {
    const initAds = async () => {
      if (initializationRef.current || premiumLoading) return;
      
      try {
        initializationRef.current = true;
        await adService.initialize(import.meta.env.DEV);
        setIsReady(true);
        console.log('[useAds] Ad service initialized successfully');
      } catch (error) {
        console.error('[useAds] Failed to initialize ad service:', error);
        // Still set ready to allow fallback simulation
        setIsReady(true);
      }
    };

    initAds();
  }, [premiumLoading]);

  // Check eligibility for watching ads
  const checkEligibility = useCallback(async (placement: AdPlacement): Promise<AdEligibility> => {
    try {
      // If user is premium, they don't need to watch ads
      if (isPremium) {
        const premiumEligibility: AdEligibility = {
          eligible: false,
          reason: 'Premium users have ad-free experience',
          isPremium: true,
          canWatchAd: false,
          dailyRewards: 0,
          totalRewards: 0,
        };
        setEligibility(premiumEligibility);
        return premiumEligibility;
      }

      const response = await fetch(`${API_BASE_URL}/api/ads/check-eligibility?placement=${placement}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      const eligibilityData: AdEligibility = {
        eligible: data.data.eligible,
        reason: data.data.reason || '',
        isPremium: data.data.isPremium,
        canWatchAd: data.data.canWatchAd,
        nextAdAvailableAt: data.data.nextAdAvailableAt ? new Date(data.data.nextAdAvailableAt) : undefined,
        dailyRewards: data.data.dailyRewards || 0,
        totalRewards: data.data.totalRewards || 0,
      };

      setEligibility(eligibilityData);
      return eligibilityData;

    } catch (error) {
      console.error('[useAds] Error checking eligibility:', error);
      
      // Fallback eligibility for development/offline mode
      const fallbackEligibility: AdEligibility = {
        eligible: !isPremium,
        reason: isPremium ? 'Premium users have ad-free experience' : '',
        isPremium,
        canWatchAd: !isPremium,
        dailyRewards: 0,
        totalRewards: 0,
      };
      
      setEligibility(fallbackEligibility);
      return fallbackEligibility;
    }
  }, [isPremium]);

  // Watch an ad and get reward
  const watchAd = useCallback(async (
    placement: AdPlacement, 
    rewardAmount?: number
  ): Promise<AdWatchResult> => {
    if (!isReady) {
      throw new Error('Ad service not ready');
    }

    if (isPremium) {
      throw new Error('Premium users do not need to watch ads');
    }

    try {
      setSessionState(prev => ({ ...prev, isLoading: true, error: null }));

      // Check eligibility first
      const eligibilityCheck = await checkEligibility(placement);
      if (!eligibilityCheck.eligible) {
        throw new Error(eligibilityCheck.reason);
      }

      // Start ad session
      const adId = `ad_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const startResponse = await fetch(`${API_BASE_URL}/api/ads/session/start`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adId,
          placement,
          userAgent: navigator.userAgent,
          deviceInfo: {
            platform: navigator.platform,
            language: navigator.language,
            screen: {
              width: screen.width,
              height: screen.height,
            },
          },
        }),
      });

      if (!startResponse.ok) {
        const errorData = await startResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to start ad session: HTTP ${startResponse.status}`);
      }

      const sessionData = await startResponse.json();
      console.log('[useAds] Ad session started:', sessionData.sessionId);

      setSessionState(prev => ({ ...prev, isWatching: true }));

      // For now, simulate the ad experience
      // In a real implementation, this would integrate with the actual ad SDK
      const watchTime = 15000 + Math.random() * 10000; // 15-25 seconds
      
      await new Promise(resolve => setTimeout(resolve, watchTime));

      // Complete the ad session
      const reward = {
        type: placement === 'trading_bonus' ? 'trading_bonus' : 
              placement === 'wheel_spin' ? 'energy' : 
              placement === 'box_opening' ? 'coins' : 'energy',
        amount: rewardAmount || (placement === 'trading_bonus' ? 100 : 5),
        bonusPercentage: placement === 'trading_bonus' ? 5 : undefined,
      };

      const completeResponse = await fetch(`${API_BASE_URL}/api/ads/session/complete`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          adId,
          watchTime,
          reward,
          completed: true,
        }),
      });

      if (!completeResponse.ok) {
        const errorData = await completeResponse.json().catch(() => ({}));
        throw new Error(errorData.message || `Failed to complete ad session: HTTP ${completeResponse.status}`);
      }

      const completionData = await completeResponse.json();
      
      if (completionData.fraudDetected) {
        throw new Error('Ad fraud detected. Please try again later.');
      }

      const result: AdWatchResult = {
        success: completionData.success,
        adId,
        watchTime,
        placement,
        reward: completionData.reward || reward,
        error: completionData.success ? undefined : 'Ad completion failed',
      };

      setSessionState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isWatching: false, 
        lastResult: result 
      }));

      // Refresh eligibility after successful ad
      if (result.success) {
        await refreshEligibility();
      }

      return result;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('[useAds] Error watching ad:', errorMessage);
      
      setSessionState(prev => ({ 
        ...prev, 
        isLoading: false, 
        isWatching: false, 
        error: errorMessage 
      }));
      
      throw error;
    }
  }, [isReady, isPremium, checkEligibility]);

  // Refresh eligibility data
  const refreshEligibility = useCallback(async () => {
    if (eligibility) {
      await checkEligibility(eligibility.isPremium ? 'screen_transition' : 'task_completion');
    }
  }, [eligibility, checkEligibility]);

  // Utility to check if user can watch ad for a specific placement
  const canWatchAd = useCallback((placement: AdPlacement): boolean => {
    if (isPremium) return false;
    if (!eligibility) return false;
    return eligibility.eligible && eligibility.canWatchAd;
  }, [isPremium, eligibility]);

  // Get time until next ad is available (in milliseconds)
  const getTimeUntilNextAd = useCallback((): number | null => {
    if (!eligibility?.nextAdAvailableAt) return null;
    return Math.max(0, eligibility.nextAdAvailableAt.getTime() - Date.now());
  }, [eligibility]);

  return {
    sessionState,
    eligibility,
    isReady,
    checkEligibility,
    watchAd,
    refreshEligibility,
    canWatchAd,
    getTimeUntilNextAd,
  };
};

// Hook for ad analytics (admin only)
export const useAdAnalytics = () => {
  const [analytics, setAnalytics] = useState<AdAnalytics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async (timeframe: 'day' | 'week' | 'month' = 'day') => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await fetch(`${API_BASE_URL}/api/ads/analytics?timeframe=${timeframe}`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      setAnalytics(data.data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch analytics';
      console.error('[useAdAnalytics] Error:', errorMessage);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    analytics,
    isLoading,
    error,
    fetchAnalytics,
  };
};

export default useAds;