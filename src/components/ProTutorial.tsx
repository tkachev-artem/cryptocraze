import type React from 'react';
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/lib/i18n';
import TradeTutorialSpotlight from './TradeTutorialSpotlight';
import TutorialConnectionLine from './TutorialConnectionLine';
import { 
  tutorialLogger, 
  CleanupManager, 
  focusElement,
  dispatchTutorialEvent 
} from '../lib/tutorialUtils';
import { TUTORIAL_CONFIG } from '../types/tutorial';
import type { BaseTutorialStep } from '../types/tutorial';

/**
 * ProTutorial - Enhanced component for Pro functionality tutorial
 * 
 * Features:
 * - Proper state machine instead of excessive boolean flags
 * - Configuration-driven step logic
 * - Comprehensive cleanup management
 * - Production-ready logging
 * - Memory leak prevention
 */

type ProTutorialProps = {
  isOpen: boolean;
  currentStep: number;
  onProceed: () => void;
  onSkip: () => void;
  onPrev?: () => void;
};

// Pro tutorial step state machine
type ProTutorialStepState = 'pending' | 'active' | 'completed' | 'error';

// Step configuration interface
interface ProStepConfig {
  id: number;
  hasSpotlight: boolean;
  targetSelector?: string;
  hasConnectionLine: boolean;
  modalType: 'standard' | 'blue' | 'button-only' | 'final';
  autoTriggers?: string[];
  eventHandlers?: string[];
  progressDots: number;
  filledDots: number;
}

// Pro tutorial step
interface ProTutorialStep extends BaseTutorialStep {
  config: ProStepConfig;
}

// Step configurations - centralized and maintainable
const PRO_STEP_CONFIGS: Record<number, ProStepConfig> = {
  1: {
    id: 1,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'standard',
    progressDots: 6,
    filledDots: 0,
  },
  2: {
    id: 2,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="fx-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    eventHandlers: ['pro:tutorial:fxClicked'],
    progressDots: 6,
    filledDots: 1,
  },
  3: {
    id: 3,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="ema-indicator"]',
    hasConnectionLine: true,
    modalType: 'blue',
    autoTriggers: ['pro:tutorial:openFxModal'],
    eventHandlers: ['pro:tutorial:emaToggled'],
    progressDots: 6,
    filledDots: 2,
  },
  4: {
    id: 4,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'button-only',
    progressDots: 6,
    filledDots: 3,
  },
  5: {
    id: 5,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="fx-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    eventHandlers: ['pro:tutorial:fxClicked'],
    progressDots: 6,
    filledDots: 4,
  },
  6: {
    id: 6,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="rsi-indicator"]',
    hasConnectionLine: true,
    modalType: 'blue',
    autoTriggers: ['pro:tutorial:openIndicatorsModal'],
    eventHandlers: ['pro:tutorial:rsiToggled'],
    progressDots: 6,
    filledDots: 5,
  },
  7: {
    id: 7,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'button-only',
    progressDots: 6,
    filledDots: 6,
  },
  8: {
    id: 8,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="fx-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    eventHandlers: ['pro:tutorial:fxClicked'],
    progressDots: 7,
    filledDots: 6,
  },
  9: {
    id: 9,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="sma-indicator"]',
    hasConnectionLine: true,
    modalType: 'blue',
    autoTriggers: ['pro:tutorial:openIndicatorsModal'],
    eventHandlers: ['pro:tutorial:smaToggled'],
    progressDots: 8,
    filledDots: 7,
  },
  10: {
    id: 10,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'button-only',
    autoTriggers: ['pro:tutorial:closeIndicatorsModal'],
    progressDots: 8,
    filledDots: 8,
  },
  11: {
    id: 11,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="marker-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    eventHandlers: ['pro:tutorial:markerClicked'],
    progressDots: 9,
    filledDots: 8,
  },
  12: {
    id: 12,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="line-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    autoTriggers: ['pro:tutorial:openMarkerModal'],
    eventHandlers: ['pro:tutorial:lineDrawn'],
    progressDots: 10,
    filledDots: 9,
  },
  13: {
    id: 13,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'button-only',
    progressDots: 11,
    filledDots: 10,
  },
  14: {
    id: 14,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="marker-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    eventHandlers: ['pro:tutorial:markerClicked'],
    progressDots: 12,
    filledDots: 11,
  },
  15: {
    id: 15,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="areas-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    autoTriggers: ['pro:tutorial:openMarkerModal'],
    eventHandlers: ['pro:tutorial:areasClicked'],
    progressDots: 13,
    filledDots: 12,
  },
  16: {
    id: 16,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'button-only',
    eventHandlers: ['pro:tutorial:areaDrawn'],
    progressDots: 14,
    filledDots: 13,
  },
  17: {
    id: 17,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="marker-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    eventHandlers: ['pro:tutorial:markerClicked'],
    progressDots: 15,
    filledDots: 14,
  },
  18: {
    id: 18,
    hasSpotlight: true,
    targetSelector: '[data-tutorial-target="arrow-element"]',
    hasConnectionLine: true,
    modalType: 'blue',
    autoTriggers: ['pro:tutorial:openMarkerModal'],
    eventHandlers: ['pro:tutorial:arrowDrawn', 'pro:tutorial:arrowClicked'],
    progressDots: 16,
    filledDots: 15,
  },
  19: {
    id: 19,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'button-only',
    progressDots: 17,
    filledDots: 16,
  },
  20: {
    id: 20,
    hasSpotlight: false,
    hasConnectionLine: false,
    modalType: 'final',
    progressDots: 18,
    filledDots: 17,
  },
};

