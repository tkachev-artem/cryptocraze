import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from '@/lib/i18n';
import TradeTutorialSpotlight from './TradeTutorialSpotlight';
import TutorialConnectionLine from './TutorialConnectionLine';

/**
 * ProTutorial - компонент для обучения Pro функционалу
 * 
 * Для работы подсветки fx элемента на 2-м, 5-м и 8-м шагах добавьте к элементу fx:
 * data-tutorial-target="fx-element"
 * 
 * Для работы подсветки RSI элемента на 6-м шаге добавьте к элементу RSI:
 * data-tutorial-target="rsi-indicator"
 * 
 * Для работы подсветки SMA элемента на 9-м шаге добавьте к элементу SMA:
 * data-tutorial-target="sma-indicator"
 * 
 * Для работы подсветки marker элемента на 11-м и 14-м шагах добавьте к элементу marker:
 * data-tutorial-target="marker-element"
 * 
 * Для работы подсветки линии элемента на 12-м шаге добавьте к элементу линии:
 * data-tutorial-target="line-element"
 * 
 * Для работы подсветки выделенных областей элемента на 15-м шаге добавьте к элементу областей:
 * data-tutorial-target="areas-element"
 * 
 * Пример:
 * <div data-tutorial-target="fx-element" className="fx-container">
 *   <span>f_x</span>
 * </div>
 * 
 * <div data-tutorial-target="rsi-indicator" className="rsi-container">
 *   <span>RSI</span>
 * </div>
 * 
 * <div data-tutorial-target="sma-indicator" className="sma-container">
 *   <span>SMA</span>
 * </div>
 * 
 * <div data-tutorial-target="marker-element" className="marker-container">
 *   <img src="/pro-menu/marker.svg" alt="Marker" />
 * </div>
 * 
 * <div data-tutorial-target="line-element" className="line-container">
 *   <span>Линия</span>
 * </div>
 * 
 * <div data-tutorial-target="areas-element" className="areas-container">
 *   <span>Выделенные области</span>
 * </div>
 */

type ProTutorialProps = {
  isOpen: boolean;
  currentStep: number;
  onProceed: () => void;
  onSkip: () => void;
  onPrev?: () => void;
};

