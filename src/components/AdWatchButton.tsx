import React, { useState, useCallback } from 'react';
import { useTranslation } from '../lib/i18n';
import { useAds } from '../hooks/useAds';
import { usePremium } from '../hooks/usePremium';
import EnhancedVideoAdModal from './EnhancedVideoAdModal';
import type { AdPlacement, AdWatchResult } from '../services/adService';

interface AdWatchButtonProps {
  placement: AdPlacement;
  onAdCompleted?: (result: AdWatchResult) => void;
  disabled?: boolean;
  className?: string;
  children?: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'small';
  rewardAmount?: number;
  requiredViews?: number;
  showRewardInfo?: boolean;
}

const AdWatchButton: React.FC<AdWatchButtonProps> = ({
  placement,
  onAdCompleted,
  disabled = false,
  className = '',
  children,
  variant = 'primary',
  rewardAmount,
  requiredViews = 1,
  showRewardInfo = true
}) => {
  const { t } = useTranslation();
  const { isPremium } = usePremium();
  const { canWatchAd, checkEligibility, sessionState, eligibility } = useAds();
  const [showAdModal, setShowAdModal] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Get reward info based on placement
  const getRewardInfo = useCallback(() => {
    const baseAmount = rewardAmount || 5;
    switch (placement) {
      case 'trading_bonus':
        return { amount: baseAmount, type: 'trading_bonus', icon: '📈' };
      case 'wheel_spin':
        return { amount: baseAmount, type: 'energy', icon: '⚡' };
      case 'box_opening':
        return { amount: baseAmount, type: 'coins', icon: '🪙' };
      case 'task_completion':
        return { amount: baseAmount, type: 'energy', icon: '⚡' };
      default:
        return { amount: baseAmount, type: 'energy', icon: '⚡' };
    }
  }, [placement, rewardAmount]);

  const rewardInfo = getRewardInfo();

  // Handle button click
  const handleClick = useCallback(async () => {
    if (isPremium) {
      console.log('[AdWatchButton] Premium user attempted to watch ad');
      return;
    }

    if (disabled || sessionState.isLoading) {
      return;
    }

    try {
      setIsChecking(true);
      const eligibilityResult = await checkEligibility(placement);
      
      if (!eligibilityResult.eligible) {
        console.log('[AdWatchButton] User not eligible:', eligibilityResult.reason);
        // You could show a toast or modal here explaining why they can't watch ads
        return;
      }

      setShowAdModal(true);
    } catch (error) {
      console.error('[AdWatchButton] Error checking eligibility:', error);
    } finally {
      setIsChecking(false);
    }
  }, [isPremium, disabled, sessionState.isLoading, checkEligibility, placement]);

  // Handle ad completion
  const handleAdCompleted = useCallback((result: AdWatchResult) => {
    console.log('[AdWatchButton] Ad completed:', result);
    setShowAdModal(false);
    
    if (onAdCompleted && result.success) {
      onAdCompleted(result);
    }
  }, [onAdCompleted]);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setShowAdModal(false);
  }, []);

  // Don't render button for premium users
  if (isPremium) {
    return null;
  }

  // Get button styles based on variant
  const getButtonStyles = () => {
    const baseClasses = 'inline-flex items-center justify-center gap-2 font-semibold rounded-full transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
    
    switch (variant) {
      case 'small':
        return `${baseClasses} px-3 py-1.5 text-sm bg-green-500 hover:bg-green-600 text-white`;
      case 'secondary':
        return `${baseClasses} px-4 py-2 text-sm bg-gray-500 hover:bg-gray-600 text-white`;
      default:
        return `${baseClasses} px-4 py-2 bg-green-500 hover:bg-green-600 text-white hover:scale-105`;
    }
  };

  // Get button text
  const getButtonText = () => {
    if (isChecking) return t('ads.checking');
    if (sessionState.isLoading) return t('ads.loading');
    
    if (children) return children;
    
    // Default text based on placement
    switch (placement) {
      case 'trading_bonus':
        return t('ads.watchForBonus');
      case 'wheel_spin':
        return t('ads.watchForSpin');
      case 'box_opening':
        return t('ads.watchForReward');
      default:
        return t('ads.watchAd');
    }
  };

  // Check if button should be disabled
  const isDisabled = disabled || 
    sessionState.isLoading || 
    isChecking || 
    (eligibility && !eligibility.canWatchAd);

  // Get countdown text if user needs to wait
  const getCountdownText = useCallback(() => {
    if (!eligibility?.nextAdAvailableAt) return null;
    
    const now = Date.now();
    const nextAdTime = eligibility.nextAdAvailableAt.getTime();
    const timeLeft = nextAdTime - now;
    
    if (timeLeft <= 0) return null;
    
    const minutes = Math.ceil(timeLeft / (1000 * 60));
    return t('ads.availableIn', { minutes });
  }, [eligibility, t]);

  const countdownText = getCountdownText();

  return (
    <>
      <div className="flex flex-col items-center gap-1">
        <button
          onClick={handleClick}
          disabled={isDisabled}
          className={`${getButtonStyles()} ${className}`}
          aria-label={getButtonText()}
        >
          {/* Video icon */}
          <svg 
            className="w-4 h-4" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M14.828 14.828a4 4 0 01-5.656 0M9 10h1m4 0h1M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2z" 
            />
          </svg>
          
          <span>{getButtonText()}</span>
          
          {/* Show reward info */}
          {showRewardInfo && !isChecking && !sessionState.isLoading && (
            <span className="text-xs opacity-90">
              +{rewardInfo.amount} {rewardInfo.icon}
            </span>
          )}
        </button>

        {/* Countdown text */}
        {countdownText && (
          <div className="text-xs text-gray-500 text-center">
            {countdownText}
          </div>
        )}

        {/* Eligibility info */}
        {eligibility && !eligibility.canWatchAd && !countdownText && (
          <div className="text-xs text-red-500 text-center">
            {eligibility.reason}
          </div>
        )}
      </div>

      {/* Ad Modal */}
      {showAdModal && (
        <EnhancedVideoAdModal
          isOpen={showAdModal}
          onClose={handleModalClose}
          onAdCompleted={handleAdCompleted}
          placement={placement}
          requiredViews={requiredViews}
          rewardAmount={rewardAmount}
        />
      )}
    </>
  );
};

// Helper component for inline ad rewards in tasks
export const InlineAdReward: React.FC<{
  placement: AdPlacement;
  onComplete?: () => void;
  rewardAmount?: number;
}> = ({ placement, onComplete, rewardAmount }) => {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-center gap-2">
        <span className="text-green-600">🎥</span>
        <div>
          <div className="text-sm font-medium text-green-800">
            {t('ads.watchToEarn')}
          </div>
          <div className="text-xs text-green-600">
            +{rewardAmount || 5} {placement === 'trading_bonus' ? t('ads.bonus') : t('ads.energy')}
          </div>
        </div>
      </div>
      
      <AdWatchButton
        placement={placement}
        onAdCompleted={onComplete}
        variant="small"
        rewardAmount={rewardAmount}
        showRewardInfo={false}
      >
        {t('common.watch')}
      </AdWatchButton>
    </div>
  );
};

export default AdWatchButton;