const ProTutorial: React.FC<ProTutorialProps> = ({ 
  isOpen, 
  currentStep, 
  onProceed, 
  onSkip 
}) => {
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const cleanupManagerRef = useRef<CleanupManager | null>(null);
  const [stepState, setStepState] = useState<ProTutorialStepState>('pending');
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [contentStyle, setContentStyle] = useState<React.CSSProperties | undefined>(undefined);

  // Initialize cleanup manager
  useEffect(() => {
    cleanupManagerRef.current = new CleanupManager();
    return () => {
      cleanupManagerRef.current?.cleanup();
      tutorialLogger.debug('ProTutorial cleanup completed');
    };
  }, []);

  // Get current step configuration
  const stepConfig = useMemo(() => {
    const config = PRO_STEP_CONFIGS[currentStep];
    if (!config) {
      tutorialLogger.warn('No configuration found for step', { currentStep });
      return null;
    }
    return config;
  }, [currentStep]);

  // Generate tutorial step
  const currentTutorialStep = useMemo((): ProTutorialStep | null => {
    if (!stepConfig) return null;

    return {
      id: currentStep,
      title: getStepTitle(currentStep, t),
      description: getStepDescription(currentStep, t),
      state: stepState,
      config: stepConfig,
    };
  }, [currentStep, stepConfig, stepState, t]);

  // Positioning calculation for special steps
  const calculatePositioning = useCallback(() => {
    if (!stepConfig) return;

    const needsFixedPositioning = [2, 5, 6, 8, 11, 12, 14].includes(currentStep);
    
    if (needsFixedPositioning) {
      setContainerStyle(undefined);
      setContentStyle({ 
        position: 'absolute', 
        top: `${TUTORIAL_CONFIG.POSITIONING.TOP_MARGIN}px`, 
        left: `${TUTORIAL_CONFIG.POSITIONING.LEFT_MARGIN}px` 
      });
    } else {
      setContainerStyle(undefined);
      setContentStyle(undefined);
    }
  }, [stepConfig, currentStep]);

  // Setup positioning with cleanup
  useEffect(() => {
    if (!cleanupManagerRef.current) return;

    calculatePositioning();
    
    // Recalculate on resize/scroll
    const debouncedRecalc = () => calculatePositioning();
    cleanupManagerRef.current.addEventListener(window, 'resize', debouncedRecalc);
    cleanupManagerRef.current.addEventListener(window, 'scroll', debouncedRecalc, { passive: true });
  }, [calculatePositioning]);

  // Focus management
  useEffect(() => {
    if (isOpen) {
      setStepState('active');
      focusElement('pro-tutorial-title');
    } else {
      setStepState('pending');
    }
  }, [currentStep, isOpen]);

  // Auto-triggers and event handlers
  useEffect(() => {
    if (!cleanupManagerRef.current || !stepConfig || !isOpen) return;

    setStepState('active');

    // Handle auto-triggers
    if (stepConfig.autoTriggers) {
      stepConfig.autoTriggers.forEach(trigger => {
        dispatchTutorialEvent(trigger);
        tutorialLogger.debug('Auto-triggered event', { trigger, currentStep });
      });
    }

    // Setup event handlers with proper validation
    if (stepConfig.eventHandlers) {
      stepConfig.eventHandlers.forEach(eventName => {
        const handler = (event: Event) => {
          tutorialLogger.debug('Tutorial event received', { eventName, currentStep });
          
          // Only proceed if this is the expected event for the current step
          const currentConfig = PRO_STEP_CONFIGS[currentStep];
          if (currentConfig?.eventHandlers?.includes(eventName)) {
            tutorialLogger.debug('Event validated and accepted for current step', { eventName, currentStep });
            onProceed();
          } else {
            tutorialLogger.debug('Event ignored - not for current step', { 
              eventName, 
              currentStep, 
              expectedEvents: currentConfig?.eventHandlers || [] 
            });
          }
        };
        
        cleanupManagerRef.current!.addEventListener(window as any, eventName as any, handler as any);
      });
    }

    // Also listen to all possible tutorial events to filter them properly
    const allPossibleEvents = [
      'pro:tutorial:emaToggled',
      'pro:tutorial:rsiToggled', 
      'pro:tutorial:smaToggled',
      'pro:tutorial:fxClicked',
      'pro:tutorial:markerClicked',
      'pro:tutorial:lineDrawn',
      'pro:tutorial:areasClicked',
      'pro:tutorial:arrowDrawn',
      'pro:tutorial:arrowClicked'
    ];

    allPossibleEvents.forEach(eventName => {
      // Only add listener if it's not already in stepConfig.eventHandlers
      if (!stepConfig.eventHandlers?.includes(eventName)) {
        const handler = (event: Event) => {
          const currentConfig = PRO_STEP_CONFIGS[currentStep];
          if (currentConfig?.eventHandlers?.includes(eventName)) {
            tutorialLogger.debug('Global event validated for current step', { eventName, currentStep });
            onProceed();
          } else {
            tutorialLogger.debug('Global event ignored - not for current step', { 
              eventName, 
              currentStep, 
              expectedEvents: currentConfig?.eventHandlers || [] 
            });
          }
        };
        
        cleanupManagerRef.current!.addEventListener(window as any, eventName as any, handler as any);
      }
    });
  }, [stepConfig, currentStep, isOpen, onProceed]);

  // Error boundary
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      tutorialLogger.error('ProTutorial runtime error', event.error, { currentStep });
      setStepState('error');
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, [currentStep]);

  if (!isOpen || !stepConfig || !currentTutorialStep) {
    return null;
  }

  // Error state
  if (stepState === 'error') {
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass={`z-[${TUTORIAL_CONFIG.Z_INDEX.MODAL}]`}
        backdropClassName="bg-red-50/80"
        hideClose={false}
        containerClassName="items-center justify-center"
      >
        <div className="bg-white rounded-2xl p-6 max-w-sm mx-auto">
          <h2 className="text-lg font-bold text-red-600 mb-4">{t('tutorial.error.title') || 'Tutorial Error'}</h2>
          <p className="text-gray-700 mb-4">
            {t('tutorial.error.message') || 'An error occurred in the tutorial. Please restart or skip.'}
          </p>
          <div className="flex gap-2">
            <button onClick={() => window.location.reload()} className="px-4 py-2 bg-blue-600 text-white rounded">
              {t('tutorial.error.restart') || 'Restart'}
            </button>
            <button onClick={onSkip} className="px-4 py-2 bg-gray-400 text-white rounded">
              {t('tutorial.error.skip') || 'Skip'}
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <>
      {/* Spotlight component */}
      {stepConfig.hasSpotlight && stepConfig.targetSelector && (
        <TradeTutorialSpotlight 
          targetSelector={stepConfig.targetSelector} 
          active={true} 
          zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
          dimOpacity={0.15} 
          forceDim={false}
          paddingPx={stepConfig.id === 18 ? 4 : undefined}
        />
      )}
      
      {/* Connection line */}
      {stepConfig.hasConnectionLine && stepConfig.targetSelector && (
        <TutorialConnectionLine 
          targetSelector={stepConfig.targetSelector}
          modalRef={contentRef as React.RefObject<HTMLDivElement | null>}
          zIndex={TUTORIAL_CONFIG.Z_INDEX.CONNECTION_LINE}
        />
      )}
      
      {/* Main modal */}
      {renderModalForStepType(
        stepConfig,
        currentTutorialStep,
        contentRef,
        containerStyle,
        contentStyle,
        onProceed,
        onSkip,
        t
      )}
    </>
  );
};

