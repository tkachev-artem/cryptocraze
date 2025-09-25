import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Eye, 
  Users, 
  UserCheck, 
  TrendingUp, 
  BarChart3, 
  Monitor, 
  MousePointer, 
  Wallet, 
  RotateCcw, 
  UserMinus, 
  GraduationCap, 
  CheckCircle, 
  SkipForward, 
  Activity, 
  ArrowUpRight, 
  ArrowDownRight, 
  Hand, 
  Gift, 
  Play, 
  Shield,
  DollarSign
} from 'lucide-react';
import { AreaChart, Card } from '@tremor/react';
import { config } from '../../lib/config';
import MetricTable from './components/MetricTable';
import MetricFilters from './components/MetricFilters';
// Конфиги графиков встроены, чтобы избежать проблем с импортом
import { engagementMetrics } from '@/pages/Admin/metrics/engagement/config/metrics.tsx';
import { engagementChartConfig } from '@/pages/Admin/metrics/engagement/config/chart.ts';
import { getTutorialChartConfig } from '@/pages/Admin/metrics/tutorial/config/chart.ts';
import { getRetentionChartConfig } from '@/pages/Admin/metrics/retention/config/retentionChart.ts';
import { RetentionMetric } from '@/pages/Admin/metrics/retention/types/retention.ts';

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

type Metric = {
  id: string;
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  category: string;
  description: string;
};

type MetricRowProps = {
  metric: Metric;
  isSelected: boolean;
  onClick: () => void;
};

const MetricRow: React.FC<MetricRowProps> = ({ metric, isSelected, onClick }) => (
  <button
    onClick={onClick}
    className={`w-full text-left p-2 rounded-lg transition-all duration-200 flex items-center gap-2 hover:bg-gray-50 ${
      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
    }`}
  >
    <div className={`p-1.5 rounded-lg ${metric.color} flex-shrink-0`}>
      {metric.icon}
    </div>
    <div className="flex-1 min-w-0">
      <div className="text-sm font-medium text-gray-900 truncate">{metric.title}</div>
      <div className="text-xs text-gray-500 truncate">{metric.description}</div>
    </div>
  </button>
);

