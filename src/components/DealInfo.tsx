import { useEffect, useRef } from 'react';
import { formatMoneyShort } from '../lib/numberUtils';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { closeDealInfo } from '../app/dealModalSlice';
import type { RootState } from '../app/store';
import { useTranslation } from '../lib/i18n';

const DealInfo = () => {
  const dispatch = useAppDispatch();
  const { isDealInfoOpen, dealResult } = useAppSelector((state: RootState) => state.dealModal);
  const openedAtRef = useRef<number>(0);
  const { t } = useTranslation();

  useEffect(() => {
    if (isDealInfoOpen) {
      openedAtRef.current = Date.now();
      window.dispatchEvent(new Event('trade:tutorial:dealInfoOpened'));
    }
  }, [isDealInfoOpen]);

  const handleClose = () => {
     
    dispatch(closeDealInfo());
  };

  // Блокируем закрытие по клику на фон полностью, закрываем только по кнопке

  const getContent = () => {
    if (!dealResult) {
      return {
        title: t('dealInfo.closed'),
        description: t('dealInfo.closedDesc'),
        isProfit: false,
        profitText: '$0.00'
      };
    }

    const { profit, isProfit } = dealResult as { profit: number; isProfit: boolean };
    const absMoney = formatMoneyShort(Math.abs(profit));
    const profitText = isProfit ? `+${absMoney}` : `-${absMoney}`;
    
    return {
      title: isProfit ? t('dealInfo.closed') : t('dealInfo.closed'),
      description: profitText,
      isProfit,
      profitText
    };
  };

  const content = getContent();

  return (
    <>
      {/* Модальное окно DealInfo */}
      {isDealInfoOpen && (
        <div 
          className="fixed inset-0 bg-white z-[100] flex items-center justify-center"
          data-modal="deal-info"
          role="dialog"
          aria-modal="true"
          style={{ 
            height: '100vh', 
            width: '100vw',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            paddingBottom: 'env(safe-area-inset-bottom)',
            position: 'fixed'
          }}
        >
          <div className="w-full h-full flex flex-col items-center p-6 pb-0" style={{ minHeight: '100vh', paddingBottom: '0' }}>
            {/* Крестик для закрытия */}
              <button
              onClick={handleClose}
              className="absolute top-6 right-6 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
              aria-label={t('common.close')}
            >
              <img src="/close.svg" alt="close" className="w-6 h-6" />
            </button>

            {/* Центральный контейнер с иконкой, заголовком и суммой */}
            <div className="flex flex-col items-center justify-center mt-20">
              {/* Иконка */}
              <div className="flex justify-center mb-8">
                <div className="items-center justify-center">
                  {content.isProfit ? (
                    // Для прибыли - зеленая иконка
                    <div className="items-center justify-center">
                      <img 
                        src="/about/profit.svg" 
                        alt={t('dealInfo.profit')}
                        className="w-[216px] h-[290px]" 
                      />
                    </div>
                  ) : (
                    // Для убытка - красная иконка
                    <div className="items-center justify-center">
                      <img 
                        src="/about/loss.svg" 
                        alt={t('dealInfo.loss')}
                        className="w-[216px] h-[290px]" 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Заголовок */}
              <h3 className="text-3xl font-bold text-gray-900 text-center mb-6">{content.title}</h3>

              {/* Сумма */}
              <p className={`text-4xl font-bold text-center ${content.isProfit ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
                {content.profitText}
              </p>
            </div>

            {/* Кнопка Забрать */}
            <div className="mt-auto flex items-end pb-8">
              <button
                onClick={handleClose}
                className="w-64 bg-[#0C54EA] text-white py-4 px-8 rounded-2xl font-bold text-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {t('dealInfo.take')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default DealInfo; 