// Helper functions for step content
function getStepTitle(step: number, t: ReturnType<typeof useTranslation>['t']): string {
  switch (step) {
    case 1: return t('proTutorial.title');
    case 2: case 3: return t('proTutorial.applyEMA');
    case 5: case 6: return t('proTutorial.applyIndicator');
    case 8: case 9: return t('proTutorial.applyEMA');
    case 11: case 12: return t('proTutorial.addLine');
    case 14: case 15: return t('markers.tools.area');
    case 16: return t('markers.tutorial.drawArea');
    case 17: case 18: return t('markers.tutorial.addArrow');
    case 20: return t('proTutorial.excellent');
    default: return t('proTutorial.nextTask');
  }
}

function getStepDescription(step: number, t: ReturnType<typeof useTranslation>['t']): string {
  switch (step) {
    case 1: return t('proTutorial.desc');
    case 2: case 3: return t('proTutorial.movingAverages');
    case 5: case 6: return t('proTutorial.rsiIndicator');
    case 8: case 9: return t('proTutorial.smaAverages');
    case 20: return `${t('proTutorial.timeToPractice')}\n${t('proTutorial.tradeCompete')}`;
    default: return '';
  }
}

// Render modal based on step type
function renderModalForStepType(
  stepConfig: ProStepConfig,
  step: ProTutorialStep,
  contentRef: React.RefObject<HTMLDivElement>,
  containerStyle: React.CSSProperties | undefined,
  contentStyle: React.CSSProperties | undefined,
  onProceed: () => void,
  onSkip: () => void,
  t: ReturnType<typeof useTranslation>['t']
) {
  const commonModalProps = {
    isOpen: true,
    onClose: onSkip,
    zIndexClass: `z-[${TUTORIAL_CONFIG.Z_INDEX.MODAL}]`,
    hideClose: true,
    disableBackdropClose: true,
  };

  switch (stepConfig.modalType) {
    case 'standard':
      return (
        <Modal
          {...commonModalProps}
          backdropClassName="bg-black/60"
          containerClassName="items-center justify-center"
        >
          <StandardModalContent step={step} onProceed={onProceed} onSkip={onSkip} t={t} />
        </Modal>
      );

    case 'blue':
      return (
        <Modal
          {...commonModalProps}
          backdropClassName="bg-transparent"
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef as React.RefObject<HTMLDivElement>}
          contentClassName={`z-[${TUTORIAL_CONFIG.Z_INDEX.CONTENT}] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm`}
          contentStyle={contentStyle}
        >
          <BlueModalContent step={step} onSkip={onSkip} t={t} />
        </Modal>
      );

    case 'button-only':
      return (
        <Modal
          {...commonModalProps}
          backdropClassName="bg-transparent"
          containerClassName="items-start justify-center"
          contentClassName={`z-[${TUTORIAL_CONFIG.Z_INDEX.CONTENT}] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm`}
          contentStyle={{ position: 'absolute', top: '12px', left: '14px' }}
        >
          <ButtonOnlyModalContent step={step} onProceed={onProceed} onSkip={onSkip} t={t} />
        </Modal>
      );

    case 'final':
      return (
        <Modal
          {...commonModalProps}
          backdropClassName="bg-white"
          containerClassName="items-center justify-center p-0"
          contentClassName={`z-[${TUTORIAL_CONFIG.Z_INDEX.CONTENT}] bg-white w-full h-full flex flex-col items-center justify-center relative overflow-hidden`}
        >
          <FinalModalContent onSkip={onSkip} t={t} />
        </Modal>
      );

    default:
      tutorialLogger.error('Unknown modal type', undefined, { modalType: stepConfig.modalType });
      return null;
  }
}

