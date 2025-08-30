import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { config } from '../../lib/config';
import BottomNavigation from '../../components/ui/BottomNavigation';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from '../../lib/i18n';

interface AdminOverview {
  engagement: {
    dailyActiveUsers: number;
    weeklyActiveUsers: number;
    monthlyActiveUsers: number;
    avgSessionDuration: number;
    totalTrades: number;
    totalVolume: number;
  } | null;
  revenue: {
    totalRevenue: number;
    premiumRevenue: number;
    arpu: number;
    arppu: number;
    conversionRate: number;
    totalPayingUsers: number;
  } | null;
  acquisition: {
    totalSignups: number;
    totalFirstTrades: number;
    tradeOpenRate: number;
    avgTimeToFirstTrade: number;
  } | null;
  overview: {
    totalUsers: number;
    activeDeals: number;
  };
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

const AdminAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [engagementData, setEngagementData] = useState<EngagementMetrics[]>([]);
  const [revenueData, setRevenueData] = useState<RevenueMetrics[]>([]);
  const [adPerformanceData, setAdPerformanceData] = useState<AdPerformanceMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const handleBack = () => {
    navigate(-1);
  };

  const fetchOverview = async () => {
    try {
      const response = await fetch(`${config.api.baseUrl}/admin/analytics/overview`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setOverview(data);
      }
    } catch (error) {
      console.error('Error fetching analytics overview:', error);
    }
  };

  const fetchEngagementMetrics = async (days: number = 30) => {
    try {
      const response = await fetch(`${config.api.baseUrl}/admin/analytics/engagement?days=${days}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setEngagementData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
    }
  };

  const fetchRevenueMetrics = async (days: number = 30) => {
    try {
      const response = await fetch(`${config.api.baseUrl}/admin/analytics/revenue?days=${days}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setRevenueData(result.data || []);
      }
    } catch (error) {
      console.error('Error fetching revenue metrics:', error);
    }
  };

  const fetchAdPerformanceMetrics = async (days: number = 30) => {
    try {
      const response = await fetch(`${config.api.baseUrl}/admin/analytics/ads?days=${days}`, {
        credentials: 'include'
      });
      if (response.ok) {
        const result = await response.json();
        setAdPerformanceData(result.summary || null);
      }
    } catch (error) {
      console.error('Error fetching ad performance metrics:', error);
    }
  };


  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([
        fetchOverview(),
        fetchEngagementMetrics(30),
        fetchRevenueMetrics(30),
        fetchAdPerformanceMetrics(30)
      ]);
      setIsLoading(false);
    };

    loadData();
  }, []);

  if (isLoading) {
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
              <h1 className="text-lg font-bold text-white">Dashboard</h1>
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
            <h1 className="text-lg font-bold text-white">Dashboard</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#F1F7FF] px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">

        {/* Overview Stats */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          {/* Total Users Card - First */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#0C54EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {overview?.overview.totalUsers || 0}
            </div>
            <div className="text-sm text-gray-600 mb-1">Total Users</div>
            <div className="text-xs text-green-600 font-medium">+5.2% from last month</div>
          </div>

          {/* Active Deals Card - Second */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#F5A600]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {overview?.overview.activeDeals || 0}
            </div>
            <div className="text-sm text-gray-600 mb-1">Active Deals</div>
            <div className="text-xs text-red-600 font-medium">-2.1% from last month</div>
          </div>

          {/* Daily Active Users Card - Third */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-[#2EBD85]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              {overview?.engagement?.dailyActiveUsers || 0}
            </div>
            <div className="text-sm text-gray-600 mb-1">Daily Active Users</div>
            <div className="text-xs text-green-600 font-medium">+12.5% from last month</div>
          </div>

          {/* Total Revenue Card - Fourth */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 lg:p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="text-2xl lg:text-3xl font-bold text-gray-900 mb-2">
              ${Number(overview?.revenue?.totalRevenue || 0).toLocaleString()}
            </div>
            <div className="text-sm text-gray-600 mb-1">Total Revenue</div>
            <div className="text-xs text-green-600 font-medium">+8.1% from last month</div>
          </div>
        </div>

        {/* Main Metrics Grid */}
        <div className="grid grid-cols-1 gap-4">
          
          {/* Engagement Metrics */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#0C54EA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Engagement Metrics</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {overview?.engagement?.weeklyActiveUsers || 0}
                </div>
                <div className="text-sm text-gray-600">Weekly Active Users</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {overview?.engagement?.monthlyActiveUsers || 0}
                </div>
                <div className="text-sm text-gray-600">Monthly Active Users</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {Math.round(overview?.engagement?.avgSessionDuration || 0)}m
                </div>
                <div className="text-sm text-gray-600">Avg Session Duration</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {overview?.engagement?.totalTrades || 0}
                </div>
                <div className="text-sm text-gray-600">Total Trades</div>
              </div>
            </div>

          </div>

          {/* Revenue Metrics */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4 text-[#2EBD85]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
              <h2 className="text-lg font-bold text-gray-900">Revenue & Monetization</h2>
            </div>
            
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ${Number(overview?.revenue?.arpu || 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">ARPU</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  ${Number(overview?.revenue?.arppu || 0).toFixed(2)}
                </div>
                <div className="text-sm text-gray-600">ARPPU</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {(Number(overview?.revenue?.conversionRate || 0) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Conversion Rate</div>
              </div>
              
              <div>
                <div className="text-2xl font-bold text-gray-900 mb-1">
                  {overview?.revenue?.totalPayingUsers || 0}
                </div>
                <div className="text-sm text-gray-600">Paying Users</div>
              </div>
            </div>

          </div>

          {/* User Acquisition Metrics */}
          {overview?.acquisition && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-purple-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">User Acquisition</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {overview.acquisition.totalSignups}
                  </div>
                  <div className="text-sm text-gray-600">Total Signups</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {overview.acquisition.totalFirstTrades}
                  </div>
                  <div className="text-sm text-gray-600">First Trades</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {(Number(overview.acquisition.tradeOpenRate) * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">Trade Open Rate</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {Math.round(overview.acquisition.avgTimeToFirstTrade)}m
                  </div>
                  <div className="text-sm text-gray-600">Avg Time to First Trade</div>
                </div>
              </div>
            </div>
          )}

          {/* Ad Performance Metrics */}
          {adPerformanceData && (
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                  </svg>
                </div>
                <h2 className="text-lg font-bold text-gray-900">Ad Performance</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${Number(adPerformanceData.totalAdSpend).toLocaleString()}
                  </div>
                  <div className="text-sm text-gray-600">Total Ad Spend</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${adPerformanceData.avgCPI}
                  </div>
                  <div className="text-sm text-gray-600">CPI (Cost Per Install)</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${adPerformanceData.avgCPA}
                  </div>
                  <div className="text-sm text-gray-600">CPA (Cost Per Action)</div>
                </div>
                
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {Number(adPerformanceData.avgROAS).toFixed(2)}x
                  </div>
                  <div className="text-sm text-gray-600">ROAS (Return On Ad Spend)</div>
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

export default AdminAnalytics;