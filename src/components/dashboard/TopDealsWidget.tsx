import React, { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { formatMoneyShort } from '../../lib/numberUtils';

interface TopDeal {
  id: number;
  symbol: string;
  amount: number;
  profit: number;
  multiplier: number;
  openedAt: string;
  closedAt: string;
  duration: number; // in minutes
}

interface TopDealsWidgetProps {
  userId?: string;
  limit?: number;
}

const TopDealsWidget: React.FC<TopDealsWidgetProps> = ({ 
  userId, 
  limit = 5 
}) => {
  const { t } = useTranslation();
  const [deals, setDeals] = useState<TopDeal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTopDeals = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/top-deals?limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch top deals');
      }
      
      const result = await response.json();
      setDeals(result.deals || []);
    } catch (err) {
      console.error('Error fetching top deals:', err);
      setError('Failed to load top deals');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTopDeals();
  }, [userId, limit]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    } else if (minutes < 24 * 60) {
      return `${Math.round(minutes / 60)}h`;
    } else {
      return `${Math.round(minutes / (24 * 60))}d`;
    }
  };

  const getCryptoIcon = (symbol: string): string => {
    // Simple mapping - in real app would use coin gecko or similar
    const iconMap: Record<string, string> = {
      'BTCUSDT': '₿',
      'ETHUSDT': 'Ξ',
      'BNBUSDT': 'BNB',
      'ADAUSDT': 'ADA',
      'SOLUSDT': 'SOL',
      'DOGEUSDT': 'Đ'
    };
    
    return iconMap[symbol] || symbol.replace('USDT', '').substring(0, 3);
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#F5A600] rounded-full flex items-center justify-center">
            <img src="/dashboard/diamond.svg" alt="top deals" className="w-3 h-3 filter brightness-0 invert" />
          </div>
          <h3 className="font-bold text-base">{t('dashboard.topDeals') || 'Top Deals'}</h3>
        </div>
        <div className="space-y-3">
          {Array.from({ length: limit }, (_, i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-8 h-8 bg-gray-100 rounded-full" />
              <div className="flex-1">
                <div className="h-4 bg-gray-100 rounded w-20 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-16" />
              </div>
              <div className="text-right">
                <div className="h-4 bg-gray-100 rounded w-16 mb-1" />
                <div className="h-3 bg-gray-100 rounded w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#F5A600] rounded-full flex items-center justify-center">
            <img src="/dashboard/diamond.svg" alt="top deals" className="w-3 h-3 filter brightness-0 invert" />
          </div>
          <h3 className="font-bold text-base">{t('dashboard.topDeals') || 'Top Deals'}</h3>
        </div>
        <div className="text-center py-6 text-red-500 text-sm">
          Failed to load top deals
        </div>
      </div>
    );
  }

  if (!deals.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 bg-[#F5A600] rounded-full flex items-center justify-center">
            <img src="/dashboard/diamond.svg" alt="top deals" className="w-3 h-3 filter brightness-0 invert" />
          </div>
          <h3 className="font-bold text-base">{t('dashboard.topDeals') || 'Top Deals'}</h3>
        </div>
        <div className="text-center py-6 text-gray-500 text-sm">
          No profitable deals yet.<br />
          <span className="text-xs">Start trading to see your best performances!</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Header - following ProfileDashboard pattern */}
      <div className="flex items-center gap-2 mb-3">
        <div className="w-6 h-6 bg-[#F5A600] rounded-full flex items-center justify-center">
          <img src="/dashboard/diamond.svg" alt="top deals" className="w-3 h-3 filter brightness-0 invert" />
        </div>
        <h3 className="font-bold text-base">{t('dashboard.topDeals') || 'Top Deals'}</h3>
        <div className="ml-auto text-xs text-black opacity-50">
          Best {limit}
        </div>
      </div>

      {/* Deals list */}
      <div className="space-y-3">
        {deals.map((deal, index) => (
          <div key={deal.id} className="flex items-center gap-3">
            {/* Rank and crypto icon */}
            <div className="flex items-center gap-2 min-w-0">
              <div className="text-xs font-bold text-black opacity-50 w-4 text-center">
                #{index + 1}
              </div>
              <div className="w-8 h-8 bg-[#0C54EA] rounded-full flex items-center justify-center text-white text-xs font-bold">
                {getCryptoIcon(deal.symbol)}
              </div>
            </div>
            
            {/* Deal info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{deal.symbol.replace('USDT', '')}</span>
                <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                  x{deal.multiplier}
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-black opacity-50">
                <span>${formatMoneyShort(deal.amount)}</span>
                <span>•</span>
                <span>{formatDuration(deal.duration)}</span>
              </div>
            </div>
            
            {/* Profit */}
            <div className="text-right">
              <div className="text-sm font-bold text-[#2EBD85]">
                +${formatMoneyShort(deal.profit)}
              </div>
              <div className="text-xs text-black opacity-50">
                {((deal.profit / deal.amount) * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer with total */}
      {deals.length > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex justify-between items-center">
            <span className="text-xs text-black opacity-50">Total profit</span>
            <span className="text-sm font-bold text-[#2EBD85]">
              +${formatMoneyShort(deals.reduce((sum, deal) => sum + deal.profit, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default React.memo(TopDealsWidget);