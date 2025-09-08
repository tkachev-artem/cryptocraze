import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import { formatNumberShort } from '@/lib/numberUtils';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import BottomNavigation from '../components/ui/BottomNavigation';
import { Button } from '@/components/ui/button';
import type { RewardTier } from '../../shared/schema';

// Enhanced types for better type safety and error handling
type ApiError = {
  message: string;
  status?: number;
  code?: string;
};

type ApiResponse<T> = {
  data: T;
  error?: never;
} | {
  data?: never;
  error: ApiError;
};

type UserStats = {
  rewardsCount?: number;
  accountMoney?: number;
  totalRewards?: number;
};

type LoadingState = 'idle' | 'loading' | 'error' | 'success';

type RewardsState = {
  tiers: RewardTier[];
  userStats: UserStats;
  loadingState: LoadingState;
  error: ApiError | null;
  retryCount: number;
  lastUpdated: number;
};

// Pagination configuration
const ITEMS_PER_PAGE = 10;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const CACHE_TTL = 30000; // 30 seconds

const Rewards: React.FC = () => {
  const [state, setState] = useState<RewardsState>({
    tiers: [],
    userStats: {},
    loadingState: 'idle',
    error: null,
    retryCount: 0,
    lastUpdated: 0,
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [isRealTimeEnabled, setIsRealTimeEnabled] = useState(false);
  
  const navigate = useNavigate();
  const { t } = useTranslation();
  const abortControllerRef = useRef<AbortController | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleBack = () => { void navigate(-1); };

  // Use the existing number formatting utility with enhanced precision handling
  const formatLargeNumber = useCallback((num: number): string => {
    // Handle edge cases and precision issues
    if (!Number.isFinite(num) || Number.isNaN(num)) {
      return '0';
    }
    
    // Use the existing numberUtils for consistent formatting
    return formatNumberShort(num);
  }, []);

  // Enhanced API client with proper error handling, retry logic, and cleanup
  const fetchWithRetry = useCallback(async <T,>(
    url: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> => {
    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;
      
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, 10000); // 10 second timeout

      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        const error: ApiError = {
          message: errorText || `HTTP ${response.status}: ${response.statusText}`,
          status: response.status,
          code: response.status.toString(),
        };
        return { error };
      }

      const data = await response.json();
      return { data };
    } catch (err) {
      const error = err as Error;
      
      // Handle abort errors gracefully
      if (error.name === 'AbortError') {
        return { 
          error: { 
            message: 'Request was cancelled', 
            code: 'CANCELLED' 
          } 
        };
      }
      
      // Retry logic for network errors
      if (retryCount < MAX_RETRIES && 
          (error.name === 'TypeError' || error.message.includes('fetch'))) {
        console.log(`Retrying request (${retryCount + 1}/${MAX_RETRIES})...`);
        
        return new Promise((resolve) => {
          retryTimeoutRef.current = setTimeout(() => {
            resolve(fetchWithRetry(url, options, retryCount + 1));
          }, RETRY_DELAY * Math.pow(2, retryCount)); // Exponential backoff
        });
      }

      return {
        error: {
          message: error.message || 'Network error occurred',
          code: 'NETWORK_ERROR',
        },
      };
    }
  }, []);

  // Enhanced data fetching with coordinated error handling
  const fetchRewardsData = useCallback(async (isRetry = false) => {
    setState(prev => ({ 
      ...prev, 
      loadingState: 'loading',
      error: null,
      retryCount: isRetry ? prev.retryCount + 1 : 0,
    }));

    try {
      // Fetch both endpoints with coordinated error handling
      const [rewardsResult, statsResult] = await Promise.allSettled([
        fetchWithRetry<RewardTier[]>(`${API_BASE_URL}/rewards`),
        fetchWithRetry<UserStats>(`${API_BASE_URL}/user/stats`),
      ]);

      let tiers: RewardTier[] = [];
      let userStats: UserStats = {};
      let hasError = false;
      let primaryError: ApiError | null = null;

      // Process rewards result
      if (rewardsResult.status === 'fulfilled' && !rewardsResult.value.error) {
        tiers = rewardsResult.value.data || [];
      } else {
        hasError = true;
        if (rewardsResult.status === 'fulfilled') {
          primaryError = rewardsResult.value.error!;
        } else {
          primaryError = { 
            message: rewardsResult.reason?.message || 'Failed to fetch rewards',
            code: 'REWARDS_ERROR' 
          };
        }
      }

      // Process stats result (non-critical)
      if (statsResult.status === 'fulfilled' && !statsResult.value.error) {
        userStats = statsResult.value.data || {};
      } else {
        console.warn('Failed to fetch user stats (non-critical):', 
          statsResult.status === 'fulfilled' 
            ? statsResult.value.error 
            : statsResult.reason
        );
      }

      setState(prev => ({
        ...prev,
        tiers,
        userStats,
        loadingState: hasError ? 'error' : 'success',
        error: primaryError,
        lastUpdated: Date.now(),
      }));

    } catch (error) {
      console.error('Unexpected error in fetchRewardsData:', error);
      setState(prev => ({
        ...prev,
        loadingState: 'error',
        error: {
          message: 'An unexpected error occurred',
          code: 'UNEXPECTED_ERROR',
        },
      }));
    }
  }, [fetchWithRetry]);

  // Retry mechanism
  const handleRetry = useCallback(() => {
    if (state.retryCount < MAX_RETRIES) {
      fetchRewardsData(true);
    }
  }, [fetchRewardsData, state.retryCount]);

  // Real-time updates toggle
  const toggleRealTimeUpdates = useCallback(() => {
    setIsRealTimeEnabled(prev => {
      if (!prev) {
        // Enable real-time updates
        realTimeIntervalRef.current = setInterval(() => {
          if (Date.now() - state.lastUpdated > CACHE_TTL) {
            fetchRewardsData();
          }
        }, 30000); // Update every 30 seconds
      } else {
        // Disable real-time updates
        if (realTimeIntervalRef.current) {
          clearInterval(realTimeIntervalRef.current);
          realTimeIntervalRef.current = null;
        }
      }
      return !prev;
    });
  }, [fetchRewardsData, state.lastUpdated]);

  // Initial data fetch
  useEffect(() => {
    fetchRewardsData();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
      }
    };
  }, [fetchRewardsData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
        retryTimeoutRef.current = null;
      }
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
        realTimeIntervalRef.current = null;
      }
    };
  }, []);

  // Pagination logic
  const totalItems = state.tiers.length;
  const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const currentTiers = state.tiers.slice(startIndex, endIndex);

  const handlePrevPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1));
  };

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1));
  };

  return (
    <ErrorBoundary>
      <div className="p-0 flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
        <div className="sticky top-0 z-30 bg-white">
          <div className="flex items-center justify-between px-4 py-4">
            <button 
              onClick={handleBack} 
              className="flex items-center gap-2 transition-opacity hover:opacity-70" 
              aria-label={t('nav.back')}
            >
              <img src="/top-menu/back.svg" alt="" className="w-6 h-6" role="presentation" />
              <span className="text-xl font-extrabold text-black">{t('nav.back')}</span>
            </button>
            
          </div>

          <div className="px-4 pb-4">
            <div className="flex items-center w-full h-[44px] px-4 rounded-[12px] border border-gray-200">
              <span className="text-sm font-bold w-[84px]">{t('rewards.level') || 'Level'}</span>
              <span className="text-sm font-bold flex-1 text-left pl-4">{t('rewards.accountMoney') || 'Account money'}</span>
              <span className="text-sm font-bold">{t('rewards.reward') || 'Reward'}</span>
            </div>
            
            {/* Stats summary */}
            {state.userStats.accountMoney !== undefined && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="text-xs text-blue-600 font-medium">
                  {t('rewards.currentBalance') || 'Current Balance'}: ${formatLargeNumber(state.userStats.accountMoney)}
                  {state.userStats.rewardsCount !== undefined && (
                    <span className="ml-4">
                      {t('rewards.completedRewards') || 'Completed'}: {state.userStats.rewardsCount}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
          {/* Белая заливка под шапкой вместо зазора */}
          <div className="h-3 bg-white" />
        </div>

        <div className="flex-1 bg-white">
          <div className="px-4 pb-12">
            {/* Loading State */}
            {state.loadingState === 'loading' && (
              <div className="space-y-2" role="status" aria-label="Loading rewards">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="py-[6px]">
                    <div className="h-10 rounded-[12px] bg-gray-100 animate-pulse" />
                  </div>
                ))}
                <div className="text-center text-sm text-gray-500 mt-4">
                  {t('common.loading') || 'Loading rewards...'}
                </div>
              </div>
            )}

            {/* Error State */}
            {state.loadingState === 'error' && state.error && (
              <div className="py-8 text-center" role="alert">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('common.error') || 'Error Loading Rewards'}
                  </h3>
                  <p className="text-gray-600 mb-4">
                    {state.error.message}
                  </p>
                  
                  {state.retryCount < MAX_RETRIES ? (
                    <Button 
                      onClick={handleRetry}
                      className="mr-2"
                      variant="default"
                    >
                      {t('common.retry') || 'Retry'} ({MAX_RETRIES - state.retryCount} attempts left)
                    </Button>
                  ) : (
                    <Button 
                      onClick={() => window.location.reload()}
                      variant="outline"
                    >
                      {t('common.reload') || 'Reload Page'}
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* Success State */}
            {state.loadingState === 'success' && (
              <>
                {currentTiers.length > 0 ? (
                  <>
                    <div className="space-y-2" role="list">
                      {currentTiers.map((tier) => {
                        const isCurrent = state.userStats.rewardsCount != null && tier.level === state.userStats.rewardsCount;
                        const isCompleted = state.userStats.rewardsCount != null && tier.level < state.userStats.rewardsCount;
                        
                        return (
                          <div key={tier.level} className="py-[6px]" role="listitem">
                            <div 
                              className={`relative flex items-center h-10 rounded-[12px] px-4 transition-all duration-200 ${
                                isCurrent 
                                  ? 'bg-[#F1F7FF] ring-2 ring-[#0C54EA] shadow-sm' 
                                  : isCompleted 
                                  ? 'bg-green-50 border border-green-200'
                                  : 'bg-[#F1F7FF] hover:bg-[#E8F2FF]'
                              }`}
                              aria-label={`Reward tier ${tier.level}: $${formatLargeNumber(tier.accountMoney)} account money required for $${formatLargeNumber(tier.reward)} reward${tier.proDays ? ` plus ${tier.proDays} pro days` : ''}`}
                            >
                              <span 
                                className={`text-base font-bold w-[84px] ${
                                  isCurrent 
                                    ? 'text-[#0C54EA]' 
                                    : isCompleted 
                                    ? 'text-green-600'
                                    : 'text-[#0C46BE] opacity-50'
                                }`}
                              >
                                {tier.level}
                                {isCompleted && (
                                  <span className="ml-1 text-green-500" aria-label="Completed">
                                    ✓
                                  </span>
                                )}
                              </span>
                              
                              <span className="text-sm font-medium text-black flex-1 text-left pl-4">
                                ${formatLargeNumber(tier.accountMoney || 0)}
                              </span>
                              
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-black">
                                  ${formatLargeNumber(tier.reward || 0)}
                                </span>
                                {tier.proDays != null && (
                                  <span
                                    className="inline-flex items-center gap-1 rounded-full bg-[#F5A600] text-black text-[11px] font-extrabold px-2 py-[2px] shrink-0"
                                    aria-label={t('rewards.proDays', { count: tier.proDays }) || `Pro Mode for ${tier.proDays} days`}
                                    title={t('rewards.proDays', { count: tier.proDays }) || `Pro Mode for ${tier.proDays} days`}
                                  >
                                    <span>PRO {tier.proDays} {t('rewards.daysShort') || 'd'}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="mt-3 flex items-center justify-between" role="navigation" aria-label="Rewards pagination">
                        <Button
                          onClick={handlePrevPage}
                          disabled={currentPage === 1}
                          variant="outline"
                          size="sm"
                          aria-label="Previous page"
                        >
                          ← {t('common.previous') || 'Previous'}
                        </Button>
                        
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {t('common.page') || 'Page'} {currentPage} {t('common.of') || 'of'} {totalPages}
                          </span>
                        </div>
                        
                        <Button
                          onClick={handleNextPage}
                          disabled={currentPage === totalPages}
                          variant="outline"
                          size="sm"
                          aria-label="Next page"
                        >
                          {t('common.next') || 'Next'} →
                        </Button>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="py-8 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                    </div>
                    <p className="text-sm text-gray-500">{t('common.noData') || 'No rewards available'}</p>
                  </div>
                )}
                
              </>
            )}
          </div>
        </div>
        <BottomNavigation />
      </div>
    </ErrorBoundary>
  );
};

export default Rewards;

