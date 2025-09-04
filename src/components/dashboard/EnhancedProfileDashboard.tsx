import React, { useEffect, useState } from 'react';
import { useUser } from '../../hooks/useUser';
import { useTranslation } from '@/lib/i18n';
import { formatMoneyShort } from '../../lib/numberUtils';
import ProfitLossChart from './ProfitLossChart';
import TopDealsWidget from './TopDealsWidget';

interface DashboardStats {
  totalTrades: number;
  totalVolume: number;
  totalProfit: number;
  successRate: number;
  maxProfit: number;
  maxLoss: number;
  avgTradeAmount: number;
}

const EnhancedProfileDashboard: React.FC = () => {
  const { user, isLoading: userLoading } = useUser();
  const { t } = useTranslation();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDashboardStats = async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardStats();
  }, [user?.id]);

  if (userLoading || isLoading) {
    return (
      <div className="space-y-4">
        {/* Stats Cards Loading */}
        <div className="px-4">
          <div className="bg-white border border-gray-200 rounded-xl p-3">
            <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-5 overflow-hidden animate-pulse">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} className="flex items-center gap-2 min-w-0 h-10 bg-gray-100 rounded" />
              ))}
            </div>
          </div>
        </div>
        
        {/* Chart Loading */}
        <div className="px-4">
          <div className="h-80 bg-gray-100 rounded-xl animate-pulse" />
        </div>
        
        {/* Top Deals Loading */}
        <div className="px-4">
          <div className="h-60 bg-gray-100 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user || !stats) {
    return (
      <div className="px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
          <div className="text-gray-500">Unable to load dashboard data</div>
        </div>
      </div>
    );
  }

  // Enhanced stats with new data
  const enhancedStats = {
    totalTrades: stats.totalTrades,
    successRate: `${stats.successRate.toFixed(1)}%`,
    totalVolume: stats.totalVolume ? formatMoneyShort(stats.totalVolume) : 'N/A',
    totalProfit: stats.totalProfit ? formatMoneyShort(stats.totalProfit) : 'N/A',
    maxProfit: stats.maxProfit ? formatMoneyShort(stats.maxProfit) : 'N/A',
    avgTradeAmount: stats.avgTradeAmount ? formatMoneyShort(stats.avgTradeAmount) : 'N/A',
  };

  return (
    <div className="space-y-4">
      {/* Enhanced Stats Grid - following ProfileDashboard.tsx pattern exactly */}
      <div className="px-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="grid grid-cols-2 max-[360px]:grid-cols-1 gap-5 overflow-hidden">
            
            {/* Total Trades */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 bg-[#0C54EA] rounded-[20px] flex items-center justify-center flex-shrink-0">
                <img src="/dashboard/diamond.svg" alt="trades" className="w-4 h-[14px] filter brightness-0 invert" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-bold text-left sm:truncate truncate">{enhancedStats.totalTrades}</p>
                <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('home.totalTrades') || 'Total Trades'}</p>
              </div>
            </div>

            {/* Success Rate */}
            <div className="flex items-center gap-2 justify-end min-w-0">
              <div className="w-9 h-9 bg-[#F5A600] rounded-[20px] flex items-center justify-center flex-shrink-0">
                <img src="/dashboard/energy.svg" alt="success" className="w-3 h-4 filter brightness-0 invert" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-bold text-left sm:truncate truncate">{enhancedStats.successRate}</p>
                <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.successRate') || 'Success Rate'}</p>
              </div>
            </div>

            {/* Total Volume */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-9 h-9 bg-[#0C54EA] rounded-[20px] flex items-center justify-center flex-shrink-0">
                <img src="/dashboard/diamond.svg" alt="volume" className="w-4 h-[14px] filter brightness-0 invert" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-bold text-left sm:truncate truncate">{enhancedStats.totalVolume}</p>
                <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('dashboard.totalVolume') || 'Total Volume'}</p>
              </div>
            </div>

            {/* Average Trade */}
            <div className="flex items-center gap-2 justify-end min-w-0">
              <div className="w-9 h-9 bg-[#F5A600] rounded-[20px] flex items-center justify-center flex-shrink-0">
                <img src="/dashboard/energy.svg" alt="average" className="w-3 h-4 filter brightness-0 invert" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-bold text-left sm:truncate truncate">{enhancedStats.avgTradeAmount}</p>
                <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.avgTradeAmount') || 'Avg Trade'}</p>
              </div>
            </div>

            {/* Total Profit */}
            <div className="flex items-center gap-2 min-w-0">
              <div className={`w-9 h-9 rounded-[20px] flex items-center justify-center flex-shrink-0 ${
                stats.totalProfit >= 0 ? 'bg-[#2EBD85]' : 'bg-[#F6465D]'
              }`}>
                <img 
                  src={stats.totalProfit >= 0 ? "/dashboard/up.svg" : "/dashboard/down.svg"} 
                  alt="profit" 
                  className="w-5 h-5 filter brightness-0 invert" 
                />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className={`text-base font-bold text-left sm:truncate truncate ${
                  stats.totalProfit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'
                }`}>
                  {stats.totalProfit >= 0 ? '+' : ''}{enhancedStats.totalProfit}
                </p>
                <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('dashboard.totalProfit') || 'Total P&L'}</p>
              </div>
            </div>

            {/* Max Profit */}
            <div className="flex items-center gap-2 justify-end min-w-0">
              <div className="w-9 h-9 bg-[#2EBD85] rounded-[20px] flex items-center justify-center flex-shrink-0">
                <img src="/dashboard/up.svg" alt="max profit" className="w-5 h-5 filter brightness-0 invert" />
              </div>
              <div className="flex flex-col gap-1 min-w-0 flex-1">
                <p className="text-base font-bold text-left sm:truncate truncate text-[#2EBD85]">+{enhancedStats.maxProfit}</p>
                <p className="text-xs text-black opacity-50 text-left sm:truncate">{t('profile.maxProfit') || 'Best Deal'}</p>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Profit/Loss Chart */}
      <div className="px-4">
        <ProfitLossChart userId={user.id} height={280} days={30} />
      </div>

      {/* Top Deals Widget */}
      <div className="px-4">
        <TopDealsWidget userId={user.id} limit={5} />
      </div>

      {/* Additional quick stats row */}
      <div className="px-4 pb-4">
        <div className="bg-white border border-gray-200 rounded-xl p-3">
          <div className="flex justify-between items-center">
            <div className="text-center flex-1">
              <div className="text-base font-bold text-[#0C54EA]">
                {stats.totalTrades > 0 ? Math.round((stats.totalProfit / stats.totalVolume) * 100 * 100) / 100 : 0}%
              </div>
              <div className="text-xs text-black opacity-50">ROI</div>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="text-center flex-1">
              <div className="text-base font-bold text-[#F5A600]">
                {user.energyTasksBonus || 0}{(user.energyTasksBonus || 0) >= 100 ? '/100+' : '/100'}
              </div>
              <div className="text-xs text-black opacity-50">Energy</div>
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <div className="text-center flex-1">
              <div className="text-base font-bold text-[#2EBD85]">
                {user.coins || 0}
              </div>
              <div className="text-xs text-black opacity-50">Coins</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default React.memo(EnhancedProfileDashboard);