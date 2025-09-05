import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Button } from './ui/button';
import { useTranslation } from '../lib/i18n';
import { formatMoneyShort } from '../lib/numberUtils';

type AlertDealProps = {
  onClose: () => void;
  localDirection: 'up' | 'down';
  dealStartTime: Date | null;
  amount: string;
  multiplier: string;
  volume: number;
  takeProfit: string;
  openPrice: string;
};

const AlertDeal = ({
  onClose,
  dealStartTime,
  amount,
  multiplier,
  volume,
  takeProfit,
  openPrice,
}: AlertDealProps) => {
  const { t } = useTranslation();
  // Закрытие по Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => { document.removeEventListener('keydown', handleKeyDown); };
  }, [onClose]);

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 99999 }}>
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div className="relative z-50 w-full max-w-[90%] sm:max-w-sm bg-white rounded-2xl shadow-xl flex flex-col p-4 mx-4">
        {/* Top bar */}
        <div className="flex items-center justify-end">
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
            aria-label={t('common.close')}
          >
            <img src="/close.svg" alt={t('common.close')} className="w-5 h-5" />
          </button>
        </div>
        {/* Content */}
        <div className="flex flex-col items-center space-y-4">
          {/* Direction & Time */}
          <div className="flex flex-col items-center gap-2">
            <img src="/deal/deal-bear.svg" alt="Deal Bear" className="w-24 h-32 sm:w-[100px] sm:h-[140px]" />
            <span className="text-lg font-bold text-black text-center">{t('dealAlert.opened')}</span>
          </div>
          {/* Details */}
          <div className="w-full space-y-1">
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.openDate')}</span>
              <span className="text-xs font-medium text-right">{dealStartTime ? dealStartTime.toLocaleString() : ''}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.openPrice')}</span>
              <span className="text-xs font-medium">{formatMoneyShort(openPrice)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.amount')}</span>
              <span className="text-xs font-medium">{formatMoneyShort(amount)}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs font-medium opacity-50">{t('trading.leverage')}</span>
              <span className="text-xs font-medium">X{multiplier}</span>
            </div>
            <div className="h-px bg-gray-200" />
            <div className="flex justify-between items-center py-1.5">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.volume', { tp: takeProfit, mult: multiplier })}</span>
              <span className="text-xs font-medium">{formatMoneyShort(volume)}</span>
            </div>
            <div className="h-px bg-gray-200" />
          </div>
          
          {/* Bottom action */}
          <div className="pt-4">
            <Button
              onClick={onClose}
              className="w-full max-w-xs mx-auto block bg-[#0C54EA] text-white font-bold text-base sm:text-lg py-3 px-6 rounded-2xl shadow-lg transition hover:bg-blue-600"
              aria-label={t('common.ok')}
              data-tutorial-target="alert-deal-close"
            >
              {t('common.ok')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AlertDeal;