// Modal content components
const StandardModalContent: React.FC<{
  step: ProTutorialStep;
  onProceed: () => void;
  onSkip: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}> = ({ step, onProceed, onSkip, t }) => (
  <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
    <div className="w-full flex justify-center pt-1">
      <img src="/pro-menu/pro-bear.svg" alt="Pro tutorial" className="max-w-[228px] w-full h-auto" />
    </div>
    <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-black outline-none text-center">
      {step.title}
    </h2>
    <p id="pro-tutorial-desc" className="text-sm text-gray-700 text-center">
      {step.description}
    </p>
    <div className="flex flex-col gap-2 pt-2">
      <button
        onClick={onProceed}
        className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C54EA] text-white"
        aria-label={t('proTutorial.proceed')}
      >
        {t('proTutorial.proceed')}
      </button>
      <button
        onClick={onSkip}
        className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
        aria-label={t('proTutorial.skip')}
      >
        {t('proTutorial.skip')}
      </button>
    </div>
  </div>
);

const BlueModalContent: React.FC<{
  step: ProTutorialStep;
  onSkip: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}> = ({ step, onSkip, t }) => (
  <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
    <ProgressIndicator config={step.config} onSkip={onSkip} t={t} />
    <div className="flex items-start gap-3">
      <div className="flex-1">
        <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
          {step.title}
        </h2>
        <p className="text-base font-bold text-white text-left">
          {step.description}
        </p>
      </div>
      <div className="flex-shrink-0">
        <div className="w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
          <img 
            src="/protraining/training.svg" 
            alt={t('proTutorial.training')} 
            className="w-5 h-5" 
          />
        </div>
      </div>
    </div>
  </div>
);

