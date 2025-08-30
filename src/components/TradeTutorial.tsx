import { useEffect, useMemo, useRef, useState } from 'react';
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

type TutorialStep = {
  id: number;
  title: string;
  description: string;
  cta?: string;
  hint?: string;
  imageSrc?: string;
};

const useTradeTutorialSteps = (): TutorialStep[] => {
  const { t } = useTranslation();
  // 14 шагов. Тексты placeholders — пользователь добавит изображения позже
  return useMemo(
    () => [
      {
        id: 1,
        title: t('tradeTutorial.steps.1.title'),
        description: t('tradeTutorial.steps.1.description'),
        cta: t('tradeTutorial.start'),
        imageSrc: '/tutorial/bear-1.svg'
      },
      { id: 2, title: t('tradeTutorial.steps.2.title'), description: t('tradeTutorial.steps.2.description'), hint: '' },
      { id: 3, title: t('tradeTutorial.steps.3.title'), description: t('tradeTutorial.steps.3.description'), hint: '' },
      { id: 4, title: t('tradeTutorial.steps.4.title'), description: t('tradeTutorial.steps.4.description'), hint: '' },
      { id: 5, title: t('tradeTutorial.steps.5.title'), description: t('tradeTutorial.steps.5.description'), hint: '' },
      { id: 6, title: t('tradeTutorial.steps.6.title'), description: t('tradeTutorial.steps.6.description'), hint: '' },
      { id: 7, title: t('tradeTutorial.steps.7.title'), description: t('tradeTutorial.steps.7.description'), hint: '' },
      { id: 8, title: t('tradeTutorial.steps.8.title'), description: t('tradeTutorial.steps.8.description'), hint: '' },
      { id: 9, title: t('tradeTutorial.steps.9.title'), description: t('tradeTutorial.steps.9.description'), hint: '' },
      { id: 10, title: t('tradeTutorial.steps.10.title'), description: t('tradeTutorial.steps.10.description'), hint: '' },
      { id: 11, title: t('tradeTutorial.steps.11.title'), description: t('tradeTutorial.steps.11.description'), hint: '' },
      { id: 12, title: t('tradeTutorial.steps.12.title'), description: t('tradeTutorial.steps.12.description'), hint: '' },
    ],
    [t]
  );
};

type TradeTutorialProps = {
  isActive: boolean;
  stepIndex: number;
};