const ProTutorial: React.FC<ProTutorialProps> = ({ 
  isOpen, 
  currentStep, 
  onProceed, 
  onSkip 
}) => {
  console.log('[ProTutorial] Render with props:', { isOpen, currentStep, onProceed: typeof onProceed, onSkip: typeof onSkip });
  const { t } = useTranslation();
  const contentRef = useRef<HTMLDivElement>(null);
  const [containerStyle, setContainerStyle] = useState<React.CSSProperties | undefined>(undefined);
  const [contentStyle, setContentStyle] = useState<React.CSSProperties | undefined>(undefined);

  // Определяем, является ли текущий шаг вторым, третьим, четвертым, пятым, шестым, седьмым, восьмым, девятым, десятым, одиннадцатым, двенадцатым, тринадцатым, четырнадцатым или пятнадцатым
  const isSecondStep = currentStep === 2;
  const isThirdStep = currentStep === 3;
  const isFourthStep = currentStep === 4;
  const isFifthStep = currentStep === 5;
  const isSixthStep = currentStep === 6;
  const isSeventhStep = currentStep === 7;
  const isEighthStep = currentStep === 8;
  const isNinthStep = currentStep === 9;
  const isTenthStep = currentStep === 10;
  const isEleventhStep = currentStep === 11;
  const isTwelfthStep = currentStep === 12;
  const isThirteenthStep = currentStep === 13;
  const isFourteenthStep = currentStep === 14;
  const isFifteenthStep = currentStep === 15;
  const isSixteenthStep = currentStep === 16;
  const isSeventeenthStep = currentStep === 17;
  const isEighteenthStep = currentStep === 18;
  const isNineteenthStep = currentStep === 19;
  const isTwentiethStep = currentStep === 20;

  useEffect(() => {
    if (!isSecondStep && !isFifthStep && !isSixthStep && !isEighthStep && !isEleventhStep && !isTwelfthStep && !isFourteenthStep) {
      setContainerStyle(undefined);
      setContentStyle(undefined);
      return;
    }

    const recalc = () => {
      const TOP_MARGIN_PX = 12;
      const LEFT_MARGIN_PX = 14;
      setContainerStyle(undefined);
      setContentStyle({ 
        position: 'fixed', 
        top: `${TOP_MARGIN_PX.toString()}px`, 
        left: `${LEFT_MARGIN_PX.toString()}px` 
      });
    };

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
  }, [isSecondStep, isFifthStep, isSixthStep, isEighthStep, isEleventhStep, isTwelfthStep, isFourteenthStep]);

  // Фокус для a11y на заголовок шага
  useEffect(() => {
    const el = document.getElementById('pro-tutorial-title');
    if (el) el.focus();
  }, [currentStep]);

  // Обработчик клика на fx кнопку на шагах 2, 5 и 8
  useEffect(() => {
    const handleFxClick = () => {
      if (isSecondStep) {
        // Открываем fx модалку и переходим к шагу 3
        window.dispatchEvent(new Event('pro:tutorial:openFxModal'));
        onProceed();
      } else if (isFifthStep) {
        // Открываем модалку индикаторов и переходим к шагу 6
        window.dispatchEvent(new Event('pro:tutorial:openIndicatorsModal'));
        onProceed();
      } else if (isEighthStep) {
        // Открываем модалку индикаторов и переходим к шагу 9
        window.dispatchEvent(new Event('pro:tutorial:openIndicatorsModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:fxClicked', handleFxClick);
    return () => {
      window.removeEventListener('pro:tutorial:fxClicked', handleFxClick);
    };
  }, [isSecondStep, isFifthStep, isEighthStep, onProceed]);

  // Обработчик клика на marker кнопку на 11-м шаге
  useEffect(() => {
    const handleMarkerClick = () => {
      if (isEleventhStep) {
        // Открываем модалку marker и переходим к следующему шагу
        window.dispatchEvent(new Event('pro:tutorial:openMarkerModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:markerClicked', handleMarkerClick);
    return () => {
      window.removeEventListener('pro:tutorial:markerClicked', handleMarkerClick);
    };
  }, [isEleventhStep, onProceed]);

  // Обработчик рисования линии на 12-м шаге
  useEffect(() => {
    const handleLineDrawn = () => {
      if (isTwelfthStep) {
        // Закрываем модалку marker и переходим к шагу 13
        window.dispatchEvent(new Event('pro:tutorial:closeMarkerModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:lineDrawn', handleLineDrawn);
    return () => {
      window.removeEventListener('pro:tutorial:lineDrawn', handleLineDrawn);
    };
  }, [isTwelfthStep, onProceed]);

  // Обработчик клика на marker кнопку на 14-м шаге
  useEffect(() => {
    const handleMarkerClick14 = () => {
      if (isFourteenthStep) {
        // Открываем модалку marker и переходим к шагу 15
        window.dispatchEvent(new Event('pro:tutorial:openMarkerModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:markerClicked', handleMarkerClick14);
    return () => {
      window.removeEventListener('pro:tutorial:markerClicked', handleMarkerClick14);
    };
  }, [isFourteenthStep, onProceed]);

  // Обработчик клика на выделенные области в модалке marker на 15-м шаге
  useEffect(() => {
    const handleAreasClick = () => {
      if (isFifteenthStep) {
        // Закрываем модалку marker и переходим к следующему шагу
        window.dispatchEvent(new Event('pro:tutorial:closeMarkerModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:areasClicked', handleAreasClick);
    return () => {
      window.removeEventListener('pro:tutorial:areasClicked', handleAreasClick);
    };
  }, [isFifteenthStep, onProceed]);

  // Обработчик рисования области на 16-м шаге
  useEffect(() => {
    const handleAreaDrawn = () => {
      if (isSixteenthStep) {
        // Закрываем модалку marker и переходим к шагу 17
        window.dispatchEvent(new Event('pro:tutorial:closeMarkerModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:areaDrawn', handleAreaDrawn);
    return () => {
      window.removeEventListener('pro:tutorial:areaDrawn', handleAreaDrawn);
    };
  }, [isSixteenthStep, onProceed]);

  // Обработчик клика на marker кнопку на 17-м шаге
  useEffect(() => {
    const handleMarkerClick17 = () => {
      if (isSeventeenthStep) {
        // Открываем модалку marker и переходим к шагу 18
        window.dispatchEvent(new Event('pro:tutorial:openMarkerModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:markerClicked', handleMarkerClick17);
    return () => {
      window.removeEventListener('pro:tutorial:markerClicked', handleMarkerClick17);
    };
  }, [isSeventeenthStep, onProceed]);

  // Обработчик рисования стрелки на 18-м шаге
  useEffect(() => {
    const handleArrowDrawn = () => {
      if (isEighteenthStep) {
        console.log('[ProTutorial] Step 18: Arrow drawn, proceeding to step 19');
        // Закрываем модалку marker и переходим к шагу 19
        window.dispatchEvent(new Event('pro:tutorial:closeMarkerModal'));
        onProceed();
      }
    };

    // Также обрабатываем клик на стрелку в модалке marker
    const handleArrowClick = () => {
      if (isEighteenthStep) {
        console.log('[ProTutorial] Step 18: Arrow clicked in marker modal, proceeding to step 19');
        // Закрываем модалку marker и переходим к шагу 19
        window.dispatchEvent(new Event('pro:tutorial:closeMarkerModal'));
        onProceed();
      }
    };

    if (isEighteenthStep) {
      console.log('[ProTutorial] Step 18: Waiting for arrow to be drawn or clicked');
    }

    window.addEventListener('pro:tutorial:arrowDrawn', handleArrowDrawn);
    window.addEventListener('pro:tutorial:arrowClicked', handleArrowClick);
    return () => {
      window.removeEventListener('pro:tutorial:arrowDrawn', handleArrowDrawn);
      window.removeEventListener('pro:tutorial:arrowClicked', handleArrowClick);
    };
  }, [isEighteenthStep, onProceed]);

  // Обработчик для 19-го шага (кнопка "Завершить задание")
  // Убираем автоматический таймер, так как пользователь должен нажать кнопку
  useEffect(() => {
    if (isNineteenthStep) {
      console.log('[ProTutorial] Step 19: Waiting for user to click "Завершить задание" button');
    }
  }, [isNineteenthStep]);

  // Отладочная информация для 20-го шага
  useEffect(() => {
    if (isTwentiethStep) {
      console.log('[ProTutorial] Step 20: Step detected, should render panda screen');
    }
  }, [isTwentiethStep]);

  // Автоматическое открытие fx модалки на 3-м шаге
  useEffect(() => {
    if (isThirdStep) {
      // Открываем fx модалку
      window.dispatchEvent(new Event('pro:tutorial:openFxModal'));
    }
  }, [isThirdStep]);

  // Автоматическое открытие модалки индикаторов на 6-м шаге
  useEffect(() => {
    if (isSixthStep) {
      // Открываем модалку индикаторов
      window.dispatchEvent(new Event('pro:tutorial:openIndicatorsModal'));
    }
  }, [isSixthStep]);

  // Автоматическое открытие модалки индикаторов на 9-м шаге
  useEffect(() => {
    if (isNinthStep) {
      // Открываем модалку индикаторов
      window.dispatchEvent(new Event('pro:tutorial:openIndicatorsModal'));
    }
  }, [isNinthStep]);

  // Автоматическое закрытие модалки индикаторов на 10-м шаге
  useEffect(() => {
    if (isTenthStep) {
      // Закрываем модалку индикаторов на 10-м шаге
      window.dispatchEvent(new Event('pro:tutorial:closeIndicatorsModal'));
    }
  }, [isTenthStep]);

  // Автоматическое открытие модалки marker на 12-м шаге
  useEffect(() => {
    if (isTwelfthStep) {
      // Открываем модалку marker
      window.dispatchEvent(new Event('pro:tutorial:openMarkerModal'));
    }
  }, [isTwelfthStep]);

  // Автоматическое открытие модалки marker на 15-м шаге
  useEffect(() => {
    if (isFifteenthStep) {
      // Открываем модалку marker
      window.dispatchEvent(new Event('pro:tutorial:openMarkerModal'));
    }
  }, [isFifteenthStep]);

  // Автоматическое открытие модалки marker на 18-м шаге
  useEffect(() => {
    if (isEighteenthStep) {
      // Открываем модалку marker
      window.dispatchEvent(new Event('pro:tutorial:openMarkerModal'));
    }
  }, [isEighteenthStep]);

  // Обработчик включения EMA и перехода к шагу 4
  useEffect(() => {
    const handleEmaToggle = () => {
      if (isThirdStep) {
        // Закрываем fx модалку и переходим к шагу 4
        window.dispatchEvent(new Event('pro:tutorial:closeFxModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:emaToggled', handleEmaToggle);
    return () => {
      window.removeEventListener('pro:tutorial:emaToggled', handleEmaToggle);
    };
  }, [isThirdStep, onProceed]);

  // Обработчик включения RSI и перехода к следующему шагу
  useEffect(() => {
    const handleRsiToggle = () => {
      if (isSixthStep) {
        // Закрываем модалку индикаторов и переходим к следующему шагу
        window.dispatchEvent(new Event('pro:tutorial:closeIndicatorsModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:rsiToggled', handleRsiToggle);
    return () => {
      window.removeEventListener('pro:tutorial:rsiToggled', handleRsiToggle);
    };
  }, [isSixthStep, onProceed]);

  // Обработчик включения SMA и перехода к шагу 10
  useEffect(() => {
    const handleSmaToggle = () => {
      if (isNinthStep) {
        // Закрываем модалку индикаторов и переходим к шагу 10
        window.dispatchEvent(new Event('pro:tutorial:closeIndicatorsModal'));
        onProceed();
      }
    };

    window.addEventListener('pro:tutorial:smaToggled', handleSmaToggle);
    return () => {
      window.removeEventListener('pro:tutorial:smaToggled', handleSmaToggle);
    };
  }, [isNinthStep, onProceed]);

  if (!isOpen) return null;

  console.log('[ProTutorial] Current step:', currentStep, 'isTwentiethStep:', isTwentiethStep);

  // Для 2-го шага используем специальный дизайн
  if (isSecondStep) {
    return (
      <>
        {/* Подсветка fx элемента */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="fx-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до fx элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="fx-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.applyEMA')}
                </h2>
                <p className="text-base font-bold text-white text-left">
                  {t('proTutorial.movingAverages')}
                </p>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 3-го шага используем специальный дизайн
  if (isThirdStep) {
    return (
      <>
        {/* Подсветка EMA элемента в fx модалке */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="ema-indicator"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до EMA элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="ema-indicator"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.applyEMA')}
                </h2>
                <p className="text-base font-bold text-white text-left">
                  {t('proTutorial.movingAverages')}
                </p>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 4-го шага используем специальный дизайн
  if (isFourthStep) {
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-transparent"
        hideClose
        disableBackdropClose
        containerClassName="items-start justify-center"
        contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
        contentStyle={{ position: 'fixed', top: '12px', left: '14px' }}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
          {/* Прогресс индикатор */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 border border-white rounded-full"></div>
              <div className="w-2 h-1 border border-white rounded-full"></div>
              <div className="w-2 h-1 border border-white rounded-full"></div>
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
              aria-label={t('proTutorial.close')}
            >
              ×
            </button>
          </div>

          {/* Кнопка "Следующее задание" и иконка */}
          <div className="flex items-center justify-between">
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
              aria-label={t('proTutorial.nextTask')}
            >
              {t('proTutorial.nextTask')}
            </button>
            
            {/* Иконка справа от кнопки */}
            <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <img 
                src="/protraining/training.svg" 
                alt={t('proTutorial.training')} 
                className="w-5 h-5" 
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Для 5-го шага используем такой же дизайн как шаг 2
  if (isFifthStep) {
    return (
      <>
        {/* Подсветка fx элемента */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="fx-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до fx элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="fx-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.applyIndicator')}
                </h2>
                <p className="text-base font-bold text-white text-left">
                  {t('proTutorial.rsiIndicator')}
                </p>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 6-го шага используем специальный дизайн
  if (isSixthStep) {
    return (
      <>
        {/* Подсветка RSI элемента в модалке индикаторов */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="rsi-indicator"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до RSI элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="rsi-indicator"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.applyIndicator')}
                </h2>
                <p className="text-base font-bold text-white text-left">
                  {t('proTutorial.rsiIndicator')}
                </p>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 7-го шага используем дизайн как на 4-м шаге
  if (isSeventhStep) {
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-transparent"
        hideClose
        disableBackdropClose
        containerClassName="items-start justify-center"
        contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
        contentStyle={{ position: 'fixed', top: '12px', left: '14px' }}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
          {/* Прогресс индикатор */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
              aria-label={t('proTutorial.close')}
            >
              ×
            </button>
          </div>

          {/* Кнопка "Следующее задание" и иконка */}
          <div className="flex items-center justify-between">
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
              aria-label={t('proTutorial.nextTask')}
            >
              {t('proTutorial.nextTask')}
            </button>
            
            {/* Иконка справа от кнопки */}
            <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <img 
                src="/protraining/training.svg" 
                alt={t('proTutorial.training')} 
                className="w-5 h-5" 
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Для 8-го шага используем дизайн как на 2-м шаге
  if (isEighthStep) {
    return (
      <>
        {/* Подсветка fx элемента */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="fx-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до fx элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="fx-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.applyEMA')}
                </h2>
                <p className="text-base font-bold text-white text-left">
                  {t('proTutorial.smaAverages')}
                </p>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 9-го шага используем дизайн как на 3-м шаге
  if (isNinthStep) {
    return (
      <>
        {/* Подсветка SMA элемента в модалке индикаторов */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="sma-indicator"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до SMA элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="sma-indicator"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.applyEMA')}
                </h2>
                <p className="text-base font-bold text-white text-left">
                  {t('proTutorial.smaAverages')}
                </p>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 10-го шага используем дизайн как на 4-м шаге
  if (isTenthStep) {
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-transparent"
        hideClose
        disableBackdropClose
        containerClassName="items-start justify-center"
        contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
        contentStyle={{ position: 'fixed', top: '12px', left: '14px' }}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
          {/* Прогресс индикатор */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
              aria-label={t('proTutorial.close')}
            >
              ×
            </button>
          </div>

          {/* Кнопка "Следующее задание" и иконка */}
          <div className="flex items-center justify-between">
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
              aria-label={t('proTutorial.nextTask')}
            >
              {t('proTutorial.nextTask')}
            </button>
            
            {/* Иконка справа от кнопки */}
            <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <img 
                src="/protraining/training.svg" 
                alt={t('proTutorial.training')} 
                className="w-5 h-5" 
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Для 11-го шага используем дизайн как на 2-м шаге
  if (isEleventhStep) {
    return (
      <>
        {/* Подсветка marker элемента */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="marker-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до marker элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="marker-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.addLine')}
                </h2>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 12-го шага используем дизайн как на 3-м шаге
  if (isTwelfthStep) {
    return (
      <>
        {/* Подсветка линии элемента в модалке marker */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="line-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до линии элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="line-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('proTutorial.addLine')}
                </h2>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 13-го шага используем дизайн как на 4-м шаге с возможностью рисовать
  if (isThirteenthStep) {
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-transparent"
        hideClose
        disableBackdropClose
        containerClassName="items-start justify-center"
        contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
        contentStyle={{ position: 'fixed', top: '12px', left: '14px' }}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
          {/* Прогресс индикатор */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 border border-white rounded-full"></div>
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
              aria-label={t('proTutorial.close')}
            >
              ×
            </button>
          </div>

          {/* Кнопка "Следующее задание" и иконка */}
          <div className="flex items-center justify-between">
            <button
              onClick={onProceed}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
              aria-label={t('proTutorial.nextTask')}
            >
              {t('proTutorial.nextTask')}
            </button>
            
            {/* Иконка справа от кнопки */}
            <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <img 
                src="/protraining/training.svg" 
                alt={t('proTutorial.training')} 
                className="w-5 h-5" 
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Для 14-го шага используем дизайн как на 2-м шаге
  if (isFourteenthStep) {
    return (
      <>
        {/* Подсветка marker элемента */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="marker-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до marker элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="marker-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('markers.tools.area')}
                </h2>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 15-го шага используем дизайн как на 3-м шаге
  if (isFifteenthStep) {
    return (
      <>
        {/* Подсветка выделенных областей элемента в модалке marker */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="areas-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до выделенных областей элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="areas-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('markers.tools.area')}
                </h2>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 16-го шага используем дизайн как на 4-м шаге с возможностью рисовать
  if (isSixteenthStep) {
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-transparent"
        hideClose
        disableBackdropClose
        containerClassName="items-start justify-center"
        contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
        contentStyle={{ position: 'fixed', top: '12px', left: '14px' }}
      >
        <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
          {/* Прогресс индикатор */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 border border-white rounded-full"></div>
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
              aria-label={t('proTutorial.close')}
            >
              ×
            </button>
          </div>

          {/* Основной контент */}
          <div className="flex items-start gap-3">
            <div className="flex-1">
                              <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('markers.tutorial.drawArea')}
                </h2>
            </div>
            
            {/* Иконка справа внизу */}
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
      </Modal>
    );
  }

  // Для 17-го шага используем дизайн как на 2-м шаге
  if (isSeventeenthStep) {
    return (
      <>
        {/* Подсветка marker элемента */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="marker-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.15} 
          forceDim={false}
        />
        
        {/* Синяя полоса от модалки до marker элемента */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="marker-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  {t('markers.tutorial.addArrow')}
                </h2>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 18-го шага используем дизайн как на 3-м шаге (без подсветки если элемент не найден)
  if (isEighteenthStep) {
    return (
      <>
        {/* Подсветка только элемента стрелки в модалке marker */}
        <TradeTutorialSpotlight 
          targetSelector='[data-tutorial-target="arrow-element"]' 
          active={true} 
          zIndex={75} 
          dimOpacity={0.1} 
          forceDim={false}
          paddingPx={4}
        />
        
        {/* Синяя полоса от модалки до элемента стрелки */}
        <TutorialConnectionLine 
          targetSelector='[data-tutorial-target="arrow-element"]'
          modalRef={contentRef}
          zIndex={74}
        />
        
        <Modal
          isOpen={true}
          onClose={onSkip}
          zIndexClass="z-[90]"
          backdropClassName="bg-transparent"
          hideClose
          disableBackdropClose
          containerClassName="items-start justify-center"
          containerStyle={containerStyle}
          contentRef={contentRef}
          contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
          contentStyle={contentStyle}
        >
          <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
            {/* Прогресс индикатор */}
            <div className="flex items-center justify-between">
              <div className="flex gap-1">
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 bg-white rounded-full"></div>
                <div className="w-2 h-1 border border-white rounded-full"></div>
              </div>
              <button
                onClick={onSkip}
                className="text-white text-lg font-bold"
                aria-label={t('proTutorial.close')}
              >
                ×
              </button>
            </div>

            {/* Основной контент */}
            <div className="flex items-start gap-3">
              <div className="flex-1">
                <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-white outline-none text-left">
                  Добавить стрелку
                </h2>
              </div>
              
              {/* Иконка справа внизу */}
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
        </Modal>
      </>
    );
  }

  // Для 19-го шага используем дизайн с кнопкой "Завершить задание"
  if (isNineteenthStep) {
    console.log('[ProTutorial] Rendering step 19 - Complete task button');
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-transparent"
        hideClose
        disableBackdropClose
        containerClassName="items-start justify-center"
        contentClassName="z-[80] bg-[#0C54EA] rounded-2xl p-4 w-[calc(100vw-28px)] max-w-[calc(100vw-28px)] shadow-xl sm:max-w-sm"
        contentStyle={{ position: 'fixed', top: '12px', left: '14px' }}
      >
        <div 
          className="flex flex-col gap-3" 
          role="dialog" 
          aria-labelledby="pro-tutorial-title" 
          aria-describedby="pro-tutorial-desc"
        >
          {/* Прогресс индикатор */}
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 bg-white rounded-full"></div>
              <div className="w-2 h-1 border border-white rounded-full"></div>
            </div>
            <button
              onClick={onSkip}
              className="text-white text-lg font-bold"
              aria-label={t('proTutorial.close')}
            >
              ×
            </button>
          </div>

          {/* Кнопка "Завершить задание" и иконка */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => {
                console.log('[ProTutorial] Step 19: "Завершить задание" button clicked, currentStep:', currentStep);
                onProceed();
                console.log('[ProTutorial] Step 19: onProceed called, next step should be:', currentStep + 1);
              }}
              className="flex-1 px-4 py-3 rounded-lg text-sm font-semibold bg-white text-[#0C54EA] border border-gray-200"
              aria-label={t('proTutorial.completeTask')}
            >
              {t('proTutorial.completeTask')}
            </button>
            
            {/* Иконка справа от кнопки */}
            <div className="ml-3 w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center border-2 border-white shadow-lg">
              <img 
                src="/protraining/training.svg" 
                alt={t('proTutorial.training')} 
                className="w-5 h-5" 
              />
            </div>
          </div>
        </div>
      </Modal>
    );
  }

  // Для 20-го шага используем полноэкранную модалку с пандой
  if (isTwentiethStep) {
    console.log('[ProTutorial] Rendering step 20 - Panda screen, currentStep:', currentStep);
    return (
      <Modal
        isOpen={true}
        onClose={onSkip}
        zIndexClass="z-[90]"
        backdropClassName="bg-white"
        hideClose
        disableBackdropClose
        containerClassName="items-center justify-center p-0"
        contentClassName="z-[80] bg-white w-full h-full flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div 
          className="relative z-10 flex flex-col items-center justify-center gap-8 text-center px-6 py-12 max-w-md mx-auto h-full" 
          role="dialog" 
          aria-labelledby="pro-tutorial-final-title" 
          aria-describedby="pro-tutorial-final-desc"
        >

          {/* Bear character */}
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="relative">
              <img 
                src="/protraining/bear.svg" 
                alt="Bear character" 
                className="w-[210px] h-[268px]" 
              />
            </div>

            {/* Title */}
            <h1 id="pro-tutorial-final-title" className="text-2xl font-bold text-black leading-tight">
              {t('proTutorial.excellent')}
            </h1>

            {/* Description */}
            <p id="pro-tutorial-final-desc" className="text-base text-black leading-relaxed max-w-sm">
              {t('proTutorial.timeToPractice')}<br />
              {t('proTutorial.tradeCompete')}<br />
              свои навыки.
            </p>
          </div>

          {/* Action button */}
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
      </Modal>
    );
  }

  // Для остальных шагов используем стандартный дизайн
  console.log('[ProTutorial] Rendering fallback for step:', currentStep);
  return (
    <Modal
      isOpen={isOpen}
      onClose={onSkip}
      zIndexClass="z-[90]"
      backdropClassName="bg-black/60"
      hideClose
      containerClassName="items-center justify-center"
      disableBackdropClose
    >
      <div className="flex flex-col gap-3" role="dialog" aria-labelledby="pro-tutorial-title" aria-describedby="pro-tutorial-desc">
        <div className="w-full flex justify-center pt-1">
          <img src="/pro-menu/pro-bear.svg" alt="Pro tutorial" className="max-w-[228px] w-full h-auto" />
        </div>

        <h2 id="pro-tutorial-title" tabIndex={0} className="text-base font-bold text-black outline-none text-center">
          {t('proTutorial.title')}
        </h2>

        <p id="pro-tutorial-desc" className="text-sm text-gray-700 text-center">
          {t('proTutorial.desc')}
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
    </Modal>
  );
};

export default ProTutorial;



