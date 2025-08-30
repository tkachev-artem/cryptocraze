import { useAppDispatch, useAppSelector } from '../app/hooks';
import { closeMoreInfo } from '../app/dealModalSlice';
import { useTranslation } from '../lib/i18n';

const MoreInfo = () => {
  const dispatch = useAppDispatch();
  const { isMoreInfoOpen, moreInfoType } = useAppSelector((state) => state.dealModal);
  const { t } = useTranslation();

  const handleClose = () => {
    dispatch(closeMoreInfo());
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target === e.currentTarget) {
      handleClose();
    }
  };

  const getContent = () => {
    switch (moreInfoType) {
      case 'multiplier':
        return {
          title: t('moreInfo.multiplier.title'),
          description: t('moreInfo.multiplier.desc')
        };
      case 'takeProfit':
        return {
          title: t('trading.takeProfit'),
          description: t('moreInfo.takeProfit.desc')
        };
      case 'stopLoss':
        return {
          title: t('trading.stopLoss'),
          description: t('moreInfo.stopLoss.desc')
        };
      case 'commission':
        return {
          title: t('deal.commission'),
          description: t('moreInfo.commission.desc')
        };
      default:
        return {
          title: t('moreInfo.info.title'),
          description: t('moreInfo.info.desc')
        };
    }
  };

  const content = getContent();
  const isCommission = moreInfoType === 'commission';

  if (!isMoreInfoOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-[rgba(0,0,0,0.5)] flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl relative">
        {/* Крестик для закрытия */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors duration-200"
          aria-label={t('common.close')}
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 16 16" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="w-4 h-4"
          >
            <path 
              d="M1 1L15 15M15 1L1 15" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round"
            />
          </svg>
        </button>

        {/* Иконка */}
        <div className="flex justify-center mb-4">
          {isCommission ? (
            // Для комиссии - картинка
            <div className="items-center justify-center">
                <img src="/about/transferfee.svg" alt="transferfee" className="w-[160px] h-[123px]" />
            </div>
          ) : (
            // Для остальных типов - квадрат с иконкой из icon.svg
            <div className="w-[108px] h-[108px] bg-[rgba(245,166,0,0.2)] rounded-2xl flex items-center justify-center">
                <img 
                  src="/about/icon.svg"     
                  alt="" 
                  className="w-[80px] h-[80px]" 
                />
            </div>
          )}
        </div>

        {/* Заголовок */}
        <h3 className="text-xl font-semibold text-gray-900 text-center mb-3">{content.title}</h3>

        {/* Описание */}
        <p className="text-sm text-gray-600 text-center mb-6 leading-relaxed">{content.description}</p>

        {/* Кнопка OK */}
        <button
          onClick={handleClose}
          className="w-full bg-[#0C54EA] text-white py-3 px-6 rounded-xl font-medium text-base hover:bg-blue-700 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          {t('common.ok')}
        </button>
      </div>
    </div>
  );
};

export default MoreInfo; 