export const TradeTutorial = ({ isActive, stepIndex }: TradeTutorialProps) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const steps: TutorialStep[] = useTradeTutorialSteps();
  const clampedIndex: number = Math.max(0, Math.min(steps.length - 1, stepIndex));
  const step: TutorialStep = steps[clampedIndex];

  // Anchored modal positioning: measure target rect and place modal above/below with fixed gap
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [contentStyle, setContentStyle] = useState<React.CSSProperties | undefined>(undefined);
  const hasSimulatedBuyRef = useRef<boolean>(false);

  useEffect(() => {
    const getGap = (index: number): number => {
      // Базовый зазор 16px, на шаге 6 делаем больше для комфортного расстояния от подсветки
      if (index === 5) return 74; // Шаг 6: Создание ордера — больше отступ
      if (index === 6) return -8; // Шаг 7: TP/SL — ближе к подсветке
      if (index === 7) return 24; // Шаг 8: Переключатель — отступ снизу
      if (index === 8) return 56; // Шаг 9: Комфортный верхний отступ
      if (index === 10) return 24; // Шаг 11: комфортный отступ снизу карточки
      return 16;
    };

    const getTargetSelector = (index: number): string => {
      switch (index) {
        case 1: return '[data-tutorial-target="wallet-total"], [data-tutorial-target="wallet-free"]';
        case 2: return '[data-tutorial-target="pair-selector"]';
        case 3: return '[data-tutorial-target="chart-area"]';
        case 4: return '[data-tutorial-target="timeframe-selector"], [data-tutorial-target="chart-type-selector"]';
        case 5: return '[data-tutorial-target="crypto-info"]';
        case 6: return '[data-tutorial-target="sell-button"], [data-tutorial-target="buy-button"]';
        default: return '';
      }
    };

    // Предпочтительное размещение для шагов
    // center — по центру экрана (шаг 1); below — под выделением; above — над выделением; auto — по свободному месту
    const getPreferredPlacement = (index: number): 'center' | 'below' | 'above' | 'auto' => {
      switch (index) {
        case 0: return 'center';
        case 1: return 'below'; // Баланс — модалка под кошельком
        case 2: return 'below'; // Торговая пара — ниже
        case 3: return 'auto';  // График — очень низко, auto под/над
        case 4: return 'below'; // Настройки графика — ниже
        case 5: return 'above'; // Шаг 6: Создание ордера — модалка выше подсветки
        case 6: return 'above'; // Шаг 7: TP/SL — модалка сверху
        case 7: return 'below'; // Шаг 8: Переключатель направления — снизу
        case 8: return 'above'; // Шаг 9: Объём/Комиссия/Купить — модалка сверху
        case 10: return 'above'; // Шаг 11: Редактировать сделку — модалка снизу
        default: return 'auto';
      }
    };

    const recalc = () => {
      const placement = getPreferredPlacement(clampedIndex);
      const GAP = getGap(clampedIndex);
      const viewportH = window.innerHeight;

      // Центр экрана — шаг 1
      if (placement === 'center') {
        // Полностью полагаемся на flex-центрирование контейнера и отсутствует contentStyle
        setContainerStyle(undefined);
        setContentStyle(undefined);
        return;
      }

      // Для шагов 6 (index 5), 7 (index 6) и 9 (index 8) всегда фиксируем модалку сверху экрана,
      // чтобы она не накладывалась на подсвеченную область
      if (clampedIndex === 5 || clampedIndex === 6 || clampedIndex === 8) {
        const TOP_MARGIN_PX = 12;
        const LEFT_MARGIN_PX = 14;
        setContainerStyle(undefined);
        setContentStyle({ position: 'fixed', top: `${TOP_MARGIN_PX.toString()}px`, left: `${LEFT_MARGIN_PX.toString()}px` });
        return;
      }

      const targetSelector = getTargetSelector(clampedIndex);
      if (!targetSelector) {
        setContainerStyle(undefined);
        setContentStyle(undefined);
        return;
      }
      const elements = document.querySelectorAll(targetSelector);
      if (!elements.length) {
        setContainerStyle(undefined);
        setContentStyle(undefined);
        return;
      }
      // Combine rects into one bounding rect
      const rects = Array.from(elements).map(el => el.getBoundingClientRect());
      const left = Math.min(...rects.map(r => r.left));
      const top = Math.min(...rects.map(r => r.top));
      const right = Math.max(...rects.map(r => r.right));
      const bottom = Math.max(...rects.map(r => r.bottom));
      const combined = { left, top, right, bottom, width: right - left, height: bottom - top };

      const modalRect = contentRef.current?.getBoundingClientRect();
      const modalH = modalRect?.height ?? 160;
      const spaceBelow = viewportH - combined.bottom;

      // Выбираем размещение
      let y: number;
      if (placement === 'below') {
        y = Math.min(viewportH - modalH - 8, combined.bottom + GAP);
      } else if (placement === 'above') {
        y = Math.max(8, combined.top - GAP - modalH);
      } else {
        // auto
        const placeBelow = spaceBelow >= modalH + GAP;
        y = placeBelow ? combined.bottom + GAP : Math.max(8, combined.top - GAP - modalH);
      }

      // Выравниваем по общему левому отступу 14px (единый стиль)
      const x = 14;

      setContainerStyle({ position: 'relative' });
      // Прочие спец-случаи сохраняем как есть
      if (clampedIndex === 10) {
        // Шаг 11: расположить строго под карточкой редактирования
        const desiredLeft = 14;
        const topBelow = combined.bottom + GAP;
        const finalTop = Math.min(viewportH - modalH - 8, topBelow);
        setContentStyle({ position: 'fixed', top: `${finalTop.toString()}px`, left: `${desiredLeft.toString()}px` });
        return;
      }
      setContentStyle({ position: 'fixed', top: `${y.toString()}px`, left: `${x.toString()}px` });
    };

    // Initial and delayed recalculations for when sizes become available
    recalc();
    const t1 = setTimeout(recalc, 60);
    const t2 = setTimeout(recalc, 200);

    const onResize = () => { recalc(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('scroll', onResize, true);

    const ro = new ResizeObserver(() => { recalc(); });
    if (contentRef.current) ro.observe(contentRef.current);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onResize, true);
      ro.disconnect();
    };
  }, [clampedIndex]);

  // console.log('TradeTutorial render:', { stepIndex, clampedIndex, stepId: step.id, isActive });

  useEffect(() => {
    // Фокус для a11y на заголовок шага
    const el = document.getElementById('trade-tutorial-title');
    if (el) el.focus();
    // Авто-открытие модалки сделки на шаге 6
    if (clampedIndex === 5) {
      window.dispatchEvent(new Event('trade:tutorial:openDealModal'));
    }
    // Шаг 10: один раз симулируем покупку
    if (clampedIndex === 9 && !hasSimulatedBuyRef.current) {
      hasSimulatedBuyRef.current = true;
      window.dispatchEvent(new Event('trade:tutorial:simulateBuy'));
    }
    if (clampedIndex !== 9) {
      hasSimulatedBuyRef.current = false;
    }
  }, [stepIndex, clampedIndex]);

  useEffect(() => {
    const handleBuyOrSell = () => {
      // Перейти к шагу 9 (index 8): "Продать или купить"
      // Если уже на шаге "Сделка открыта" или далее — не перекидываем назад
      if (clampedIndex >= 9) return;
      dispatch(goToTradeTutorialStep(8));
    };
    const handleDealModalOpened = () => {
      // На шагах "Сделка открыта" (index 9) и далее — не показываем модалку "Создание ордера"
      if (clampedIndex >= 9) return;
      dispatch(goToTradeTutorialStep(5));
    };
    const handleDealInfoOpened = () => {
      // Перейти к шагу 12 (index 11)
      dispatch(goToTradeTutorialStep(11));
    };
    const handleEditDealOpened = () => {
      // Перейти к шагу 11 (index 10)
      dispatch(goToTradeTutorialStep(10));
    };

    window.addEventListener('trade:tutorial:buyOrSell', handleBuyOrSell);
    window.addEventListener('trade:tutorial:dealModalOpened', handleDealModalOpened);
    window.addEventListener('trade:tutorial:dealInfoOpened', handleDealInfoOpened);
    window.addEventListener('trade:tutorial:editDealOpened', handleEditDealOpened);
    return () => {
      window.removeEventListener('trade:tutorial:buyOrSell', handleBuyOrSell);
      window.removeEventListener('trade:tutorial:dealModalOpened', handleDealModalOpened);
      window.removeEventListener('trade:tutorial:dealInfoOpened', handleDealInfoOpened);
      window.removeEventListener('trade:tutorial:editDealOpened', handleEditDealOpened);
    };
  }, [dispatch, clampedIndex]);

  if (!isActive) return null;

  const isFirst = clampedIndex === 0;
  const isLast = clampedIndex === steps.length - 1;

  const handleNext = () => {
    // На шаге 11 имитируем нажатие "Закрыть сделку" в EditDealModal
    if (clampedIndex === 10) {
      window.dispatchEvent(new Event('trade:tutorial:simulateCloseDeal'));
      dispatch(completeTradeTutorial());
      return;
    }
    if (isLast) {
      dispatch(completeTradeTutorial());
      return;
    }
    dispatch(nextTradeTutorialStep());
  };

  const handlePrev = () => {
    if (isFirst) return;
    dispatch(prevTradeTutorialStep());
  };

  const handleSkip = () => {
    dispatch(skipTradeTutorial());
    dispatch(completeTradeTutorial());
  };

  return (
    <>
      {/* Спотлайты обучения: отключаем на шагах 10 и 12 полностью */}
      {clampedIndex !== 9 && clampedIndex !== 11 && (
        <>
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="wallet-total"], [data-tutorial-target="wallet-free"]' active={clampedIndex === 1} zIndex={60} dimOpacity={0.15} forceDim />
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="pair-selector"]' active={clampedIndex === 2} zIndex={60} dimOpacity={0.15} forceDim />
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="chart-area"]' active={clampedIndex === 3} zIndex={60} dimOpacity={0.15} forceDim />
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="timeframe-selector"], [data-tutorial-target="chart-type-selector"]' active={clampedIndex === 4} zIndex={60} dimOpacity={0.15} forceDim />
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="deal-amount"], [data-tutorial-target="deal-slider"], [data-tutorial-target="deal-multiplier"], [data-tutorial-target="deal-video-bonus"]' active={clampedIndex === 5} zIndex={60} dimOpacity={0.15} forceDim />
          {/* Step 7: TP/SL inputs */}
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="deal-take-profit"], [data-tutorial-target="deal-stop-loss"]' active={clampedIndex === 6} zIndex={60} dimOpacity={0.15} forceDim />
          {/* Step 8: Edit deal — spotlight edit icon button within EditDealModal */}
          <TradeTutorialSpotlight targetSelector='[data-modal="edit-deal"]' active={clampedIndex === 7} zIndex={60} dimOpacity={0.15} forceDim />
          {/* Step 9: Volume/Commission + Buy button */}
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="deal-volume-buy"]' active={clampedIndex === 8} zIndex={60} dimOpacity={0.15} forceDim />
          {/* Step 8: Direction toggle */}
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="deal-direction-toggle"]' active={clampedIndex === 7} zIndex={60} dimOpacity={0.15} forceDim />
          {/* Step 11: EditDealModal inner card for precise highlighting */}
          <TradeTutorialSpotlight targetSelector='[data-tutorial-target="edit-deal-card"]' active={clampedIndex === 10} zIndex={70} dimOpacity={0.15} forceDim paddingPx={0} shadowPx={2} />
        </>
      )}
      {/* Вычисляем предпочтение для управления backdrop/позиционированием */}
      {(() => {
        const placement = ((): 'center' | 'below' | 'above' | 'auto' => {
          switch (clampedIndex) {
            case 0: return 'center';
            case 1: return 'below';
            case 2: return 'below';
            case 3: return 'auto';
            case 4: return 'below';
            case 5: return 'above';
            case 6: return 'above';
            case 7: return 'below';
            case 9: return 'auto';
            default: return 'auto';
          }
        })();
        const containerClass = placement === 'center' ? 'items-center justify-center' : 'items-start justify-center';
        const backdrop = placement === 'center' ? 'bg-black/60' : 'bg-transparent';
        // Шаг 10: не показываем модалку обучения (Deal/редактирование сами показывают UI)
        if (clampedIndex === 9) {
          return null;
        }
        // Шаг 12: показываем только системное DealInfo — обучение скрыто
        if (clampedIndex === 11) {
          return null;
        }
        return (
      <Modal
        isOpen={true}
        onClose={handleSkip}
        zIndexClass="z-[90]"
        backdropClassName={backdrop}
        hideClose
        disableBackdropClose
        containerClassName={containerClass}
        containerStyle={(clampedIndex >= 1 && clampedIndex <= 12) ? containerStyle : undefined}
        contentRef={contentRef}
        contentClassName={'z-[80] bg-white rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm'}
        contentStyle={(clampedIndex >= 1 && clampedIndex <= 12 && placement !== 'center') ? contentStyle : undefined}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="trade-tutorial-title" aria-describedby="trade-tutorial-desc">
        {/* Верхняя панель скрыта на шагах 2–12 по единому дизайну */}

        {step.imageSrc && (
          <div className="w-full flex justify-center pt-1">
            <img src={step.imageSrc} alt={t('tradeTutorial.stepImage')} className="max-w-[228px] w-full h-auto" />
          </div>
        )}

        <h2 id="trade-tutorial-title" tabIndex={0} className={`text-base font-bold text-black outline-none ${clampedIndex >= 1 ? 'text-left' : ''}`}>
          {step.title}
        </h2>

        <p id="trade-tutorial-desc" className={`text-sm text-gray-700 ${clampedIndex >= 1 ? 'text-left' : ''}`}>
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
            {clampedIndex >= 1 ? (
              <button
                onClick={handleSkip}
                className="py-2 text-sm text-gray-400 hover:text-gray-600 bg-transparent"
                aria-label={t('tradeTutorial.closeAria')}
              >
                {t('tradeTutorial.close')}
              </button>
            ) : (
              <button
                onClick={handlePrev}
                className="px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-800 disabled:opacity-50"
                aria-label={t('common.back')}
              >
                {t('tradeTutorial.close')}
              </button>
            )}
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
        );
      })()}
    </>
  );
};

export default TradeTutorial;

