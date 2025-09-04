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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
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
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40"
          data-modal="deal-info"
          role="dialog"
          aria-modal="true"
          onClick={handleBackdropClick}
        >
          <div 
            className="w-full max-w-[90%] sm:max-w-md bg-white rounded-2xl shadow-lg mx-4 max-h-[80vh] overflow-hidden"
            style={{ 
              paddingBottom: 'env(safe-area-inset-bottom)'
            }}
          >
          <div className="w-full flex flex-col items-center p-6 pb-6 relative min-h-[400px]">
            {/* Крестик для закрытия */}
              <button
              onClick={handleClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-200 z-10"
              aria-label={t('common.close')}
            >
              <img src="/close.svg" alt="close" className="w-6 h-6" />
            </button>

            {/* Центральный контейнер с иконкой, заголовком и суммой */}
            <div className="flex flex-col items-center justify-center flex-1 mt-4">
              {/* Иконка */}
              <div className="flex justify-center mb-8">
                <div className="items-center justify-center">
                  {content.isProfit ? (
                    // Для прибыли - зеленая иконка
                    <div className="items-center justify-center">
                      <img 
                        src="/about/profit.svg" 
                        alt={t('dealInfo.profit')}
                        className="w-32 h-40 sm:w-[180px] sm:h-[240px]" 
                      />
                    </div>
                  ) : (
                    // Для убытка - красная иконка
                    <div className="items-center justify-center">
                      <img 
                        src="/about/loss.svg" 
                        alt={t('dealInfo.loss')}
                        className="w-32 h-40 sm:w-[180px] sm:h-[240px]" 
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Заголовок */}
              <h3 className="text-xl sm:text-3xl font-bold text-gray-900 text-center mb-4 sm:mb-6">{content.title}</h3>

              {/* Сумма */}
              <p className={`text-2xl sm:text-4xl font-bold text-center ${content.isProfit ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
                {content.profitText}
              </p>
            </div>

            {/* Кнопка */}
            <div className="mt-4 w-full">
              <button
                onClick={handleClose}
                className="w-full max-w-xs mx-auto block bg-[#0C54EA] text-white py-3 px-6 rounded-2xl font-bold text-base sm:text-lg hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
{t('dealInfo.take')}
              </button>
            </div>
          </div>
        </div>
        </div>
      )}
    </>
  );
};

export default DealInfo; 