import type React from 'react';
import { useUser } from '../hooks/useUser';
import { useTranslation } from '@/lib/i18n';
import { formatMoneyShort } from '../lib/numberUtils';

const ProfileDashboard: React.FC = () => {
  const { user, isLoading } = useUser();
  const { t } = useTranslation();

  // Используем реальные данные пользователя или значения по умолчанию
  const totalTrades = user?.tradesCount ?? 1;
  const na = t('common.na');
  const maxTradeAmount = user?.totalTradesVolume ? formatMoneyShort(user.totalTradesVolume) : na;
  const maxProfit = user?.maxProfit ? formatMoneyShort(user.maxProfit) : na;
  const successRate = user?.successfulTradesPercentage ? `${user.successfulTradesPercentage}%` : na;
  const avgTradeAmount = user?.averageTradeAmount ? formatMoneyShort(user.averageTradeAmount) : na;
  const maxLoss = user?.maxLoss ? formatMoneyShort(-Math.abs(Number(user.maxLoss))) : na;
  if (isLoading || !user) {
    return (
      <div className="px-4 pb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-5 overflow-hidden animate-pulse">
            <div className="flex items-center gap-2 min-w-0 h-10 bg-gray-100 rounded" />
            <div className="flex items-center gap-2 justify-end min-w-0 h-10 bg-gray-100 rounded" />
            <div className="flex items-center gap-2 min-w-0 h-10 bg-gray-100 rounded" />
            <div className="flex items-center gap-2 justify-end min-w-0 h-10 bg-gray-100 rounded" />
            <div className="flex items-center gap-2 min-w-0 h-10 bg-gray-100 rounded" />
            <div className="flex items-center gap-2 justify-end min-w-0 h-10 bg-gray-100 rounded" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-4">
      <div className="bg-white border border-gray-200 rounded-xl p-3">
        <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-5 overflow-hidden">
          {/* Total Trades */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-[#0C54EA] rounded-[20px] flex items-center justify-center flex-shrink-0">
              <img src="/dashboard/diamond.svg" alt="trades" className="w-4 h-[14px]" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-base font-bold text-left sm:truncate truncate">{totalTrades}</p>
              <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('home.totalTrades')}</p>
            </div>
          </div>

          {/* Success Rate */}
          <div className="flex items-center gap-2 justify-end min-w-0">
            <div className="w-9 h-9 bg-[#F5A600] rounded-[20px] flex items-center justify-center flex-shrink-0">
              <img src="/dashboard/energy.svg" alt="success" className="w-3 h-4" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-base font-bold text-left sm:truncate truncate">{successRate}</p>
              <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.successRate') || 'Успешные'}</p>
            </div>
          </div>

          {/* Max Trade Amount */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-[#0C54EA] rounded-[20px] flex items-center justify-center flex-shrink-0">
              <img src="/dashboard/diamond.svg" alt="max amount" className="w-4 h-[14px]" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-base font-bold text-left sm:truncate truncate">{maxTradeAmount}</p>
              <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.maxTradeAmount') || 'Максимальная сумма сделки'}</p>
            </div>
          </div>

          {/* Avg Trade Amount */}
          <div className="flex items-center gap-2 justify-end min-w-0">
            <div className="w-9 h-9 bg-[#F5A600] rounded-[20px] flex items-center justify-center flex-shrink-0">
              <img src="/dashboard/energy.svg" alt="average" className="w-3 h-4" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-base font-bold text-left sm:truncate truncate">{avgTradeAmount}</p>
              <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.avgTradeAmount') || 'Средняя сумма сделки'}</p>
            </div>
          </div>

          {/* Max Profit */}
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 bg-[#2EBD85] rounded-[20px] flex items-center justify-center flex-shrink-0">
              <img src="/dashboard/up.svg" alt="profit" className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-base font-bold text-left sm:truncate truncate">{maxProfit}</p>
              <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.maxProfit') || 'Максимальный профит'}</p>
            </div>
          </div>

          {/* Max Loss */}
          <div className="flex items-center gap-2 justify-end min-w-0">
            <div className="w-9 h-9 bg-[#F6465D] rounded-[20px] flex items-center justify-center flex-shrink-0">
              <img src="/dashboard/down.svg" alt="loss" className="w-5 h-5" />
            </div>
            <div className="flex flex-col gap-1 min-w-0 flex-1">
              <p className="text-base font-bold text-left sm:truncate truncate">{maxLoss}</p>
              <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.maxLoss') || 'Максимальный убыток'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileDashboard; 