import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Group } from '@visx/group';
import { curveMonotoneX } from '@visx/curve';
import { LinePath, AreaClosed } from '@visx/shape';
import { scaleLinear, scalePoint } from '@visx/scale';
import { AxisLeft } from '@visx/axis';
import { GridRows } from '@visx/grid';
import { localPoint } from '@visx/event';
import { Tooltip, useTooltip, defaultStyles } from '@visx/tooltip';
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
  
  // Tooltip hook
  const {
    tooltipData,
    tooltipLeft,
    tooltipTop,
    tooltipOpen,
    showTooltip,
    hideTooltip,
  } = useTooltip();

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


  // For chart, use individual trade data instead of daily P&L
  const [tradeResults, setTradeResults] = useState<Array<{profit: number, symbol: string, id: string}>>([]);
  
  // Prepare chart data from closed deals
  useEffect(() => {
    const fetchTradeResults = async () => {
      if (!user) return;
      
      try {
        const response = await fetch(`${config.api.baseUrl}/deals/user`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const result = await response.json();
          
          if (Array.isArray(result)) {
            console.log('🔍 All deals from API:', result);
            const closedDeals = result
              .filter(deal => {
                const isClosed = deal.status === 'closed';
                const hasProfit = deal.profit !== undefined && deal.profit !== null;
                console.log(`Deal ${deal.id}: closed=${isClosed}, profit=${deal.profit}, hasProfit=${hasProfit}`);
                return isClosed;
              })
              .map(deal => ({
                profit: Number(deal.profit || 0),
                symbol: deal.symbol,
                id: deal.id
              }));
            
            console.log('📈 Trade Results after filter:', closedDeals);
            setTradeResults(closedDeals);
          }
        }
      } catch (error) {
        console.error('Error fetching trade results:', error);
      }
    };
    
    fetchTradeResults();
  }, [user]);
  
  // Create daily P/L chart data
  let chartDataSource = [];
  
  console.log('📅 Daily P/L Data:', dailyPnL);
  
  if (dailyPnL.length > 0) {
    // Use actual daily P/L data from API
    chartDataSource = dailyPnL.map(day => ({
      date: new Date(day.date).toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      pnl: day.pnl,
      isProfit: day.isProfit,
      symbol: '',
      tradeProfit: day.pnl
    }));
  } else if (tradeResults.length > 0) {
    // Fallback: group trades by day
    const tradesByDay = new Map();
    
    tradeResults.forEach(trade => {
      // Assume trades are from today if no date info
      const date = new Date().toISOString().split('T')[0];
      if (!tradesByDay.has(date)) {
        tradesByDay.set(date, 0);
      }
      tradesByDay.set(date, tradesByDay.get(date) + trade.profit);
    });
    
    chartDataSource = Array.from(tradesByDay.entries()).map(([date, pnl]) => ({
      date: new Date(date).toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit' 
      }),
      pnl,
      isProfit: pnl >= 0,
      symbol: '',
      tradeProfit: pnl
    }));
  }
  
  const chartData = chartDataSource.map((day, index) => ({
    name: day.date,
    pnl: day.pnl,
    index
  }));

  // Debug logging
  console.log('📊 Chart Debug:', {
    dailyPnLLength: dailyPnL.length,
    dailyPnL,
    chartData,
    chartDataSource,
    isLoadingChart
  });
  
  console.log('💰 User Stats Debug:', {
    totalTrades,
    maxTradeAmount,
    maxProfit, 
    maxLoss,
    successRate,
    avgTradeAmount,
    userTradesCount: user?.tradesCount,
    userTotalVolume: user?.totalTradesVolume,
    userMaxProfit: user?.maxProfit,
    userMaxLoss: user?.maxLoss,
    userSuccessRate: user?.successfulTradesPercentage,
    userAvgAmount: user?.averageTradeAmount
  });

  // Determine line color based on final cumulative P/L value
  const finalValue = chartDataSource.length > 0 ? chartDataSource[chartDataSource.length - 1].pnl : 0;
  const lineColor = finalValue >= 0 ? '#2EBD85' : '#F6465D';

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#F1F7FF] p-4">
        <div className="max-w-2xl mx-auto pb-20">
          <div className="mb-6">
            <h1 className="text-3xl font-semibold text-gray-900">{t('analytics.title')}</h1>
            <p className="text-sm text-gray-500 mt-1">{t('analytics.subtitle')}</p>
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
            <h1 className="text-lg font-bold text-white">{t('analytics.title')}</h1>
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
            {t('analytics.tradingStatistics')}
          </h2>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Total Trades */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#0C54EA] rounded-full flex items-center justify-center flex-shrink-0">
                <ChartNoAxesCombined className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{totalTrades}</p>
                <p className="text-xs text-gray-600 truncate">{t('home.totalTrades')}</p>
              </div>
            </div>

            {/* Success Rate */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center flex-shrink-0">
                <DiamondPlus className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{successRate}</p>
                <p className="text-xs text-gray-600 truncate">{t('profile.successRate') || 'Success Rate'}</p>
              </div>
            </div>

            {/* Max Trade Amount */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#8B5CF6] rounded-full flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{maxTradeAmount}</p>
                <p className="text-xs text-gray-600 truncate">{t('profile.maxTradeAmount') || 'Max Trade Amount'}</p>
              </div>
            </div>

            {/* Avg Trade Amount */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#F59E0B] rounded-full flex items-center justify-center flex-shrink-0">
                <ChevronsLeftRight className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{avgTradeAmount}</p>
                <p className="text-xs text-gray-600 truncate">{t('profile.avgTradeAmount') || 'Avg Trade Amount'}</p>
              </div>
            </div>

            {/* Max Profit */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#2EBD85] rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingUp className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{maxProfit}</p>
                <p className="text-xs text-gray-600 truncate">{t('profile.maxProfit') || 'Max Profit'}</p>
              </div>
            </div>

            {/* Max Loss */}
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-[#F6465D] rounded-full flex items-center justify-center flex-shrink-0">
                <TrendingDown className="w-4 h-4 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-lg font-bold text-gray-900 truncate">{maxLoss}</p>
                <p className="text-xs text-gray-600 truncate">{t('profile.maxLoss') || 'Max Loss'}</p>
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
            {t('analytics.profitAndLoss')}
          </h2>
          
          <div className="grid grid-cols-1 gap-4">
            {/* Total P/L */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-xs text-gray-600">{t('analytics.totalPL')}</p>
                <p className={`text-xl font-bold ${totalPLColor}`}>{totalPLFormatted}</p>
              </div>
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${totalPL >= 0 ? 'bg-[#2EBD85]' : 'bg-[#F6465D]'}`}>
                {totalPL >= 0 ? (
                  <TrendingUp className="w-5 h-5 text-white" />
                ) : (
                  <TrendingDown className="w-5 h-5 text-white" />
                )}
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
            {t('analytics.topTrades')}
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
              <p>{t('analytics.noProfitableTrades')}</p>
            </div>
          )}
        </div>

        </div>
      </div>
      
      <BottomNavigation />
    </div>
  );
};

export default UserAnalytics;