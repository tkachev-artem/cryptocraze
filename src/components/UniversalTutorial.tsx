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
      // Different modal styles for different trade tutorial steps
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
      return {
        modalType: 'positioned' as const,
        backdropClass: 'bg-transparent',
        containerClass: 'items-start justify-center',
        contentClass: 'z-[80] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-sm shadow-xl',
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
      
      // Button-only steps
      if ([4, 7, 10, 13, 16, 19].includes(stepIndex)) {
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
      
      // Final step
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
      }
    }
  }, [autoStart, type, isActive, dispatch]);

  // Handle tutorial events
  const handleEvent = useCallback((event: Event) => {
    if (isActive) {
      dispatch(handleTutorialEvent(event.type));
    }
  }, [isActive, dispatch]);

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
    if (progress.current === progress.total) {
      dispatch(completeTutorial());
      analyticsService.trackTutorialProgress(`${type}_tutorial`, 'complete');
    } else {
      dispatch(nextStep());
    }
  }, [dispatch, progress, type]);

  const handlePrevious = useCallback(() => {
    dispatch(prevStep());
  }, [dispatch]);

  const handleSkip = useCallback(() => {
    dispatch(skipTutorial());
    analyticsService.trackTutorialProgress(`${type}_tutorial`, 'skip');
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
        contentStyle={modalConfig.modalType === 'positioned' ? {
          position: 'fixed',
          top: '12px',
          left: '14px',
        } : undefined}
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
              onClick={onNext}
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
              onClick={onSkip}
              className="w-full px-6 py-2.5 rounded-[100px] text-lg font-semibold bg-[#0C54EA] text-white border-2 border-[#0C54EA] hover:bg-[#0A4BD8] transition-colors"
            >
              {t('proTutorial.startTrading')}
            </button>
          </div>
        </div>
      );

    default:
      return null;
  }
};

export default UniversalTutorial;