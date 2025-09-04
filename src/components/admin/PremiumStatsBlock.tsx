import React, { useEffect, useState } from 'react';
import { Crown } from 'lucide-react';
import { config } from '../../lib/config';
import PremiumUsersModal from './PremiumUsersModal';
import { useTranslation } from '../../lib/i18n';

interface PremiumStats {
  purchased: {
    total: number;
    monthly: number;
    yearly: number;
  };
  rewards: {
    total: number;
    totalProDaysGranted: number;
  };
}

const PremiumStatsBlock: React.FC = () => {
  const { t, isLoading: translationsLoading } = useTranslation();
  const [stats, setStats] = useState<PremiumStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalType, setModalType] = useState<'purchased' | 'rewards' | null>(null);

  useEffect(() => {
    const fetchPremiumStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${config.api.baseUrl}/admin/premium-stats`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        setStats(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch premium stats:', err);
        setError(t('admin.dashboard.premiumStatsError') || 'Error loading premium stats');
      } finally {
        setLoading(false);
      }
    };

    fetchPremiumStats();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  if (loading || translationsLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.premiumStats')}</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i}>
              <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse" />
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.premiumStats')}</h2>
        </div>
        
        <div className="text-center text-red-600 py-4">
          {error}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
            <Crown className="w-5 h-5 text-yellow-600" />
          </div>
          <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.premiumStats')}</h2>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          {/* Purchased Premium Button - Amber */}
          <button
            onClick={() => setModalType('purchased')}
            className="text-left bg-gradient-to-r from-amber-50 to-amber-100 hover:from-amber-100 hover:to-amber-200 border border-amber-200 rounded-xl p-4 transition-colors"
          >
            <div className="text-2xl font-bold text-amber-900 mb-1">
              {formatNumber(stats?.purchased.total || 0)}
            </div>
            <div className="text-sm text-amber-700 font-medium">{t('admin.dashboard.premiumPurchased')}</div>
            <div className="text-xs text-amber-600 mt-1">
              {t('admin.dashboard.premiumMonthly')}: {stats?.purchased.monthly || 0} • {t('admin.dashboard.premiumYearly')}: {stats?.purchased.yearly || 0}
            </div>
          </button>

          {/* Premium Ratio - Amber */}
          <div className="bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-amber-900 mb-1">
              {stats ? Math.round(((stats.purchased.total / Math.max(stats.purchased.total + stats.rewards.total, 1)) * 100)) : 0}%
            </div>
            <div className="text-sm text-amber-700 font-medium">{t('admin.dashboard.premiumPurchasedPercent')}</div>
          </div>
          
          {/* Rewards Premium Button - Green */}
          <button
            onClick={() => setModalType('rewards')}
            className="text-left bg-gradient-to-r from-green-50 to-green-100 hover:from-green-100 hover:to-green-200 border border-green-200 rounded-xl p-4 transition-colors"
          >
            <div className="text-2xl font-bold text-green-900 mb-1">
              {formatNumber(stats?.rewards.total || 0)}
            </div>
            <div className="text-sm text-green-700 font-medium">{t('admin.dashboard.premiumReceived')}</div>
            <div className="text-xs text-green-600 mt-1">
              {stats?.rewards.totalProDaysGranted || 0} {t('admin.dashboard.premiumDaysGranted')}
            </div>
          </button>

          {/* Total Premium Users - Green */}
          <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-xl p-4">
            <div className="text-2xl font-bold text-green-900 mb-1">
              {formatNumber((stats?.purchased.total || 0) + (stats?.rewards.total || 0))}
            </div>
            <div className="text-sm text-green-700 font-medium">{t('admin.dashboard.premiumActive')}</div>
          </div>
        </div>
      </div>

      {/* Premium Users Modal */}
      <PremiumUsersModal
        isOpen={modalType !== null}
        onClose={() => setModalType(null)}
        type={modalType}
      />
    </>
  );
};

export default PremiumStatsBlock;