const UserAnalytics: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [metricsData, setMetricsData] = useState<Record<string, string | number>>({});
  const [chartData, setChartData] = useState<Array<{ date: string; [key: string]: number | string }>>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [dynamicOverallPercent, setDynamicOverallPercent] = useState<number | null>(null);
  const [dynamicYAxisMaxValue, setDynamicYAxisMaxValue] = useState<number | null>(null);
  
  const Y_AXIS_MULTIPLIER = 1.2; // Можно изменить на 1.3, 1.5 и т.д.

  // Определение метрик, для которых процент рассчитывается динамически
  const dynamicPercentageMetricIds = new Set([
    'tutorial_start', 'tutorial_complete', 'tutorial_skip_rate',
    'pro_tutorial_start', 'pro_tutorial_complete', 'pro_tutorial_skip_rate',
    'D1', 'D3', 'D7', 'D30',
  ]);

  // Функция для получения конфига графика в зависимости от metricId
  const getMetricChartConfig = (metricId: string) => {
    const tutorialMetricIds = new Set([
      'tutorial_start', 'tutorial_complete', 'tutorial_skip', 'tutorial_skip_rate',
      'pro_tutorial_start', 'pro_tutorial_complete', 'pro_tutorial_skip', 'pro_tutorial_skip_rate'
    ]);
    const retentionMetricIds = new Set<RetentionMetric>(['D1', 'D3', 'D7', 'D30', 'churn_rate']);

    if (tutorialMetricIds.has(metricId)) {
      return getTutorialChartConfig(metricId as any);
    } else if (retentionMetricIds.has(metricId as RetentionMetric)) {
      return getRetentionChartConfig(metricId as RetentionMetric);
    } else if (metricId === 'trades_per_user') {
      return {
        categories: ['Trades'],
        colors: ['blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => value.toString(),
        tooltipLabel: 'Trades',
        tooltipValue: (value: number) => value.toString()
      };
    } else if (metricId === 'daily_reward_claimed') {
      return {
        categories: ['Rewards'],
        colors: ['blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => value.toString(),
        tooltipLabel: 'Rewards',
        tooltipValue: (value: number) => value.toString()
      };
    } else if (['sessions', 'screens_opened', 'avg_virtual_balance'].includes(metricId)) {
      return {
        ...engagementChartConfig,
        tooltipLabel: (engagementChartConfig.tooltipLabel as Function)(metricId)
      };
    } else {
      // Дефолтный конфиг, если метрика не найдена
      return {
        categories: ['Users'],
        colors: ['blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => value.toString(),
        tooltipLabel: 'Users',
        tooltipValue: (value: number) => value.toString()
      };
    }
  };

  const getMetricValueFormatter = (metricId: string) => {
    const config = getMetricChartConfig(metricId);
    return config.valueFormatter;
  };

  const getMetricTooltipValueFormatter = (metricId: string) => {
    const config = getMetricChartConfig(metricId);
    return config.tooltipValue;
  };

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    console.log('[UserAnalytics] Initial dateRange (UTC): ', { startDate: start.toISOString(), endDate: end.toISOString() });
    return { startDate: start, endDate: end, label: 'Last 7 days' };
  });
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Define all metrics with their properties
  const allMetrics: Metric[] = [
    // User Acquisition
    { id: 'first_open', title: 'First Open', value: '—', icon: <Eye className="w-4 h-4 text-white" />, color: 'bg-indigo-500', category: 'Acquisition', description: 'Users who opened app' },
    { id: 'signup_rate', title: 'Signup Rate', value: '—', icon: <UserCheck className="w-4 h-4 text-white" />, color: 'bg-green-500', category: 'Acquisition', description: 'Conversion from visitor to user' },

    // Engagement (теперь импортируются)
    ...engagementMetrics,
    
    // Retention
    { id: 'D1', title: 'D1 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-orange-500', category: 'Retention', description: 'Active for 1+ days' },
    { id: 'D3', title: 'D3 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Retention', description: 'Active for 3+ days' },
    { id: 'D7', title: 'D7 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-yellow-500', category: 'Retention', description: 'Active for 7+ days' },
    { id: 'D30', title: 'D30 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-lime-500', category: 'Retention', description: 'Active for 30+ days' },
    { id: 'churn_rate', title: 'Churn Rate', value: '—', icon: <UserMinus className="w-4 h-4 text-white" />, color: 'bg-red-500', category: 'Retention', description: 'Who stopped using app' },
    
    // Tutorial
    { id: 'tutorial_start', title: 'Tutorial Start', value: '—', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-blue-600', category: 'Tutorial', description: 'Users who started tutorial' },
    { id: 'tutorial_complete', title: 'Tutorial Complete', value: '—', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-green-600', category: 'Tutorial', description: 'Users who completed tutorial' },

    // Pro Tutorial
    { id: 'pro_tutorial_start', title: 'Pro Tutorial Start', value: '—', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-purple-600', category: 'Tutorial', description: 'Premium users who started pro tutorial' },
    { id: 'pro_tutorial_complete', title: 'Pro Tutorial Complete', value: '—', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-indigo-600', category: 'Tutorial', description: 'Premium users who completed pro tutorial' },
    
    // Trading
    { id: 'trades_per_user', title: 'Trades/User', value: '0', icon: <DollarSign className="w-4 h-4 text-white" />, color: 'bg-fuchsia-600', category: 'Trading', description: 'Number of trades per user' },
    { id: 'order_open', title: 'Order Open', value: '—', icon: <ArrowUpRight className="w-4 h-4 text-white" />, color: 'bg-green-600', category: 'Trading', description: 'Total orders placed' },
    { id: 'order_close', title: 'Order Close', value: '—', icon: <Hand className="w-4 h-4 text-white" />, color: 'bg-blue-600', category: 'Trading', description: 'Orders closed manually by users' },
    
    // Gamification & Ads
    { id: 'daily_reward_claimed', title: 'Daily Reward', value: '—', icon: <Gift className="w-4 h-4 text-white" />, color: 'bg-yellow-600', category: 'Gamification', description: 'Users who claimed daily rewards' },
    { id: 'ads_watched', title: 'Ads Watched', value: '—', icon: <Play className="w-4 h-4 text-white" />, color: 'bg-red-600', category: 'Ads', description: 'Total ads viewed by users' },
    { id: 'ads_consent', title: 'Ads Consent', value: '—', icon: <Shield className="w-4 h-4 text-white" />, color: 'bg-slate-500', category: 'Ads', description: 'Users who gave ads consent' },
  ];

  const loadChartData = async (metricId: string) => {
    setChartLoading(true);
    setChartError(null);

    try {
      // Build query parameters with date range and filters
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        ...Object.fromEntries(
          Object.entries(selectedFilters).map(([key, values]) => {
            // Преобразуем geography в country для сервера
            const serverKey = key === 'geography' ? 'country' : key;
            return [serverKey, values.join(',')];
          })
        )
      });

      let apiUrl = `${config.api.baseUrl}/admin/dashboard/metric/${metricId}/trend?${params}`;

      if (metricId === 'trades_per_user') {
        apiUrl = `${config.api.baseUrl}/admin/dashboard/chart/trades_by_date?${params}`;
      } else if (metricId === 'order_open') {
        apiUrl = `${config.api.baseUrl}/admin/dashboard/metric/order_open/trend?${params}`;
      } else if (metricId === 'order_close') {
        apiUrl = `${config.api.baseUrl}/admin/dashboard/metric/order_close/trend?${params}`;
      }

      const response = await fetch(apiUrl, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();

        // Единый формат для всех метрик (как retention): { date, value } => { date, Users }
        // Обработка разных типов ответов с бэкенда
        let trendData: Array<{ date: string; value: number }> = [];
        let totalValue: number | null = null;
        let totalDenominator: number | null = null;

        if (metricId === 'sessions') {
          const { trend, totalSessions, totalUsers } = data;
          trendData = trend;
          // Для метрики 'sessions' обновляем dynamicYAxisMaxValue на основе максимального значения в тренде
          const maxDataValue = trendData.reduce((max: number, item: any) => Math.max(max, item.value || 0), 0);
          const currentMultiplier = maxDataValue < 3 ? 3 : (maxDataValue <= 5 ? 2 : (maxDataValue > 10 ? 1 : Y_AXIS_MULTIPLIER));
          const calculatedMaxValue = Math.ceil(maxDataValue * currentMultiplier);
          setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1); // Убедимся, что это не 0
          if (totalUsers > 0) {
            totalValue = parseFloat((totalSessions / totalUsers).toFixed(2)); // Среднее количество сессий на пользователя
          } else {
            totalValue = 0;
          }
        } else if (metricId === 'screens_opened') {
          const { trend, totalScreensOpened } = data;
          trendData = trend;
          // Для метрики 'screens_opened' также обновляем dynamicYAxisMaxValue
          const maxDataValue = trendData.reduce((max: number, item: any) => Math.max(max, item.value || 0), 0);
          const currentMultiplier = maxDataValue < 3 ? 3 : (maxDataValue <= 5 ? 2 : (maxDataValue > 10 ? 1 : Y_AXIS_MULTIPLIER));
          const calculatedMaxValue = Math.ceil(maxDataValue * currentMultiplier);
          setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1); // Убедимся, что это не 0
        } else if (metricId === 'daily_reward_claimed') {
          const { trend } = data;
          trendData = trend;
        } else if (metricId === 'trades_per_user') {
          trendData = data.map((item: any) => ({ date: item.date, value: item.count }));
          // Для метрики 'trades_per_user' также обновляем dynamicYAxisMaxValue на основе максимального значения в тренде
          const maxDataValue = trendData.reduce((max: number, item: any) => Math.max(max, item.value || 0), 0);
          const currentMultiplier = maxDataValue < 3 ? 3 : (maxDataValue <= 5 ? 2 : (maxDataValue > 10 ? 1 : Y_AXIS_MULTIPLIER));
          const calculatedMaxValue = Math.ceil(maxDataValue * currentMultiplier);
          setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1); // Убедимся, что это не 0
        } else if (metricId === 'avg_virtual_balance') {
          const { trend, avgBalance } = data;
          trendData = trend;
          totalValue = Math.floor(avgBalance);
          // Для метрики 'avg_virtual_balance' также обновляем dynamicYAxisMaxValue на основе avgBalance
          const maxDataValue = Math.floor(avgBalance); // Для плоского тренда maxDataValue - это сам avgBalance
          const currentMultiplier = maxDataValue < 3 ? 3 : (maxDataValue <= 5 ? 2 : (maxDataValue > 10 ? 1 : Y_AXIS_MULTIPLIER));
          const calculatedMaxValue = Math.ceil(maxDataValue * currentMultiplier);
          setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1); // Убедимся, что это не 0
        } else if (metricId === 'order_open' || metricId === 'order_close') {
          // generic trend array [{date, value}]
          trendData = data;
          const maxDataValue = trendData.reduce((max: number, item: any) => Math.max(max, item.value || 0), 0);
          const currentMultiplier = maxDataValue < 3 ? 3 : (maxDataValue <= 5 ? 2 : (maxDataValue > 10 ? 1 : Y_AXIS_MULTIPLIER));
          const calculatedMaxValue = Math.ceil(maxDataValue * currentMultiplier);
          setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1);
        } else {
          trendData = data; // Для tutorial и retention, где data - это уже массив тренда
          // Если метрика не попадает в перечисленные выше, используем максимальное значение из данных
          const maxDataValue = trendData.reduce((max: number, item: any) => Math.max(max, item.value || 0), 0);
          const currentMultiplier = maxDataValue < 3 ? 3 : (maxDataValue <= 5 ? 2 : (maxDataValue > 10 ? 1 : Y_AXIS_MULTIPLIER));
          const calculatedMaxValue = Math.ceil(maxDataValue * currentMultiplier);
          setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1);
        }

        if (dynamicPercentageMetricIds.has(metricId)) {
          const totalUsersResponse = await fetch(`${config.api.baseUrl}/admin/dashboard/total-users-in-period?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`, {
            credentials: 'include'
          });
          if (totalUsersResponse.ok) {
            const overviewData = await totalUsersResponse.json();
            // Для trades_per_user totalValue уже содержит totalTradingUsers
            const totalEventsForPercentage = totalValue !== null ? totalValue : trendData.reduce((sum: number, item: any) => sum + (item.value || 0), 0); 
            const totalUsersInPeriod = overviewData.totalUsers;

            const currentMultiplier = totalUsersInPeriod > 100 ? 1 : Y_AXIS_MULTIPLIER;
            // Удаляем расчет и установку dynamicYAxisMaxValue здесь, так как это делается в блоках выше.
            // const calculatedMaxValue = Math.ceil(totalUsersInPeriod * currentMultiplier);
            // setDynamicYAxisMaxValue(calculatedMaxValue > 0 ? calculatedMaxValue : 1); // Убедимся, что это не 0

            if (totalUsersInPeriod > 0) {
              const calculatedPercent = Math.round((totalEventsForPercentage / totalUsersInPeriod) * 100);
              setDynamicOverallPercent(calculatedPercent);
            } else {
              setDynamicOverallPercent(0);
            }
          } else {
            setDynamicOverallPercent(0);
            console.error('[UserAnalytics] Failed to fetch total users in period.');
          }
        } else {
          setDynamicOverallPercent(null); // Сбрасываем для метрик без процента
        }

        const formattedData: Array<{ date: string; [key: string]: number | string }> = trendData.map((item: any) => {
          const dateObj = new Date(item.date);
          if (isNaN(dateObj.getTime())) {
            console.error('[UserAnalytics] Invalid date received in trendData:', item.date);
            return { date: 'Invalid Date', [getMetricChartConfig(selectedMetric.id).categories[0]]: item.value || 0 };
          }
          return {
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            [getMetricChartConfig(selectedMetric.id).categories[0]]: item.value || 0
          };
        });

        // Создаем полный период данных на основе выбранного диапазона
        const fullData: Array<{ date: string; [key: string]: number | string }> = [];
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
          console.error('[UserAnalytics] Invalid dateRange (startDate or endDate) when creating fullData:', { startDate: dateRange.startDate, endDate: dateRange.endDate });
          setChartError('Invalid date range for chart display.');
          setChartData([]);
          setChartLoading(false);
          return;
        }

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          if (isNaN(d.getTime())) {
            console.error('[UserAnalytics] Invalid date encountered in fullData loop:', d);
            break; // Прерываем цикл, если дата стала недействительной
          }
          const dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const existingData = formattedData.find(item => item.date === dateString);
          const categoryName = getMetricChartConfig(selectedMetric.id).categories[0];
          fullData.push({ date: dateString, [categoryName]: existingData ? existingData[categoryName] : 0 });
        }

        // Улучшаем отображение для коротких периодов (Today/Yesterday/2 days)
        const msPerDay = 86400000;
        const inclusiveDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
        if (inclusiveDays <= 1) {
          const prev = new Date(startDate.getTime() - msPerDay);
          const next = new Date(endDate.getTime() + msPerDay);
          const dateFormat = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const padded = [
            { date: dateFormat(prev), [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 },
            fullData[0] ? { ...fullData[0], date: dateFormat(startDate) } : { date: dateFormat(startDate), [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 },
            { date: dateFormat(next), [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 }
          ];
          setChartData(padded);
        } else if (inclusiveDays === 2) {
          const prev = new Date(startDate.getTime() - msPerDay);
          const next = new Date(endDate.getTime() + msPerDay);
          const dateFormat = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const padded = [
            { date: dateFormat(prev), [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 },
            ...fullData,
            { date: dateFormat(next), [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 }
          ];
          setChartData(padded);
        } else {
          setChartData(fullData);
        }
      } else {
        const errorText = await response.text();
        console.error(`Failed to load chart data: ${response.status} ${response.statusText}`, errorText);
        setChartError(`Failed to load data: ${response.status}`);
        setChartData([]);
      }
    } catch (error) {
      console.error('Failed to load chart data:', error);
      setChartError('Network error');
      setChartData([]);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        // Build query parameters with date range and filters
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          ...Object.fromEntries(
            Object.entries(selectedFilters).map(([key, values]) => {
              // Преобразуем geography в country для сервера
              const serverKey = key === 'geography' ? 'country' : key;
              return [serverKey, values.join(',')];
            })
          )
        });

        console.log('Loading metrics from:', `${config.api.baseUrl}/admin/dashboard/overview-v2`);
        const response = await fetch(`${config.api.baseUrl}/admin/dashboard/overview-v2`, {
          credentials: 'include'
        });
        console.log('Metrics response status:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Metrics data received:', data);
          
          const processedMetrics = {
            // Используем новые поля из SimpleDataCache
            D1: data.d1Retention !== undefined ? `${data.d1Retention}%` : '0%',
            D3: data.d3Retention !== undefined ? `${data.d3Retention}%` : '0%',
            D7: data.d7Retention !== undefined ? `${data.d7Retention}%` : '0%',
            D30: data.d30Retention !== undefined ? `${data.d30Retention}%` : '0%',
            churn_rate: '—', // Will calculate from churn endpoint
            // Новые метрики Engagement
            sessions: '—',
            screens_opened: '—',
            trades_per_user: '—',
            avg_virtual_balance: '—',
            sessions_total: data.totalEvents || '—', // Переименовано для ясности
            ads_watched: '—',
            daily_reward_claimed: '—',
          };

          // Отдельные запросы для Engagement метрик, так как они возвращают { trend, totalValue }
          const engagementMetricRequests: Promise<any>[] = [];
          const engagementMetricIds = ['sessions', 'screens_opened', 'trades_per_user', 'avg_virtual_balance', 'churn_rate', 'order_open', 'order_close', 'daily_reward_claimed'];

          engagementMetricIds.forEach(id => {
            let url = `${config.api.baseUrl}/admin/dashboard/metric/${id}/trend?${params}`;
            if (id === 'trades_per_user') {
              url = `${config.api.baseUrl}/admin/dashboard/chart/trades_by_date?${params}`;
            }
            engagementMetricRequests.push(
              fetch(url, { credentials: 'include' })
                .then(res => res.ok ? res.json() : Promise.reject(new Error(`Failed to fetch ${id} data`)))
                .catch(error => { console.error(`Error fetching ${id}:`, error); return null; })
            );
          });

          const engagementResults = await Promise.all(engagementMetricRequests);

          engagementResults.forEach((result, index) => {
            const metricId = engagementMetricIds[index];
            if (result) {
              if (metricId === 'sessions') {
                processedMetrics.sessions = result.totalUsers > 0 ? parseFloat((result.totalSessions / result.totalUsers).toFixed(2)).toString() : '0';
              } else if (metricId === 'screens_opened') {
                processedMetrics.screens_opened = result.totalScreensOpened.toString();
              } else if (metricId === 'trades_per_user') {
                // Агрегируем общее количество сделок напрямую из массива result
                const totalTrades = result.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
                processedMetrics.trades_per_user = totalTrades.toString();
              } else if (metricId === 'avg_virtual_balance') {
                processedMetrics.avg_virtual_balance = Math.floor(result.avgBalance).toString();
              } else if (metricId === 'churn_rate') {
                // Для churn_rate мы ожидаем тренд с процентами, берем последнее значение
                processedMetrics.churn_rate = result.length > 0 ? `${result[result.length - 1].value}%` : '0%';
              } else if (metricId === 'order_open') {
                processedMetrics.order_open = result.reduce((sum: number, item: any) => sum + (item.value || 0), 0).toString();
              } else if (metricId === 'order_close') {
                processedMetrics.order_close = result.reduce((sum: number, item: any) => sum + (item.value || 0), 0).toString();
              } else if (metricId === 'daily_reward_claimed') {
                processedMetrics.daily_reward_claimed = result.totalRewardsClaimed ? result.totalRewardsClaimed.toString() : '0';
              }
            }
          });

          console.log('Processed metrics:', processedMetrics);
          setMetricsData(processedMetrics);
        } else if (response.status === 503) {
          console.log('Data is loading, will retry...');
          // Попробуем еще раз через 3 секунды
          setTimeout(() => {
            const loadMetrics = async () => {
              try {
                const retryResponse = await fetch(`${config.api.baseUrl}/admin/dashboard/overview-v2`, {
                  credentials: 'include'
                });
                if (retryResponse.ok) {
                  const data = await retryResponse.json();
                  const processedMetrics = {
                    D1: data.d1Retention !== undefined ? `${data.d1Retention}%` : '0%',
                    D3: data.d3Retention !== undefined ? `${data.d3Retention}%` : '0%',
                    D7: data.d7Retention !== undefined ? `${data.d7Retention}%` : '0%',
                    D30: data.d30Retention !== undefined ? `${data.d30Retention}%` : '0%',
                    churn_rate: '—',
                    sessions: data.totalEvents || '—',
                    ads_watched: '—',
                  };
                  setMetricsData(processedMetrics);
                }
              } catch (error) {
                console.error('Retry failed:', error);
              }
            };
            loadMetrics();
          }, 3000);
        } else {
          const errorText = await response.text();
          console.error('Failed to load metrics:', response.status, errorText);
        }
      } catch (error) {
        console.error('Failed to load metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [dateRange, selectedFilters]);

  // Загружаем данные графика при выборе метрики
  useEffect(() => {
    if (selectedMetric) {
      loadChartData(selectedMetric.id);
    }
  }, [selectedMetric]);

  // Перезагружаем данные графика при изменении фильтров
  useEffect(() => {
    if (selectedMetric) {
      loadChartData(selectedMetric.id);
    }
  }, [dateRange, selectedFilters]); // Добавляем metricsData в зависимости


  // Update metrics with loaded data
  console.log('[UserAnalytics] Current metricsData:', metricsData);
  const metricsWithData = allMetrics.map(metric => ({
    ...metric,
    value: metricsData[metric.id] !== undefined ? metricsData[metric.id] : metric.value
  }));
  console.log('Updated metrics:', metricsWithData.filter(m => m.category === 'Retention'));

  // Group metrics by category
  const groupedMetrics = metricsWithData.reduce((acc, metric) => {
    if (!acc[metric.category]) acc[metric.category] = [];
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, Metric[]>);

  return (
    <div className="flex h-full bg-gray-50">
      {/* Left Sidebar - Metrics List */}
      <div className="w-80 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto custom-scrollbar">
        <div className="p-4">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Metrics</h3>
          
          {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
            <div key={category} className="mb-4">
              <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
                {category}
              </h4>
              <div className="space-y-1">
                {categoryMetrics.map((metric) => (
                  <MetricRow
                    key={metric.id}
                    metric={metric}
                    isSelected={selectedMetric?.id === metric.id}
                    onClick={() => setSelectedMetric(metric)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Content Area */}
      <div className="flex-1 overflow-hidden bg-gray-50">
        {selectedMetric ? (
          <div className="h-full overflow-y-auto custom-scrollbar">
            <div className="p-6">
              {/* Header with Filters */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm w-full">
                {/* Title and Filters in One Row */}
                <div className="flex flex-row flex-wrap items-center justify-between">
                  <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${selectedMetric.color}`}>
                {selectedMetric.icon}
              </div>
                <h1 className="text-xl font-bold text-gray-900">{selectedMetric.title}</h1>
                  </div>
                  
                  {/* Filters */}
                  <MetricFilters
                    metricId={selectedMetric.id}
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                    selectedFilters={selectedFilters}
                    onFiltersChange={setSelectedFilters}
                  />
                </div>

            </div>

            {/* Chart */}
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
              <h3 className="text-sm text-gray-600 mb-1">
                {dateRange.label} trend for {selectedMetric.title}
              </h3>
              <p className="text-2xl font-bold text-gray-900 mb-4">
                {(() => {
                  const isDynamic = dynamicPercentageMetricIds.has(selectedMetric.id);
                  console.log('[UserAnalytics] Rendering percentage:', {
                    metricId: selectedMetric.id,
                    isDynamic,
                    dynamicOverallPercent,
                    selectedMetricValue: selectedMetric.value
                  });
                  return isDynamic && dynamicOverallPercent !== null
                    ? `${dynamicOverallPercent}%`
                    : selectedMetric.value;
                })()}
              </p>
              <div className="mt-6 hidden sm:block">
              <AreaChart
                data={chartData.length > 0 
                  ? chartData 
                  : [{ date: 'No Data', [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 }]}
                index="date"
                categories={getMetricChartConfig(selectedMetric.id).categories}
                colors={getMetricChartConfig(selectedMetric.id).colors}
                showLegend={false}
                showGradient={false}
                  valueFormatter={getMetricValueFormatter(selectedMetric.id)}
                  showYAxis={true}
                  yAxisWidth={60}
                  minValue={0}
                  maxValue={dynamicYAxisMaxValue}
                  customTooltip={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
                          <p className="text-blue-600 text-sm">
                            {getMetricChartConfig(selectedMetric.id).tooltipLabel}: {getMetricTooltipValueFormatter(selectedMetric.id)(payload[0].value as any)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  className="h-48 [&_.recharts-cartesian-axis-tick-value]:text-xs [&_.recharts-cartesian-axis-tick-value]:fill-gray-600"
                >
                  {/* <YAxis tickFormatter={formatYAxisTick} /> */}
                </AreaChart>
              </div>
              <div className="mt-6 block sm:hidden">
                <AreaChart
                  data={chartData.length > 0 
                    ? chartData 
                    : [{ date: 'No Data', [getMetricChartConfig(selectedMetric.id).categories[0]]: 0 }]}
                  index="date"
                  categories={getMetricChartConfig(selectedMetric.id).categories}
                  colors={getMetricChartConfig(selectedMetric.id).colors}
                  showLegend={false}
                  showGradient={false}
                  valueFormatter={getMetricValueFormatter(selectedMetric.id)}
                  startEndOnly={true}
                showYAxis={true}
                  yAxisWidth={60}
                  minValue={0}
                  maxValue={dynamicYAxisMaxValue || 100}
                  customTooltip={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
                          <p className="text-blue-600 text-sm">
                            {getMetricChartConfig(selectedMetric.id).tooltipLabel}: {getMetricTooltipValueFormatter(selectedMetric.id)(payload[0].value as any)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  className="h-48 [&_.recharts-cartesian-axis-tick-value]:text-xs [&_.recharts-cartesian-axis-tick-value]:fill-gray-600"
                >
                  {/* <YAxis tickFormatter={formatYAxisTick} /> */}
                </AreaChart>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Detailed Data</h3>
              <MetricTable
                metricId={selectedMetric.id}
                title={selectedMetric.title}
                isOpen={true}
                onClose={() => {}}
                dateRange={dateRange}
                selectedFilters={selectedFilters}
              />
            </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center">
            <div className="text-center p-8">
              <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Select a Metric</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Choose a metric from the sidebar to view detailed analytics, charts, and user data.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserAnalytics;


