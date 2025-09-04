import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../lib/config';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { ArrowLeft, Users, TrendingUp, UserRoundCheck, DollarSign, Zap, UserPlus, Megaphone, AlertCircle } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';
import PremiumStatsBlock from '../../components/admin/PremiumStatsBlock';

interface AdminOverview {
  users: {
    total_users: number;
    new_users_today: number;
    daily_active_users: number;
    weekly_active_users: number;
    monthly_active_users: number;
  };
  trading: {
    totalTrades: number;
    activeDeals: number;
    closedTrades: number;
    profitableTrades: number;
    totalVolume: number;
    totalPnl: number;
    avgPnl: number;
    tradingUsers: number;
    successRate: string;
  };
  revenue: {
    totalRevenue: string;
    premiumRevenue: string;
    adRevenue: string;
    arpu: string;
    arppu: string;
    payingUsers: number;
    conversionRate: number;
  };
  engagement: {
    totalEvents: number;
    activeUsers: number;
    totalSessions: number;
    logins: number;
    tradesOpened: number;
    adsWatched: number;
    avgSessionsPerUser: string;
  };
  dataSource?: 'clickhouse' | 'postgresql_fallback';
  version?: string;
  clickhouseError?: string;
  lastUpdated: string;
}

interface EngagementMetrics {
  date: string;
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  avgSessionDuration: number;
  totalTrades: number;
  totalVolume: number;
}

interface RevenueMetrics {
  date: string;
  totalRevenue: number;
  premiumRevenue: number;
  arpu: number;
  arppu: number;
  conversionRate: number;
  newPayingUsers: number;
}

interface AdPerformanceMetrics {
  totalAdSpend: string;
  totalInstalls: number;
  totalConversions: number;
  totalRevenue: string;
  avgCPI: string;
  avgCPA: string;
  avgROAS: string;
  totalImpressions: number;
  totalClicks: number;
  avgCTR: string;
  avgConversionRate: string;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { t, language, isLoading: translationsLoading, translations } = useTranslation();
  
