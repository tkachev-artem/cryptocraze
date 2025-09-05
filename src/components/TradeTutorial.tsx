import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Modal } from './ui/modal';
import { useAppDispatch } from '../app/hooks';
import {
  completeTradeTutorial,
  nextTradeTutorialStep,
  prevTradeTutorialStep,
  skipTradeTutorial,
  goToTradeTutorialStep,
} from '../app/tutorialSlice';
import TradeTutorialSpotlight from './TradeTutorialSpotlight';
import { useTranslation } from '@/lib/i18n';
import { 
  tutorialLogger, 
  CleanupManager, 
  calculateModalPosition,
  createPositioningRecalculator,
  validateTutorialStep,
  focusElement,
  dispatchTutorialEvent
} from '../lib/tutorialUtils';
import { analyticsService } from '../services/analyticsService';
import { TUTORIAL_CONFIG } from '../types/tutorial';
import type { BaseTutorialStep, TutorialPlacement, PositioningResult } from '../types/tutorial';

// Tutorial step configuration
interface TradeTutorialStepConfig {
  selector: string;
  placement: TutorialPlacement;
  gap: number;
}

// Trade tutorial step extends base step
interface TradeTutorialStep extends BaseTutorialStep {
  cta?: string;
  hint?: string;
  imageSrc?: string;
}

type TradeTutorialProps = {
  isActive: boolean;
  stepIndex: number;
};

// Step configuration mapping
const STEP_CONFIGS: Record<number, TradeTutorialStepConfig> = {
  1: { selector: '[data-tutorial-target="wallet-total"], [data-tutorial-target="wallet-free"]', placement: 'below', gap: 16 },
  2: { selector: '[data-tutorial-target="pair-selector"]', placement: 'below', gap: 16 },
  3: { selector: '[data-tutorial-target="chart-area"]', placement: 'auto', gap: 16 },
  4: { selector: '[data-tutorial-target="timeframe-selector"], [data-tutorial-target="chart-type-selector"]', placement: 'below', gap: 16 },
  5: { selector: '[data-tutorial-target="crypto-info"]', placement: 'above', gap: 74 },
  6: { selector: '[data-tutorial-target="sell-button"], [data-tutorial-target="buy-button"]', placement: 'above', gap: -8 },
};

// Special positioning steps that use fixed top positioning
const FIXED_POSITIONING_STEPS = [5, 6, 8];

// Generate tutorial steps with proper validation
const useTradeTutorialSteps = (): TradeTutorialStep[] => {
  const { t } = useTranslation();
  
  return useMemo(() => {
    const steps: TradeTutorialStep[] = [
      {
        id: 1,
        title: t('tradeTutorial.steps.1.title'),
        description: t('tradeTutorial.steps.1.description'),
        cta: t('tradeTutorial.start'),
        imageSrc: '/tutorial/bear-1.svg',
        state: 'pending',
      },
      { id: 2, title: t('tradeTutorial.steps.2.title'), description: t('tradeTutorial.steps.2.description'), hint: '', state: 'pending' },
      { id: 3, title: t('tradeTutorial.steps.3.title'), description: t('tradeTutorial.steps.3.description'), hint: '', state: 'pending' },
      { id: 4, title: t('tradeTutorial.steps.4.title'), description: t('tradeTutorial.steps.4.description'), hint: '', state: 'pending' },
      { id: 5, title: t('tradeTutorial.steps.5.title'), description: t('tradeTutorial.steps.5.description'), hint: '', state: 'pending' },
      { id: 6, title: t('tradeTutorial.steps.6.title'), description: t('tradeTutorial.steps.6.description'), hint: '', state: 'pending' },
      { id: 7, title: t('tradeTutorial.steps.7.title'), description: t('tradeTutorial.steps.7.description'), hint: '', state: 'pending' },
      { id: 8, title: t('tradeTutorial.steps.8.title'), description: t('tradeTutorial.steps.8.description'), hint: '', state: 'pending' },
      { id: 9, title: t('tradeTutorial.steps.9.title'), description: t('tradeTutorial.steps.9.description'), hint: '', state: 'pending' },
      { id: 10, title: t('tradeTutorial.steps.10.title'), description: t('tradeTutorial.steps.10.description'), hint: '', state: 'pending' },
      { id: 11, title: t('tradeTutorial.steps.11.title'), description: t('tradeTutorial.steps.11.description'), hint: '', state: 'pending' },
      { id: 12, title: t('tradeTutorial.steps.12.title'), description: t('tradeTutorial.steps.12.description'), hint: '', state: 'pending' },
    ];

    // Validate all steps
    steps.forEach((step, index) => {
      if (!validateTutorialStep(step)) {
        tutorialLogger.error('Invalid trade tutorial step', undefined, { step, index });
      }
    });

    return steps;
  }, [t]);
};

