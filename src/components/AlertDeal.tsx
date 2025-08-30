import { useEffect } from 'react';
import { Button } from './ui/button';
import { useTranslation } from '../lib/i18n';

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/60 z-40"
        onClick={onClose}
        aria-label={t('common.close')}
      />
      <div className="relative z-50 w-full max-w-none sm:max-w-md bg-white rounded-3xl shadow-xl flex flex-col min-h-[80vh] p-[16px] px-4 mx-4 sm:mx-[24px] pb-[calc(16px+env(safe-area-inset-bottom))]">
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
        <div className="flex-1 flex flex-col items-center justify-center pb-4 gap-6">
          {/* Direction & Time */}
          <div className="flex flex-col items-center gap-4">
            <img src="/deal/deal-bear.svg" alt="Deal Bear" className="w-[122px] h-[180px]" />
            <span className="text-[22px] font-bold text-black">{t('dealAlert.opened')}</span>
          </div>
          {/* Details */}
          <div className="w-full space-y-3">
            <div className="flex justify-between text-base">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.openDate')}</span>
              <span className="text-xs font-medium">{dealStartTime ? dealStartTime.toLocaleString() : ''}</span>
            </div>
            <div className="h-px self-stretch bg-[var(--Color-Grey,_#E0E0E0)]" />
            <div className="flex justify-between text-base">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.openPrice')}</span>
              <span className="text-xs font-medium">${openPrice}</span>
            </div>
            <div className="h-px self-stretch bg-[var(--Color-Grey,_#E0E0E0)]" />
            <div className="flex justify-between text-base">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.amount')}</span>
              <span className="text-xs font-medium">${amount}</span>
            </div>
            <div className="h-px self-stretch bg-[var(--Color-Grey,_#E0E0E0)]" />
            <div className="flex justify-between text-base">
              <span className="text-xs font-medium opacity-50">{t('trading.leverage')}</span>
              <span className="text-xs font-medium">X{multiplier}</span>
            </div>
            <div className="h-px self-stretch bg-[var(--Color-Grey,_#E0E0E0)]" />
            <div className="flex justify-between text-base">
              <span className="text-xs font-medium opacity-50">{t('dealAlert.volume', { tp: takeProfit, mult: multiplier })}</span>
              <span className="text-xs font-medium">${volume}</span>
            </div>
            <div className="h-px self-stretch bg-[var(--Color-Grey,_#E0E0E0)]" />
          </div>
          <div className="w-[256px] text-center text-[14px] font-medium tracking-[0px]">
            {t('dealAlert.autoClose')}
          </div>
        </div>
        {/* Bottom action */}
        <div className="px-8">
          <Button
            onClick={onClose}
            className="w-full sm:w-[140px] h-[40px] bg-[#0C54EA] text-white font-bold text-lg py-4 rounded-2xl shadow-lg transition hover:bg-blue-600"
            aria-label={t('common.ok')}
          >
            {t('common.ok')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AlertDeal;