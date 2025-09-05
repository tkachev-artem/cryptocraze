import React, { useState, useCallback } from 'react';
import EnhancedVideoAdModal from './EnhancedVideoAdModal';
import { analyticsService } from '../services/analyticsService';

export type AdPlacement = 'task_completion' | 'daily_bonus' | 'energy_boost' | 'trading_bonus' | 'wheel_spin';

export interface AdReward {
  type: 'coins' | 'energy' | 'multiplier' | 'wheel_spin';
  amount: number;
  description?: string;
}

export interface AdContainerProps {
  children: (props: {
    showAd: () => void;
    isAdShowing: boolean;
    canShowAd: boolean;
  }) => React.ReactNode;
  placement: AdPlacement;
  reward?: AdReward;
  onAdCompleted?: (result: { success: boolean; reward?: AdReward }) => void;
  onAdClosed?: () => void;
  disabled?: boolean;
}

/**
 * Unified container for all ad viewing functionality
 * Wraps ad modal logic and provides a render prop interface
 */
const AdContainer: React.FC<AdContainerProps> = ({
  children,
  placement,
  reward,
  onAdCompleted,
  onAdClosed,
  disabled = false
}) => {
  const [showAdModal, setShowAdModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const canShowAd = !disabled && !isProcessing;

  const showAd = useCallback(() => {
    if (!canShowAd) {
      console.warn('[AdContainer] Cannot show ad - disabled or processing');
      return;
    }
    
    console.log(`[AdContainer] Starting ad for placement: ${placement}`);
    analyticsService.trackEngagement('ad_requested', placement);
    setShowAdModal(true);
  }, [canShowAd, placement]);

  const handleAdCompleted = useCallback((result: any) => {
    console.log(`[AdContainer] Ad completed for ${placement}:`, result);
    setIsProcessing(true);
    
    // Track ad completion
    if (result.success) {
      analyticsService.trackEngagement('ad_completed', placement, result.watchTime);
      
      // Call the completion handler
      if (onAdCompleted) {
        onAdCompleted({
          success: true,
          reward: reward || {
            type: 'coins',
            amount: result.reward?.amount || 0
          }
        });
      }
    } else {
      analyticsService.trackEngagement('ad_failed', placement);
      if (onAdCompleted) {
        onAdCompleted({ success: false });
      }
    }
    
    setIsProcessing(false);
    setShowAdModal(false);
  }, [placement, reward, onAdCompleted]);

  const handleAdClosed = useCallback(() => {
    console.log(`[AdContainer] Ad modal closed for ${placement}`);
    setShowAdModal(false);
    setIsProcessing(false);
    
    if (onAdClosed) {
      onAdClosed();
    }
  }, [placement, onAdClosed]);

  return (
    <>
      {children({
        showAd,
        isAdShowing: showAdModal,
        canShowAd
      })}
      
      {showAdModal && (
        <EnhancedVideoAdModal
          isOpen={showAdModal}
          onClose={handleAdClosed}
          onComplete={handleAdCompleted}
          placement={placement}
          rewardAmount={reward?.amount || 30}
        />
      )}
    </>
  );
};

export default AdContainer;