const ButtonOnlyModalContent: React.FC<{
  step: ProTutorialStep;
  onProceed: () => void;
  onSkip: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}> = ({ step, onProceed, onSkip, t }) => (
  <div className="flex flex-col gap-3" role="dialog">
    <ProgressIndicator config={step.config} onSkip={onSkip} t={t} />
    <div className="flex items-center justify-between">
      <button
        onClick={onProceed}
        className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
        aria-label={step.config.id === 19 ? t('proTutorial.completeTask') : t('proTutorial.nextTask')}
      >
        {step.config.id === 19 ? t('proTutorial.completeTask') : t('proTutorial.nextTask')}
      </button>
      <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
        <img 
          src="/protraining/training.svg" 
          alt={t('proTutorial.training')} 
          className="w-5 h-5" 
        />
      </div>
    </div>
  </div>
);

const FinalModalContent: React.FC<{
  onSkip: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}> = ({ onSkip, t }) => (
  <div className="relative z-10 flex flex-col items-center justify-center gap-8 text-center px-6 py-12 max-w-md mx-auto h-full">
    <div className="flex-1 flex flex-col items-center justify-center gap-6">
      <div className="relative">
        <img 
          src="/protraining/bear.svg" 
          alt={t('tutorial.bearCharacter') || 'Bear character'} 
          className="w-[210px] h-[268px]" 
        />
      </div>
      <h1 className="text-2xl font-bold text-black leading-tight">
        {t('proTutorial.excellent')}
      </h1>
      <p className="text-base text-black leading-relaxed max-w-sm">
        {t('proTutorial.timeToPractice')}<br />
        {t('proTutorial.tradeCompete')}<br />
        {t('proTutorial.skills') || 'свои навыки.'}
      </p>
    </div>
    <div className="w-full pb-8">
      <button
        onClick={onSkip}
        className="w-full px-6 py-2.5 rounded-[100px] text-lg font-semibold bg-[#0C54EA] text-white border-2 border-[#0C54EA] hover:bg-[#0A4BD8] transition-colors"
        aria-label={t('proTutorial.startTrading')}
      >
        {t('proTutorial.startTrading')}
      </button>
    </div>
  </div>
);

const ProgressIndicator: React.FC<{
  config: ProStepConfig;
  onSkip: () => void;
  t: ReturnType<typeof useTranslation>['t'];
}> = ({ config, onSkip, t }) => (
  <div className="flex items-center justify-between">
    <div className="flex gap-1">
      {Array.from({ length: config.progressDots }, (_, index) => (
        <div
          key={index}
          className={`w-2 h-1 rounded-full ${
            index < config.filledDots ? 'bg-white' : 'border border-white'
          }`}
        />
      ))}
    </div>
    <button
      onClick={onSkip}
      className="text-white text-lg font-bold"
      aria-label={t('proTutorial.close')}
    >
      ×
    </button>
  </div>
);

export default ProTutorial;