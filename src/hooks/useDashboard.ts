import { useState, useEffect, useCallback } from 'react';
import { useUser } from './useUser';

export interface DashboardStats {
  totalTrades: number;
  totalVolume: number;
  totalProfit: number;
  successRate: number;
  maxProfit: number;
  maxLoss: number;
  avgTradeAmount: number;
}

export interface TopDeal {
  id: number;
  symbol: string;
  amount: number;
  profit: number;
  multiplier: number;
  openedAt: string;
  closedAt: string;
  duration: number; // in minutes
}

export interface ProfitChartData {
  date: string;
  profit: number;
  trades: number;
}

export const useDashboard = () => {
  const { user } = useUser();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [topDeals, setTopDeals] = useState<TopDeal[]>([]);
  const [profitChart, setProfitChart] = useState<ProfitChartData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch dashboard stats
  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setError(null);
      const response = await fetch('/api/dashboard/stats', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard stats');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch stats');
    }
  }, [user?.id]);

  // Fetch top deals
  const fetchTopDeals = useCallback(async (limit: number = 5) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/dashboard/top-deals?limit=${limit}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch top deals');
      }
      
      const result = await response.json();
      setTopDeals(result.deals || []);
    } catch (err) {
      console.error('Error fetching top deals:', err);
    }
  }, [user?.id]);

  // Fetch profit chart data
  const fetchProfitChart = useCallback(async (days: number = 30) => {
    if (!user?.id) return;
    
    try {
      const response = await fetch(`/api/dashboard/profit-chart?days=${days}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch profit chart data');
      }
      
      const result = await response.json();
      setProfitChart(result.data || []);
    } catch (err) {
      console.error('Error fetching profit chart:', err);
    }
  }, [user?.id]);

  // Refresh all dashboard data
  const refreshDashboard = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    await Promise.all([
      fetchStats(),
      fetchTopDeals(),
      fetchProfitChart()
    ]);
    setIsLoading(false);
  }, [user?.id, fetchStats, fetchTopDeals, fetchProfitChart]);

  // Auto-fetch data when user changes
  useEffect(() => {
    if (user?.id) {
      refreshDashboard();
    }
  }, [user?.id, refreshDashboard]);

  return {
    // Data
    stats,
    topDeals,
    profitChart,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchStats,
    fetchTopDeals,
    fetchProfitChart,
    refreshDashboard,
  };
};

// Enhanced hook with real-time updates
export const useLiveDashboard = (refreshInterval: number = 30000) => {
  const dashboard = useDashboard();

  useEffect(() => {
    if (!dashboard.stats || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      dashboard.fetchStats();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [dashboard.stats, dashboard.fetchStats, refreshInterval]);

  return dashboard;
};

// Admin dashboard hook
export const useAdminAnalytics = () => {
  const [overview, setOverview] = useState<any>(null);
  const [engagementData, setEngagementData] = useState<any[]>([]);
  const [revenueData, setRevenueData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOverview = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/admin/analytics/overview', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch admin overview');
      }
      
      const data = await response.json();
      setOverview(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch overview');
    }
  }, []);

  const fetchEngagement = useCallback(async (days: number = 30) => {
    try {
      const response = await fetch(`/api/admin/analytics/engagement?days=${days}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        setEngagementData(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching engagement data:', err);
    }
  }, []);

  const fetchRevenue = useCallback(async (days: number = 30) => {
    try {
      const response = await fetch(`/api/admin/analytics/revenue?days=${days}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const result = await response.json();
        setRevenueData(result.data || []);
      }
    } catch (err) {
      console.error('Error fetching revenue data:', err);
    }
  }, []);

  const processDailyMetrics = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/analytics/process-daily', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        // Refresh data after processing
        await Promise.all([fetchOverview(), fetchEngagement(), fetchRevenue()]);
        return true;
      }
      
      return false;
    } catch (err) {
      console.error('Error processing daily metrics:', err);
      return false;
    }
  }, [fetchOverview, fetchEngagement, fetchRevenue]);

  const refreshAdmin = useCallback(async (days: number = 30) => {
    setIsLoading(true);
    await Promise.all([
      fetchOverview(),
      fetchEngagement(days),
      fetchRevenue(days)
    ]);
    setIsLoading(false);
  }, [fetchOverview, fetchEngagement, fetchRevenue]);

  useEffect(() => {
    refreshAdmin();
  }, [refreshAdmin]);

  return {
    // Data
    overview,
    engagementData,
    revenueData,
    
    // State
    isLoading,
    error,
    
    // Actions
    fetchOverview,
    fetchEngagement,
    fetchRevenue,
    processDailyMetrics,
    refreshAdmin,
  };
};