  // Helper function for translations with fallbacks
  const tWithFallback = (key: string, fallback: string) => {
    const translation = t(key);
    if (translation === key) {
      console.warn(`Translation missing for key: ${key}, using fallback: ${fallback}`);
      return fallback;
    }
    return translation;
  };
  
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementMetrics[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueMetrics[]>([]);
  const [adPerformanceData, setAdPerformanceData] = useState<AdPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Функции форматирования
  const formatNumber = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return '0';
    
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'м';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'к';
    }
    return num.toString();
  };

  const formatCurrency = (value: number | string): string => {
    const num = Number(value);
    if (isNaN(num)) return '$0';
    
    if (num >= 1000000) {
      return '$' + (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'м';
    } else if (num >= 1000) {
      return '$' + (num / 1000).toFixed(1).replace(/\.0$/, '') + 'к';
    }
    return '$' + num.toFixed(2).replace(/\.00$/, '');
  };

  const formatDecimal = (value: number | string, decimals: number = 2): string => {
    const num = Number(value);
    if (isNaN(num)) return '0';
    
    return num.toFixed(decimals).replace(/\.?0+$/, '');
  };

  const handleBack = () => {
    navigate(-1);
  };

  const fetchOverview = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/admin/analytics/overview-v2`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setOverview(data);
      } else {
        throw new Error(`Failed to fetch overview: ${response.status}`);
      }
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
      setError('Failed to load overview data');
    }
  };

  const fetchEngagementMetrics = async (days: number = 30) => {
    // Engagement data now comes from ClickHouse overview endpoint only
    console.log('Engagement data integrated into overview endpoint');
  };

  const fetchRevenueMetrics = async (days: number = 30) => {
    // Revenue data now comes from ClickHouse overview endpoint only
    console.log('Revenue data integrated into overview endpoint');
  };

  const fetchAdPerformanceMetrics = async (days: number = 30) => {
    // Ad performance data now comes from ClickHouse overview endpoint only
    console.log('Ad performance data integrated into overview endpoint');
    setAdPerformanceData(null); // Clear any existing ad data
  };


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Only fetch overview from ClickHouse - all data is integrated
        await fetchOverview();
      } catch (err) {
        console.error('Error loading analytics data:', err);
        setError('Failed to load analytics data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading || translationsLoading) {
    return (
      <div className="min-h-screen bg-[#F1F7FF] flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
        {/* Top Navigation + Analytics Banner - Fixed */}
        <div className="sticky top-0 z-30 bg-[#F1F7FF]">
          <div className="flex items-center justify-between px-4 py-4">
            <button
              onClick={handleBack}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6 text-black" />
              <span className="text-xl font-extrabold text-black">{t('nav.back')}</span>
            </button>
            <div className="w-6 h-6" />
          </div>
          
          <div className="px-4 pb-4">
            <div className="w-full h-[50px] bg-[#0C54EA] rounded-xl flex items-center justify-center">
              <h1 className="text-lg font-bold text-white">{t('admin.dashboard.title') || 'Dashboard'}</h1>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 bg-[#F1F7FF] px-4 pb-8">
          <div className="max-w-2xl mx-auto space-y-4">
            {/* Loading skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
                  <div className="h-8 bg-gray-200 rounded mb-2 animate-pulse" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F1F7FF] flex flex-col pb-[calc(56px+env(safe-area-inset-bottom))]">
      {/* Top Navigation + Analytics Banner - Fixed */}
      <div className="sticky top-0 z-30 bg-[#F1F7FF]">
        <div className="flex items-center justify-between px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-6 h-6 text-black" />
            <span className="text-xl font-extrabold text-black">{t('nav.back')}</span>
          </button>
          <div className="w-6 h-6" />
        </div>
        
        <div className="px-4 pb-4">
          <div className="w-full h-[50px] bg-[#0C54EA] rounded-xl flex items-center justify-center">
            <h1 className="text-lg font-bold text-white">{t('admin.dashboard.title') || 'Dashboard'}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#F1F7FF] px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800 font-medium">{error}</span>
            </div>
          </div>
        )}


        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Total Users Card - First */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <Users className="w-6 h-6 text-[#0C54EA]" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {formatNumber(overview?.users?.total_users || 0)}
            </div>
            <div className="text-sm text-gray-600 mb-1">{tWithFallback('admin.dashboard.totalUsers', 'Total Users')}</div>
            {overview?.users?.total_users && (
              <div className="text-xs text-gray-500 font-medium">{t('admin.dashboard.allRegisteredUsers')}</div>
            )}
          </div>

          {/* Active Deals Card - Second */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-[#F5A600]" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {formatNumber(overview?.trading?.activeDeals || 0)}
            </div>
            <div className="text-sm text-gray-600 mb-1">{t('admin.dashboard.activeDeals')}</div>
            {overview?.trading?.activeDeals !== undefined && (
              <div className="text-xs text-gray-500 font-medium">{t('admin.dashboard.currentlyOpenPositions')}</div>
            )}
          </div>

          {/* Daily Active Users Card - Third */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <UserRoundCheck className="w-6 h-6 text-[#2EBD85]" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {formatNumber(overview?.users?.daily_active_users || 0)}
            </div>
            <div className="text-sm text-gray-600 mb-1">{t('admin.dashboard.dailyActiveUsers')}</div>
            {overview?.users?.daily_active_users !== undefined && (
              <div className="text-xs text-gray-500 font-medium">{t('admin.dashboard.usersActiveToday')}</div>
            )}
          </div>

          {/* Total Revenue Card - Fourth */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-purple-600" />
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {formatCurrency(overview?.revenue?.totalRevenue || '0')}
            </div>
            <div className="text-sm text-gray-600 mb-1">{t('admin.dashboard.totalRevenue')}</div>
            {overview?.revenue?.totalRevenue !== undefined && (
              <div className="text-xs text-gray-500 font-medium">{t('admin.dashboard.allTimeRevenue')}</div>
            )}
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Engagement Metrics */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#0C54EA]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.engagementMetrics')}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatNumber(overview?.users?.weekly_active_users || 0)}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.weeklyActiveUsers')}</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatNumber(overview?.users?.monthly_active_users || 0)}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.monthlyActiveUsers')}</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatDecimal(overview?.engagement?.avgSessionsPerUser || '0')}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.avgSessionsPerUser')}</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatNumber(overview?.trading?.totalTrades || 0)}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.totalTrades')}</div>
              </div>
            </div>

          </div>

          {/* Revenue Metrics */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-[#2EBD85]" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.revenueMonetization')}</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(overview?.revenue?.arpu || '0')}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.arpu')}</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatCurrency(overview?.revenue?.arppu || '0')}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.arppu')}</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatDecimal(Number(overview?.revenue?.conversionRate || 0) * 100, 1)}%
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.conversionRate')}</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {formatNumber(overview?.revenue?.payingUsers || 0)}
                </div>
                <div className="text-sm text-gray-600">{t('admin.dashboard.payingUsers')}</div>
              </div>
            </div>

          </div>

          {/* Trading Metrics */}
          {overview?.trading && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-purple-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.tradingPerformance')}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(overview.trading.closedTrades)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.closedTrades')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(overview.trading.profitableTrades)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.profitableTrades')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {overview.trading.successRate}%
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.successRate')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatCurrency(overview.trading.totalPnl)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.totalPnL')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Premium Statistics */}
          <PremiumStatsBlock />

          {/* New Users & Activity */}
          {overview?.users && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                  <UserPlus className="w-5 h-5 text-blue-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.userActivity')}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(overview.users.new_users_today)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.newUsersToday')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(overview.engagement.totalSessions)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.totalSessions')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(overview.engagement.logins)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.logins7d')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatNumber(overview.engagement.adsWatched)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.adsWatched')}</div>
                </div>
              </div>
            </div>
          )}

          {/* Ad Performance Metrics */}
          {adPerformanceData && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <Megaphone className="w-5 h-5 text-red-600" />
                </div>
                <h2 className="text-lg font-bold text-gray-900">{t('admin.dashboard.adPerformance')}</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatCurrency(adPerformanceData.totalAdSpend)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.totalAdSpend')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatCurrency(adPerformanceData.avgCPI)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.cpi')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatCurrency(adPerformanceData.avgCPA)}
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.cpa')}</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {formatDecimal(adPerformanceData.avgROAS, 2)}x
                  </div>
                  <div className="text-sm text-gray-600">{t('admin.dashboard.roas')}</div>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default AdminDashboard;