export const TradeTutorial = ({ isActive, stepIndex }: TradeTutorialProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const steps = useTradeTutorialSteps();
  const clampedIndex = Math.max(0, Math.min(steps.length - 1, stepIndex));
  const step = steps[clampedIndex];

  // Refs and state
  const contentRef = useRef<HTMLDivElement>(null);
  const cleanupManagerRef = useRef<CleanupManager | null>(null);
  const hasSimulatedBuyRef = useRef(false);
  const [positioningResult, setPositioningResult] = useState<PositioningResult>({
    placement: 'center',
    containerStyle: undefined,
    contentStyle: undefined,
  });

  // Initialize cleanup manager
  useEffect(() => {
    cleanupManagerRef.current = new CleanupManager();
    return () => {
      cleanupManagerRef.current?.cleanup();
    };
  }, []);

  // Track tutorial start when it becomes active
  useEffect(() => {
    if (isActive && clampedIndex === 0) {
      analyticsService.trackTutorialProgress('trade_tutorial', 'start');
      tutorialLogger.info('Trade tutorial started');
    }
  }, [isActive, clampedIndex]);

  // Positioning calculation with enhanced error handling
  const calculatePositioning = useCallback(() => {
    try {
      const stepConfig = STEP_CONFIGS[clampedIndex];
      
      // Handle special cases
      if (clampedIndex === 0) {
        setPositioningResult({ placement: 'center', containerStyle: undefined, contentStyle: undefined });
        return;
      }

      // Fixed positioning for certain steps
      if (FIXED_POSITIONING_STEPS.includes(clampedIndex)) {
        setPositioningResult({
          placement: 'above',
          containerStyle: undefined,
          contentStyle: {
            position: 'fixed',
            top: `${TUTORIAL_CONFIG.POSITIONING.TOP_MARGIN}px`,
            left: `${TUTORIAL_CONFIG.POSITIONING.LEFT_MARGIN}px`,
          },
        });
        return;
      }

      if (!stepConfig) {
        tutorialLogger.warn('No step configuration found, using center placement', { clampedIndex });
        setPositioningResult({ placement: 'center', containerStyle: undefined, contentStyle: undefined });
        return;
      }

      const modalHeight = contentRef.current?.getBoundingClientRect().height ?? TUTORIAL_CONFIG.MODAL.MIN_HEIGHT;
      const result = calculateModalPosition(stepConfig.selector, stepConfig.placement, stepConfig.gap, modalHeight);
      
      setPositioningResult(result);
      tutorialLogger.debug('Positioning calculated', { clampedIndex, result });
    } catch (error) {
      tutorialLogger.error('Positioning calculation failed', error as Error, { clampedIndex });
      setPositioningResult({ placement: 'center', containerStyle: undefined, contentStyle: undefined });
    }
  }, [clampedIndex]);

  // Setup positioning with proper cleanup
  useEffect(() => {
    if (!cleanupManagerRef.current) return;

    createPositioningRecalculator(calculatePositioning, cleanupManagerRef.current, contentRef);
  }, [calculatePositioning]);

  // Focus management for accessibility
  useEffect(() => {
    focusElement('trade-tutorial-title');
    
    // Handle special step behaviors
    if (clampedIndex === 5) {
      dispatchTutorialEvent('trade:tutorial:openDealModal');
    }
    
    if (clampedIndex === 9 && !hasSimulatedBuyRef.current) {
      hasSimulatedBuyRef.current = true;
      dispatchTutorialEvent('trade:tutorial:simulateBuy');
    }
    
    if (clampedIndex !== 9) {
      hasSimulatedBuyRef.current = false;
    }
  }, [clampedIndex]);

  // Event handlers for tutorial interactions
  useEffect(() => {
    if (!cleanupManagerRef.current) return;

    const handleBuyOrSell = () => {
      if (clampedIndex >= 9) return;
      dispatch(goToTradeTutorialStep(8));
    };

    const handleDealModalOpened = () => {
      if (clampedIndex >= 9) return;
      dispatch(goToTradeTutorialStep(5));
    };

    const handleDealInfoOpened = () => {
      dispatch(goToTradeTutorialStep(11));
    };

    const handleEditDealOpened = () => {
      dispatch(goToTradeTutorialStep(10));
    };

    cleanupManagerRef.current.addEventListener(window as any, 'trade:tutorial:buyOrSell' as any, handleBuyOrSell as any);
    cleanupManagerRef.current.addEventListener(window as any, 'trade:tutorial:dealModalOpened' as any, handleDealModalOpened as any);
    cleanupManagerRef.current.addEventListener(window as any, 'trade:tutorial:dealInfoOpened' as any, handleDealInfoOpened as any);
    cleanupManagerRef.current.addEventListener(window as any, 'trade:tutorial:editDealOpened' as any, handleEditDealOpened as any);
  }, [dispatch, clampedIndex]);

  // Navigation handlers
  const handleNext = useCallback(() => {
    // Special handling for step 11 (index 10)
    if (clampedIndex === 10) {
      dispatchTutorialEvent('trade:tutorial:simulateCloseDeal');
      dispatch(completeTradeTutorial());
      analyticsService.trackTutorialProgress('trade_tutorial', 'complete');
      tutorialLogger.info('Trade tutorial completed');
      return;
    }
    
    if (clampedIndex === steps.length - 1) {
      dispatch(completeTradeTutorial());
      analyticsService.trackTutorialProgress('trade_tutorial', 'complete');
      tutorialLogger.info('Trade tutorial completed');
      return;
    }
    
    dispatch(nextTradeTutorialStep());
    tutorialLogger.debug('Advanced to next tutorial step', { currentStep: clampedIndex });
  }, [clampedIndex, steps.length, dispatch]);

  const handlePrevious = useCallback(() => {
    if (clampedIndex === 0) return;
    dispatch(prevTradeTutorialStep());
    tutorialLogger.debug('Went to previous tutorial step', { currentStep: clampedIndex });
  }, [clampedIndex, dispatch]);

  const handleSkip = useCallback(() => {
    dispatch(skipTradeTutorial());
    dispatch(completeTradeTutorial());
    analyticsService.trackTutorialProgress('trade_tutorial', 'skip');
    tutorialLogger.info('Tutorial skipped by user');
  }, [dispatch]);

  if (!isActive) return null;

  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === steps.length - 1;
  
  // Hidden steps (9 and 11 - indexes 9 and 11)
  if (clampedIndex === 9 || clampedIndex === 11) {
    return null;
  }

  // Determine backdrop and container classes based on placement
  const placement = positioningResult.placement;
  const containerClass = placement === 'center' ? 'items-center justify-center' : 'items-start justify-center';
  const backdrop = placement === 'center' ? 'bg-black/60' : 'bg-transparent';

  return (
    <>
      {/* Spotlight components with configuration-driven z-indexes */}
      {clampedIndex !== 9 && clampedIndex !== 11 && (
        <>
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="wallet-total"], [data-tutorial-target="wallet-free"]' 
            active={clampedIndex === 1} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="pair-selector"]' 
            active={clampedIndex === 2} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="chart-area"]' 
            active={clampedIndex === 3} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="timeframe-selector"], [data-tutorial-target="chart-type-selector"]' 
            active={clampedIndex === 4} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="deal-amount"], [data-tutorial-target="deal-slider"], [data-tutorial-target="deal-multiplier"], [data-tutorial-target="deal-video-bonus"]' 
            active={clampedIndex === 5} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="deal-take-profit"], [data-tutorial-target="deal-stop-loss"]' 
            active={clampedIndex === 6} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-modal="edit-deal"]' 
            active={clampedIndex === 7} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="deal-volume-buy"]' 
            active={clampedIndex === 8} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="deal-direction-toggle"]' 
            active={clampedIndex === 7} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT} 
            dimOpacity={0.15} 
            forceDim 
          />
          <TradeTutorialSpotlight 
            targetSelector='[data-tutorial-target="edit-deal-card"]' 
            active={clampedIndex === 10} 
            zIndex={TUTORIAL_CONFIG.Z_INDEX.SPOTLIGHT + 10} 
            dimOpacity={0.15} 
            forceDim 
            paddingPx={0} 
            shadowPx={2} 
          />
        </>
      )}

      <Modal
        isOpen={true}
        onClose={handleSkip}
        zIndexClass={`z-[${TUTORIAL_CONFIG.Z_INDEX.MODAL}]`}
        backdropClassName={backdrop}
        hideClose
        disableBackdropClose
        containerClassName={containerClass}
        containerStyle={placement !== 'center' ? positioningResult.containerStyle : undefined}
        contentRef={contentRef}
        contentClassName={`z-[${TUTORIAL_CONFIG.Z_INDEX.CONTENT}] bg-white rounded-2xl p-4 w-[${TUTORIAL_CONFIG.MODAL.WIDTH}] max-w-[${TUTORIAL_CONFIG.MODAL.WIDTH}] shadow-xl sm:max-w-${TUTORIAL_CONFIG.MODAL.MAX_WIDTH}`}
        contentStyle={placement !== 'center' ? positioningResult.contentStyle : undefined}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="trade-tutorial-title" aria-describedby="trade-tutorial-desc">
          {step.imageSrc && (
            <div className="w-full flex justify-center pt-1">
              <img src={step.imageSrc} alt={t('tradeTutorial.stepImage')} className="max-w-[228px] w-full h-auto" />
            </div>
          )}

          <h2 
            id="trade-tutorial-title" 
            tabIndex={0} 
            className={`text-base font-bold text-black outline-none ${clampedIndex >= 1 ? 'text-left' : 'text-center'}`}
          >
            {step.title}
          </h2>

          <p 
            id="trade-tutorial-desc" 
            className={`text-sm text-gray-700 ${clampedIndex >= 1 ? 'text-left' : 'text-center'}`}
          >
            {step.description}
          </p>

          {step.hint && (
            <div className="text-xs text-gray-500">
              {step.hint}
            </div>
          )}

          {isFirst ? (
            <div className="flex flex-col gap-2 pt-2">
              <button
                onClick={handleNext}
                className="w-full px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C54EA] text-white"
                aria-label={t('tradeTutorial.startAria')}
              >
                {step.cta ?? t('tradeTutorial.start')}
              </button>
              <button
                onClick={handleSkip}
                className="px-3 py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
                aria-label={t('tradeTutorial.skipAria')}
              >
                {t('tradeTutorial.skip')}
              </button>
            </div>
          ) : (
            <div className={`flex items-center justify-between pt-2 ${clampedIndex === 1 ? 'mt-auto' : ''}`}>
              <button
                onClick={handleSkip}
                className="py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
                aria-label={t('tradeTutorial.closeAria')}
              >
                {t('tradeTutorial.close')}
              </button>
              <button
                onClick={handleNext}
                className="px-4 py-2 rounded-lg text-sm font-semibold bg-[#0C54EA] text-white"
                aria-label={isLast ? t('tradeTutorial.finishAria') : t('tradeTutorial.nextAria')}
              >
                {isLast ? t('tradeTutorial.finish') : t('tradeTutorial.next')}
              </button>
            </div>
          )}
        </div>
      </Modal>
    </>
  );
};

export default TradeTutorial;