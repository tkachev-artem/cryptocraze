import React, { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { 
  TutorialType, 
  selectActiveTutorial, 
  selectCurrentStep, 
  selectTutorialProgress, 
  selectIsModalOpen,
  nextStep,
  prevStep,
  skipTutorial,
  completeTutorial,
  handleTutorialEvent,
  startTutorial,
  setModalOpen
} from '../app/newTutorialSlice';
import { Modal } from './ui/modal';
import { useTranslation } from '@/lib/i18n';
import { analyticsService } from '../services/analyticsService';
import TradeTutorialSpotlight from './TradeTutorialSpotlight';
import TutorialConnectionLine from './TutorialConnectionLine';

interface UniversalTutorialProps {
  type: TutorialType;
  autoStart?: boolean;
  className?: string;
}

// Modal type configurations for different tutorial steps
const getModalConfig = (type: TutorialType, stepIndex: number) => {
  switch (type) {
    case 'main':
      return {
        modalType: 'standard' as const,
        backdropClass: 'bg-black/60',
        containerClass: 'items-center justify-center',
        contentClass: 'z-[90] bg-white rounded-2xl p-6 max-w-md w-full shadow-xl',
        hasSpotlight: false,
        hasConnectionLine: false,
      };
      
    case 'trade':
      if (stepIndex === 0) {
        return {
          modalType: 'standard' as const,
          backdropClass: 'bg-black/60',
          containerClass: 'items-center justify-center',
          contentClass: 'z-[90] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
          hasSpotlight: false,
          hasConnectionLine: false,
        };
      }
      // Step 9 (stepIndex = 8) - no Next button, wait for user action
      if (stepIndex === 8) {
        return {
          modalType: 'wait-for-action' as const,
          backdropClass: 'bg-transparent',
          containerClass: 'items-start justify-start',
          contentClass: 'z-[90] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
          hasSpotlight: true,
          hasConnectionLine: false,
        };
      }
      // Step 10 (stepIndex = 9) - dimmed background, no description, positioned at top
      if (stepIndex === 9) {
        return {
          modalType: 'standard' as const,
          backdropClass: 'bg-black/60',
          containerClass: 'items-start justify-center pt-20',
          contentClass: 'z-[90] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
          hasSpotlight: false,
          hasConnectionLine: false,
        };
      }
      // Step 11 (stepIndex = 10) - no Next button, wait for deal close and deal info
      if (stepIndex === 10) {
        return {
          modalType: 'wait-for-action' as const,
          backdropClass: 'bg-transparent',
          containerClass: 'items-start justify-start',
          contentClass: 'z-[90] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
          hasSpotlight: true,
          hasConnectionLine: false,
        };
      }
      // Step 12 (stepIndex = 11) - dimmed background, no description, positioned at top
      if (stepIndex === 11) {
        return {
          modalType: 'standard' as const,
          backdropClass: 'bg-black/60',
          containerClass: 'items-start justify-center pt-20',
          contentClass: 'z-[90] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
          hasSpotlight: false,
          hasConnectionLine: false,
        };
      }
      return {
        modalType: 'positioned' as const,
        backdropClass: 'bg-transparent',
        containerClass: 'items-start justify-start',
        contentClass: 'z-[90] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
        hasSpotlight: true,
        hasConnectionLine: false,
      };
      
    case 'pro':
      if (stepIndex === 0) {
        return {
          modalType: 'standard' as const,
          backdropClass: 'bg-black/60',
          containerClass: 'items-center justify-center',
          contentClass: 'z-[90] bg-white rounded-2xl p-6 max-w-md w-full shadow-xl',
          hasSpotlight: false,
          hasConnectionLine: false,
        };
      }
      
      // Button-only steps (stepIndex is 0-based, so step id 4 = stepIndex 3)
      if ([3, 6, 9, 12, 15, 18].includes(stepIndex)) {
        return {
          modalType: 'button-only' as const,
          backdropClass: 'bg-transparent',
          containerClass: 'items-start justify-center',
          contentClass: 'z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
          hasSpotlight: false,
          hasConnectionLine: false,
          containerStyle: { position: 'absolute', top: '12px', left: '14px' },
        };
      }
      
      // Final step (step id 20 = stepIndex 19)
      if (stepIndex === 19) {
        return {
          modalType: 'final' as const,
          backdropClass: 'bg-white',
          containerClass: 'items-center justify-center p-0',
          contentClass: 'z-[80] bg-white w-full h-full flex flex-col items-center justify-center relative overflow-hidden',
          hasSpotlight: false,
          hasConnectionLine: false,
        };
      }
      
      // Blue modal steps
      return {
        modalType: 'blue' as const,
        backdropClass: 'bg-transparent',
        containerClass: 'items-start justify-center',
        contentClass: 'z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
        hasSpotlight: true,
        hasConnectionLine: true,
        containerStyle: { position: 'absolute', top: '12px', left: '14px' },
      };
      
    default:
      return {
        modalType: 'standard' as const,
        backdropClass: 'bg-black/60',
        containerClass: 'items-center justify-center',
        contentClass: 'z-[90] bg-white rounded-2xl p-6 max-w-md w-full shadow-xl',
        hasSpotlight: false,
        hasConnectionLine: false,
      };
  }
};

export const UniversalTutorial: React.FC<UniversalTutorialProps> = ({ 
  type, 
  autoStart = false,
  className = '' 
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  
  const activeTutorial = useAppSelector(selectActiveTutorial);
  const currentStep = useAppSelector(selectCurrentStep);
  const progress = useAppSelector(selectTutorialProgress);
  const isModalOpen = useAppSelector(selectIsModalOpen);
  
  const contentRef = useRef<HTMLDivElement>(null);
  const eventListenersRef = useRef<Set<string>>(new Set());
  
  const isActive = activeTutorial === type;
  
  // Auto-start tutorial
  useEffect(() => {
    if (autoStart && !isActive) {
      const tutorialCompleted = localStorage.getItem(`${type}TutorialCompleted`) === 'true' ||
                               localStorage.getItem(`${type}TutorialSeen`) === 'true';
      
      if (!tutorialCompleted) {
        dispatch(startTutorial(type));
        analyticsService.trackTutorialProgress(`${type}_tutorial`, 'start');
        
        // Send detailed analytics for pro tutorial start
        if (type === 'pro') {
          analyticsService.trackEvent('pro_tutorial_started', {
            start_time: Date.now(),
            total_steps: 20, // Pro tutorial has 20 steps
            user_action: 'started_tutorial'
          });
        }
      }
    }
  }, [autoStart, type, isActive, dispatch]);

  // Handle tutorial events
  const handleEvent = useCallback((event: Event) => {
    if (isActive) {
      console.log(`[UniversalTutorial] Received event: ${event.type} for step:`, currentStep?.id, currentStep?.title);
      dispatch(handleTutorialEvent(event.type));
    }
  }, [isActive, dispatch, currentStep]);

  // Set up event listeners for current step
  useEffect(() => {
    if (!isActive || !currentStep) return;

    const { eventHandlers, autoTriggers } = currentStep;
    
    // Clear existing listeners
    eventListenersRef.current.forEach(eventName => {
      window.removeEventListener(eventName, handleEvent as EventListener);
    });
    eventListenersRef.current.clear();

    // Add event listeners for current step
    if (eventHandlers) {
      eventHandlers.forEach(eventName => {
        window.addEventListener(eventName, handleEvent as EventListener);
        eventListenersRef.current.add(eventName);
      });
    }

    // Trigger auto events
    if (autoTriggers) {
      autoTriggers.forEach(eventName => {
        console.log(`[UniversalTutorial] Auto-triggering event: ${eventName}`);
        setTimeout(() => {
          window.dispatchEvent(new Event(eventName));
        }, 100);
      });
    }

    return () => {
      // Cleanup on unmount or step change
      eventListenersRef.current.forEach(eventName => {
        window.removeEventListener(eventName, handleEvent as EventListener);
      });
      eventListenersRef.current.clear();
    };
  }, [isActive, currentStep, handleEvent]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    console.log('[UniversalTutorial] handleNext called with progress:', progress, 'isLast check:', progress.current === progress.total, 'currentStep:', currentStep?.id, 'type:', type);
    if (progress.current === progress.total) {
      console.log('[UniversalTutorial] Completing tutorial - final step reached');
      // Clear drawings when completing pro tutorial
      if (type === 'pro') {
        console.log('[UniversalTutorial] Pro tutorial completed, clearing drawings');
        window.dispatchEvent(new Event('pro:tutorial:clearDrawings'));
      }
      dispatch(completeTutorial());
      analyticsService.trackTutorialProgress(`${type}_tutorial`, 'complete');
      
      // Send detailed analytics for pro tutorial completion
      if (type === 'pro') {
        analyticsService.trackEvent('pro_tutorial_completed', {
          completion_time: Date.now(),
          total_steps: progress.total,
          user_action: 'finished_tutorial'
        });
      }
      
      // Send detailed analytics for trade tutorial completion
      if (type === 'trade') {
        analyticsService.trackEvent('trade_tutorial_completed', {
          completion_time: Date.now(),
          total_steps: progress.total,
          user_action: 'finished_tutorial'
        });
      }
    } else {
      console.log('[UniversalTutorial] Advancing to next step');
      dispatch(nextStep());
    }
  }, [dispatch, progress, type]);

  const handlePrevious = useCallback(() => {
    dispatch(prevStep());
  }, [dispatch]);

  const handleSkip = useCallback(() => {
    console.log('[UniversalTutorial] handleSkip called with progress:', progress, 'currentStep:', currentStep?.id);
    // Clear drawings when skipping pro tutorial
    if (type === 'pro') {
      console.log('[UniversalTutorial] Pro tutorial skipped, clearing drawings');
      window.dispatchEvent(new Event('pro:tutorial:clearDrawings'));
    }
    dispatch(skipTutorial());
    analyticsService.trackTutorialProgress(`${type}_tutorial`, 'skip');
    
    // Send detailed analytics for pro tutorial skip
    if (type === 'pro') {
      analyticsService.trackEvent('pro_tutorial_skipped', {
        skip_time: Date.now(),
        completed_steps: progress.current,
        total_steps: progress.total,
        completion_percentage: Math.round((progress.current / progress.total) * 100),
        user_action: 'skipped_tutorial'
      });
    }
    
    // Send detailed analytics for trade tutorial skip
    if (type === 'trade') {
      analyticsService.trackEvent('trade_tutorial_skipped', {
        skip_time: Date.now(),
        completed_steps: progress.current,
        total_steps: progress.total,
        completion_percentage: Math.round((progress.current / progress.total) * 100),
        user_action: 'skipped_tutorial'
      });
    }
  }, [dispatch, type]);

  const handleClose = useCallback(() => {
    dispatch(setModalOpen(false));
  }, [dispatch]);

  if (!isActive || !currentStep || !isModalOpen) {
    return null;
  }

  const modalConfig = getModalConfig(type, progress.current - 1);
  const isFirst = progress.current === 1;
  const isLast = progress.current === progress.total;

  // Calculate modal position based on target element
  const getModalPosition = () => {
    if (!currentStep?.targetSelector || modalConfig.modalType !== 'positioned') {
      return { position: 'fixed', top: '12px', left: '14px' };
    }

    try {
      const element = document.querySelector(currentStep.targetSelector);
      if (!element) {
        return { position: 'fixed', top: '12px', left: '14px' };
      }

      const rect = element.getBoundingClientRect();
      const modalWidth = 300; // approximate modal width
      const modalHeight = 150; // approximate modal height
      const padding = 16;
      
      // Always center all positioned modals horizontally on screen using transform
      const centerLeft = '50%';
      const transform = 'translateX(-50%)';

      // For order creation step (step 6), position higher up to avoid overlapping with deal modal
      if (currentStep?.targetSelector?.includes('deal-amount') || currentStep?.targetSelector?.includes('deal-multiplier')) {
        return {
          position: 'fixed',
          top: '20px', // Fixed position with minimal top offset
          left: centerLeft,
          transform: transform
        };
      }

      // For deal-take-profit/stop-loss (step 7), position higher up
      if (currentStep?.targetSelector?.includes('deal-take-profit') || currentStep?.targetSelector?.includes('deal-stop-loss')) {
        return {
          position: 'fixed',
          top: '20px', // Fixed position with minimal top offset
          left: centerLeft,
          transform: transform
        };
      }

      // For deal-direction-toggle (step 8), position at top
      if (currentStep?.targetSelector?.includes('deal-direction-toggle')) {
        return {
          position: 'fixed',
          top: '20px', // Fixed position with minimal top offset
          left: centerLeft,
          transform: transform
        };
      }

      // For deal-volume-buy (step 9), position at top
      if (currentStep?.targetSelector?.includes('deal-volume-buy')) {
        return {
          position: 'fixed',
          top: '20px', // Fixed position with minimal top offset
          left: centerLeft,
          transform: transform
        };
      }

      // For edit-deal-close (step 11), position at top
      if (currentStep?.targetSelector?.includes('edit-deal-close')) {
        return {
          position: 'fixed',
          top: '20px', // Fixed position with minimal top offset
          left: centerLeft,
          transform: transform
        };
      }

      // Try to position below the element first
      if (rect.bottom + modalHeight + padding < window.innerHeight) {
        return {
          position: 'fixed',
          top: `${rect.bottom + padding}px`,
          left: centerLeft,
          transform: transform
        };
      }
      // Position above the element
      else if (rect.top - modalHeight - padding > 0) {
        return {
          position: 'fixed',
          top: `${rect.top - modalHeight - padding}px`,
          left: centerLeft,
          transform: transform
        };
      }
      // Fallback to center screen
      else {
        return { 
          position: 'fixed', 
          top: '50%', 
          left: centerLeft,
          transform: 'translate(-50%, -50%)'
        };
      }
    } catch {
      return { position: 'fixed', top: '12px', left: '14px' };
    }
  };

  return (
    <>
      {/* Spotlight */}
      {modalConfig.hasSpotlight && currentStep.targetSelector && (
        <TradeTutorialSpotlight
          targetSelector={currentStep.targetSelector}
          active={true}
          zIndex={75}
          dimOpacity={0.15}
          forceDim={false}
          paddingPx={8}
          paddingVertical={(currentStep.targetSelector.includes('deal-amount') || currentStep.targetSelector.includes('deal-multiplier')) ? 14 : 
                            (currentStep.targetSelector.includes('deal-take-profit') || currentStep.targetSelector.includes('deal-stop-loss')) ? 10 : undefined}
        />
      )}

      {/* Connection Line */}
      {modalConfig.hasConnectionLine && currentStep.targetSelector && (
        <TutorialConnectionLine
          targetSelector={currentStep.targetSelector}
          modalRef={contentRef}
          zIndex={74}
        />
      )}

      {/* Modal */}
      <Modal
        isOpen={true}
        onClose={handleClose}
        zIndexClass="z-[90]"
        backdropClassName={modalConfig.backdropClass}
        hideClose={true}
        disableBackdropClose={true}
        containerClassName={modalConfig.containerClass}
        containerStyle={modalConfig.containerStyle}
        contentRef={contentRef}
        contentClassName={modalConfig.contentClass}
        contentStyle={modalConfig.modalType === 'positioned' ? getModalPosition() : undefined}
      >
        {renderModalContent({
          type,
          currentStep,
          progress,
          isFirst,
          isLast,
          modalConfig,
          onNext: handleNext,
          onPrevious: handlePrevious,
          onSkip: handleSkip,
          t
        })}
      </Modal>
    </>
  );
};

// Render different modal content based on type
const renderModalContent = ({
  type,
  currentStep,
  progress,
  isFirst,
  isLast,
  modalConfig,
  onNext,
  onPrevious,
  onSkip,
  t
}: {
  type: TutorialType;
  currentStep: any;
  progress: any;
  isFirst: boolean;
  isLast: boolean;
  modalConfig: any;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  t: (key: string, params?: any) => string;
}) => {
  const title = t(currentStep.title);
  const description = currentStep.description ? t(currentStep.description) : '';
  
  switch (modalConfig.modalType) {
    case 'standard':
      return (
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="tutorial-title">
          {currentStep.imageSrc && (
            <div className="w-full flex justify-center pt-1">
              <img src={currentStep.imageSrc} alt="Tutorial" className="max-w-[228px] w-full h-auto" />
            </div>
          )}
          
          <h2 id="tutorial-title" tabIndex={0} className="text-base font-bold text-black outline-none text-center">
            {title}
          </h2>
          
          {description && (
            <p className="text-sm text-gray-700 text-center">
              {description}
            </p>
          )}

          {isFirst ? (
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={onNext}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C54EA] text-white"
              >
                {type === 'trade' ? t('tradeTutorial.start') : t('common.next')}
              </button>
              <button
                onClick={onSkip}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
              >
                {t('common.cancel')}
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={onSkip}
                className="py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
              >
                {t('common.close')}
              </button>
              <button
                onClick={onNext}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C54EA] text-white"
              >
                {isLast ? t('common.finish') : t('common.next')}
              </button>
            </div>
          )}
        </div>
      );

    case 'blue':
      return (
        <div className="flex flex-col gap-3" role="dialog">
          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(progress.total, 20) }, (_, index) => (
                <div
                  key={index}
                  className={`w-2 h-1 rounded-full ${
                    index < progress.current ? 'bg-white' : 'border border-white'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <h2 className="text-base font-bold text-white text-left">
                {title}
              </h2>
              {description && (
                <p className="text-base font-bold text-white text-left">
                  {description}
                </p>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
                <img 
                  src="/protraining/training.svg" 
                  alt="Training" 
                  className="w-5 h-5" 
                />
              </div>
            </div>
          </div>
        </div>
      );

    case 'button-only':
      return (
        <div className="flex flex-col gap-3" role="dialog">
          {/* Progress dots */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {Array.from({ length: Math.min(progress.total, 20) }, (_, index) => (
                <div
                  key={index}
                  className={`w-2 h-1 rounded-full ${
                    index < progress.current ? 'bg-white' : 'border border-white'
                  }`}
                />
              ))}
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
            >
              ×
            </button>
          </div>
          
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                console.log('Button clicked, currentStep:', currentStep);
                
                // For nextTask steps after indicators work, reset indicators before proceeding
                if (currentStep.title === 'proTutorial.nextTask' && currentStep.id && [4, 7, 10].includes(currentStep.id as number)) {
                  console.log('Resetting indicators before next step');
                  window.dispatchEvent(new Event('pro:tutorial:resetIndicators'));
                }
                
                // For button-only modals, just call onNext() directly
                console.log('Calling onNext() for button-only modal');
                onNext();
              }}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
            >
              {isLast ? t('proTutorial.completeTask') : t('proTutorial.nextTask')}
            </button>
            <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <img 
                src="/protraining/training.svg" 
                alt="Training" 
                className="w-5 h-5" 
              />
            </div>
          </div>
        </div>
      );

    case 'final':
      return (
        <div className="relative z-10 flex flex-col items-center justify-center gap-8 text-center px-6 py-12 max-w-md mx-auto h-full">
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <img 
                src="/protraining/bear.svg" 
                alt="Bear character" 
                className="w-[210px] h-[268px]" 
              />
            </div>
            <h1 className="text-2xl font-bold text-black leading-tight">
              {title}
            </h1>
            <p className="text-base text-black leading-relaxed max-w-sm">
              {description}
            </p>
          </div>
          <div className="w-full pb-8">
            <button
              onClick={onNext}
              className="w-full px-6 py-2.5 rounded-[100px] text-lg font-semibold bg-[#0C54EA] text-white border-2 border-[#0C54EA] hover:bg-[#0A4BD8] transition-colors"
            >
              {t('proTutorial.startTrading')}
            </button>
          </div>
        </div>
      );

    case 'positioned':
      return (
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="tutorial-title">
          {currentStep.imageSrc && (
            <div className="w-full flex justify-center pt-1">
              <img src={currentStep.imageSrc} alt="Tutorial" className="max-w-[228px] w-full h-auto" />
            </div>
          )}
          
          <h2 id="tutorial-title" tabIndex={0} className="text-base font-bold text-black outline-none text-left">
            {title}
          </h2>
          
          {description && (
            <p className="text-sm text-gray-700 text-left">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onSkip}
              className="py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
            >
              {t('common.close')}
            </button>
            <button
              onClick={() => {
                console.log('[UniversalTutorial] Positioned modal next button clicked, calling onNext');
                onNext();
              }}
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C54EA] text-white"
            >
              {isLast ? t('common.finish') : t('common.next')}
            </button>
          </div>
        </div>
      );

    case 'wait-for-action':
      return (
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="tutorial-title">
          {currentStep.imageSrc && (
            <div className="w-full flex justify-center pt-1">
              <img src={currentStep.imageSrc} alt="Tutorial" className="max-w-[228px] w-full h-auto" />
            </div>
          )}
          
          <h2 id="tutorial-title" tabIndex={0} className="text-base font-bold text-black outline-none text-left">
            {title}
          </h2>
          
          {description && (
            <p className="text-sm text-gray-700 text-left">
              {description}
            </p>
          )}

          <div className="flex items-center justify-between pt-2">
            <button
              onClick={onSkip}
              className="py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
            >
              {t('common.close')}
            </button>
            {/* No Next button - waiting for user action */}
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default UniversalTutorial;