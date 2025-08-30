import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createChart, LineSeries } from 'lightweight-charts';
import type { ISeriesApi, Time, IChartApi } from 'lightweight-charts';
import { useTranslation } from '../lib/i18n';
import { useUser } from '../hooks/useUser';
import { formatMoneyShort } from '../lib/numberUtils';
import { config } from '../lib/config';
import BottomNavigation from '../components/ui/BottomNavigation';
import { 
  ArrowLeft, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  ChartCandlestick, 
  ChartNoAxesCombined,
  ArrowUpRight,
  DiamondPlus,
  ChevronsLeftRight,
  LineChart,
  TrendingUpDown
} from 'lucide-react';

interface TopTrade {
  id: string;
  symbol: string;
  profit: string;
  openPrice: string;
  closePrice: string;
  direction: string;
  openedAt: string;
  closedAt: string;
  profitPercentage: number;
  duration: number;
}

const UserAnalytics: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading } = useUser();
  const { t } = useTranslation();
  const [topTrades, setTopTrades] = useState<TopTrade[]>([]);
  const [isLoadingTrades, setIsLoadingTrades] = useState(false);
  const [realTotalPL, setRealTotalPL] = useState<number | null>(null);
  const [dailyPnL, setDailyPnL] = useState<Array<{date: string, pnl: number, isProfit: boolean}>>([]);
  const [isLoadingChart, setIsLoadingChart] = useState(false);
  const [userRating, setUserRating] = useState<{ rank: number; total: number } | null>(null);
  const [isLoadingRating, setIsLoadingRating] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null);

  const handleBack = () => {
    navigate(-1);
  };

  // Используем реальные данные пользователя или значения по умолчанию
  const totalTrades = user?.tradesCount ?? 1;
  const na = t('common.na');
  const maxTradeAmount = user?.totalTradesVolume ? formatMoneyShort(user.totalTradesVolume) : na;
  const maxProfit = user?.maxProfit ? formatMoneyShort(user.maxProfit) : na;
  const successRate = user?.successfulTradesPercentage ? `${user.successfulTradesPercentage}%` : na;
  const avgTradeAmount = user?.averageTradeAmount ? formatMoneyShort(user.averageTradeAmount) : na;
  const maxLoss = user?.maxLoss ? formatMoneyShort(-Math.abs(Number(user.maxLoss))) : na;
  
  // Общий P/L - используем реальный рассчитанный или fallback
  const totalPL = realTotalPL !== null ? realTotalPL : 0;
  const totalPLFormatted = totalPL >= 0 ? `+${formatMoneyShort(totalPL)}` : formatMoneyShort(totalPL);
  const totalPLColor = totalPL >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]';
  
  console.log('Total P/L display values:', {
    realTotalPL,
    realTotalPLIsNull: realTotalPL === null,
    finalTotalPL: totalPL,
    formatted: totalPLFormatted
  });

  // Загрузка топ сделок
  useEffect(() => {
    const fetchTopTrades = async () => {
      if (!user) return;
      
      setIsLoadingTrades(true);
      try {
        const url = `${config.api.baseUrl}/analytics/user/top-deals?limit=5`;
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('API Response:', result);
          
          if (result.success && result.data) {
            console.log('Top trades data:', result.data);
            result.data.forEach((trade: TopTrade, i: number) => {
              console.log(`Trade ${i+1}:`, {
                id: trade.id,
                symbol: trade.symbol,
                profit: trade.profit,
                profitNumber: Number(trade.profit),
                direction: trade.direction
              });
            });
            setTopTrades(result.data);
          } else {
            setTopTrades([]);
          }
        } else {
          console.error('Response not OK:', response.status);
          setTopTrades([]);
        }
      } catch (error) {
        console.error('Error fetching top trades:', error);
        setTopTrades([]);
      } finally {
        setIsLoadingTrades(false);
      }
    };

    fetchTopTrades();
  }, [user]);

  // Загрузка реального общего P/L
  useEffect(() => {
    const fetchTotalPL = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`${config.api.baseUrl}/deals/user`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          console.log('Total P/L - all deals:', result);
          
          if (Array.isArray(result)) {
            // Рассчитываем общий P/L из всех закрытых сделок
            const closedDeals = result.filter(deal => deal.status === 'closed' && deal.profit);
            console.log('Total P/L - closed deals with profit:', closedDeals);
            
            const totalProfit = closedDeals.reduce((sum, deal) => {
              const profit = Number(deal.profit || 0);
              console.log(`Deal ${deal.id}: ${deal.symbol} = ${profit}`);
              return sum + profit;
            }, 0);
            
            console.log('Total P/L calculated:', totalProfit);
            setRealTotalPL(totalProfit);
          }
        }
      } catch (error) {
        console.error('Error fetching total P/L:', error);
      }
    };

    fetchTotalPL();
  }, [user]);

  // Загрузка данных для графика P/L по дням
  useEffect(() => {
    const fetchDailyPnL = async () => {
      if (!user) return;
      
      console.log('Fetching daily P/L data...');
      setIsLoadingChart(true);
      try {
        const url = `${config.api.baseUrl}/analytics/user/daily-pnl`;
        console.log('Daily P/L API URL:', url);
        
        const response = await fetch(url, {
          credentials: 'include'
        });
        
        console.log('Daily P/L API Response status:', response.status);
        
        if (response.ok) {
          const result = await response.json();
          console.log('Daily P/L API Result:', result);
          
          if (result.success && result.data) {
            setDailyPnL(result.data);
            console.log('Daily P/L data set:', result.data);
          } else {
            console.log('No daily P/L data or not successful');
          }
        } else {
          console.error('Daily P/L API response not OK:', response.status);
        }
      } catch (error) {
        console.error('Error fetching daily P/L:', error);
      } finally {
        setIsLoadingChart(false);
      }
    };

    fetchDailyPnL();
  }, [user]);

  // Load user's rating position
  useEffect(() => {
    const fetchUserRating = async () => {
      if (!user) return;
      
      setIsLoadingRating(true);
      try {
        const response = await fetch(`${config.api.baseUrl}/rating/user/${user.id}?period=month`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const ratingData = await response.json();
          console.log('User rating data:', ratingData);
          
          // Also get total number of users for percentage calculation
          const totalUsersResponse = await fetch(`${config.api.baseUrl}/rating?period=month&limit=1&offset=9999`, {
            credentials: 'include'
          });
          
          let totalUsers = 0;
          if (totalUsersResponse.ok) {
            const totalData = await totalUsersResponse.json();
            // This is a hack to get total count - in production we'd add a count endpoint
            totalUsers = Math.max(ratingData.rank, 100); // Estimate based on rank
          }
          
          setUserRating({
            rank: ratingData.rank || 0,
            total: totalUsers
          });
        } else {
          console.error('Failed to fetch user rating:', response.status);
          setUserRating(null);
        }
      } catch (error) {
        console.error('Error fetching user rating:', error);
        setUserRating(null);
      } finally {
        setIsLoadingRating(false);
      }
    };

    fetchUserRating();
  }, [user]);

  // Initialize lightweight-charts when data is available
  useEffect(() => {
    if (!chartContainerRef.current || !dailyPnL.length || isLoadingChart) return;

    // Clear previous chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
      seriesRef.current = null;
    }

    // Create chart with professional styling similar to Chart.tsx
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 128,
      layout: { 
        background: { color: '#FFFFFF' }, 
        textColor: '#6B7280' 
      },
      grid: { 
        vertLines: { color: '#F3F4F6' }, 
        horzLines: { color: '#F3F4F6' } 
      },
      timeScale: {
        visible: true,
        timeVisible: false,
        secondsVisible: false,
        borderVisible: false,
        rightOffset: 10,
        tickMarkFormatter: (time: Time) => {
          // Simple day formatting for daily P/L
          const index = typeof time === 'number' ? time : 0;
          return dailyPnL[index]?.date || '';
        },
      },
      rightPriceScale: { 
        borderColor: '#E5E7EB',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: '#9CA3AF',
          width: 1,
          style: 1,
        },
        horzLine: {
          color: '#9CA3AF', 
          width: 1,
          style: 1,
        },
      },
      handleScroll: {
        mouseWheel: false,
        pressedMouseMove: false,
      },
      handleScale: {
        mouseWheel: false,
        pinch: false,
      },
    });

    chartRef.current = chart;

    // Determine line color based on overall trend
    const totalTrend = dailyPnL[dailyPnL.length - 1].pnl - dailyPnL[0].pnl;
    const lineColor = totalTrend >= 0 ? '#2EBD85' : '#F6465D';

    // Create line series with professional styling
    const series = chart.addSeries(LineSeries, {
      color: lineColor,
      lineWidth: 2,
      lineStyle: 0,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: lineColor,
      crosshairMarkerBackgroundColor: lineColor,
      priceFormat: {
        type: 'custom',
        formatter: (price: number) => {
          return price >= 0 ? `+$${Math.abs(price).toFixed(2)}` : `-$${Math.abs(price).toFixed(2)}`;
        },
      },
    });

    seriesRef.current = series;

    // Transform data for lightweight-charts format
    const chartData = dailyPnL.map((day, index) => ({
      time: index as Time, // Use index as time for simple day sequence
      value: day.pnl,
    }));

    // Set data
    series.setData(chartData);

    // Auto-fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current && chartRef.current) {
        chartRef.current.resize(chartContainerRef.current.clientWidth, 128);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
        chartRef.current = null;
        seriesRef.current = null;
      }
    };
  }, [dailyPnL, isLoadingChart]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F1F7FF] p-4">
        <div className="max-w-2xl mx-auto pb-20">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-1">Your trading performance</p>
          </div>
          
          {/* Loading skeleton */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 rounded mb-2 animate-pulse" />
                      <div className="h-3 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-4 h-64 animate-pulse" />
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
            <h1 className="text-lg font-bold text-white">Analytics</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 bg-[#F1F7FF] px-4 pb-8">
        <div className="max-w-2xl mx-auto space-y-4">

        {/* Trading Statistics */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-4 h-4 text-[#0C54EA]" />
            </div>
            Trading Statistics
          </h2>
          
          <div className="grid grid-cols-2 gap-8">
            {/* Total Trades */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#0C54EA] rounded-full flex items-center justify-center flex-shrink-0">
                <ChartNoAxesCombined className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{totalTrades}</p>
                <p className="text-sm text-gray-600 truncate">{t('home.totalTrades')}</p>
              </div>
            </div>

            {/* Success Rate */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0">
                <DiamondPlus className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{successRate}</p>
                <p className="text-sm text-gray-600 truncate">{t('profile.successRate') || 'Success Rate'}</p>
              </div>
            </div>

            {/* Max Trade Amount */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#8B5CF6] rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{maxTradeAmount}</p>
                <p className="text-sm text-gray-600 truncate">{t('profile.maxTradeAmount') || 'Max Trade Amount'}</p>
              </div>
            </div>

            {/* Avg Trade Amount */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F59E0B] rounded-full flex items-center justify-center flex-shrink-0">
                <ChevronsLeftRight className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{avgTradeAmount}</p>
                <p className="text-sm text-gray-600 truncate">{t('profile.avgTradeAmount') || 'Avg Trade Amount'}</p>
              </div>
            </div>

            {/* Max Profit */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#2EBD85] rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{maxProfit}</p>
                <p className="text-sm text-gray-600 truncate">{t('profile.maxProfit') || 'Max Profit'}</p>
              </div>
            </div>

            {/* Max Loss */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-[#F6465D] rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 truncate">{maxLoss}</p>
                <p className="text-sm text-gray-600 truncate">{t('profile.maxLoss') || 'Max Loss'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* P/L Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <LineChart className="w-4 h-4 text-[#0C54EA]" />
            </div>
            Profit & Loss
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Total P/L */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Total P/L</p>
                <p className={`text-2xl font-bold ${totalPLColor}`}>{totalPLFormatted}</p>
              </div>
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalPL >= 0 ? 'bg-[#2EBD85]' : 'bg-[#F6465D]'}`}>
                {totalPL >= 0 ? (
                  <TrendingUp className="w-6 h-6 text-white" />
                ) : (
                  <TrendingDown className="w-6 h-6 text-white" />
                )}
              </div>
            </div>

            {/* User Rating Position */}
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-100">
              <div>
                <p className="text-sm text-gray-600">Rating Position</p>
                {isLoadingRating ? (
                  <div className="h-8 w-20 bg-gray-200 rounded animate-pulse"></div>
                ) : userRating ? (
                  <div className="flex items-baseline gap-2">
                    <p className="text-2xl font-bold text-[#0C54EA]">#{userRating.rank}</p>
                    {userRating.total > 0 && (
                      <p className="text-sm text-gray-500">
                        / {userRating.total} ({Math.round(((userRating.total - userRating.rank + 1) / userRating.total) * 100)}% percentile)
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xl font-medium text-gray-400">Not ranked</p>
                )}
              </div>
              <div className="w-12 h-12 bg-gradient-to-r from-[#0C54EA] to-[#8B5CF6] rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            </div>
            
          </div>
        </div>

        {/* Top Trades Section */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <ChartCandlestick className="w-4 h-4 text-[#0C54EA]" />
            </div>
            Top 5 Trades
          </h2>
          
          {isLoadingTrades ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 rounded-full" />
                    <div>
                      <div className="h-4 w-20 bg-gray-200 rounded mb-1" />
                      <div className="h-3 w-16 bg-gray-200 rounded" />
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="h-4 w-16 bg-gray-200 rounded mb-1" />
                    <div className="h-3 w-12 bg-gray-200 rounded" />
                  </div>
                </div>
              ))}
            </div>
          ) : topTrades.length > 0 ? (
            <div className="space-y-3">
              {topTrades.map((trade, index) => (
                <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                      index === 0 ? 'bg-[#F5A600]' : 'bg-gray-400'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{trade.symbol}</p>
                      <p className={`text-sm font-medium capitalize flex items-center gap-1 ${
                        trade.direction === 'up' ? 'text-[#2EBD85]' : 'text-[#F6465D]'
                      }`}>
                        {trade.direction === 'up' ? '↗' : '↘'} {trade.direction}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${Number(trade.profit) >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'}`}>
                      {Number(trade.profit) >= 0 ? '+' : ''}{formatMoneyShort(Number(trade.profit))}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(trade.openedAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No profitable trades yet</p>
            </div>
          )}
        </div>

        {/* Performance Charts */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-50 rounded-lg flex items-center justify-center">
              <TrendingUpDown className="w-4 h-4 text-[#0C54EA]" />
            </div>
            Performance Trends
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Average Performance Indicators */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-[#F59E0B] rounded-full flex items-center justify-center">
                    <ChevronsLeftRight className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-600">Avg Trade Size</p>
                <p className="text-xl font-bold text-gray-900">{avgTradeAmount}</p>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg text-center">
                <div className="flex items-center justify-center mb-2">
                  <div className="w-8 h-8 bg-[#10B981] rounded-full flex items-center justify-center">
                    <DiamondPlus className="w-4 h-4 text-white" />
                  </div>
                </div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-xl font-bold text-gray-900">{successRate}</p>
              </div>
            </div>
            
            {/* Daily P/L Chart */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-gray-600">Daily P/L (Last 7 Days)</p>
                {dailyPnL.length > 0 && !isLoadingChart && (
                  <div className="text-xs text-gray-500">
                    {dailyPnL.filter(d => d.isProfit).length}/{dailyPnL.length} profitable days
                  </div>
                )}
              </div>
              
              {isLoadingChart ? (
                <div className="flex items-center justify-center h-40">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0C54EA]"></div>
                </div>
              ) : dailyPnL.length === 0 ? (
                // No data state
                <div className="flex flex-col items-center justify-center h-40 text-gray-400">
                  <LineChart className="w-12 h-12 mb-3 text-gray-300" />
                  <p className="text-sm font-medium">No trading activity yet</p>
                  <p className="text-xs text-gray-400 mt-1">Start trading to see your daily P/L</p>
                </div>
              ) : (
                // Professional Line Chart Implementation using lightweight-charts
                <div className="relative">
                  {/* Chart Container */}
                  <div className="relative bg-white rounded-lg border border-gray-200">
                    <div
                      ref={chartContainerRef}
                      className="w-full"
                      style={{ height: 128 }}
                    />
                  </div>
                  
                  {/* Chart summary stats */}
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Best Day</div>
                        <div className={`text-sm font-semibold ${
                          Math.max(...dailyPnL.map(d => d.pnl)) >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'
                        }`}>
                          {(() => {
                            const best = Math.max(...dailyPnL.map(d => d.pnl));
                            return best >= 0 ? `+${formatMoneyShort(best)}` : formatMoneyShort(best);
                          })()}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Worst Day</div>
                        <div className="text-sm font-semibold text-[#F6465D]">
                          {formatMoneyShort(Math.min(...dailyPnL.map(d => d.pnl)))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 mb-1">Avg Daily</div>
                        <div className={`text-sm font-semibold ${
                          dailyPnL.reduce((sum, d) => sum + d.pnl, 0) >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'
                        }`}>
                          {(() => {
                            const avg = dailyPnL.reduce((sum, d) => sum + d.pnl, 0) / dailyPnL.length;
                            return avg >= 0 ? `+${formatMoneyShort(avg)}` : formatMoneyShort(avg);
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default UserAnalytics;