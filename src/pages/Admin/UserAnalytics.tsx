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
  DollarSign,
  Clock,
  AlertCircle,
  Zap,
  Globe,
  Smartphone,
  Maximize,
  ArrowDown,
  XCircle,
  Navigation,
  FileText,
  Repeat,
  Link,
  Target
} from 'lucide-react';
import { computeYAxis } from './utils/computeYAxis';
import { AreaChart, Card } from '@tremor/react';
import { config } from '../../lib/config';
import MetricTable from './components/MetricTable';
import MetricFilters from './components/MetricFilters';
// Конфиги графиков встроены, чтобы избежать проблем с импортом
import { engagementChartConfig } from '@/pages/Admin/metrics/engagement/config/chart.ts';
import { getTutorialChartConfig } from '@/pages/Admin/metrics/tutorial/config/chart.ts';
import { getRetentionChartConfig } from '@/pages/Admin/metrics/retention/config/retentionChart.ts';
import { RetentionMetric } from '@/pages/Admin/metrics/retention/types/retention.ts';
import { Metric, MetricRowProps, allMetrics } from './MetricsProps.tsx';

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
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
  const [dynamicYAxisMinValue, setDynamicYAxisMinValue] = useState<number>(0);
  
  const Y_AXIS_MULTIPLIER = 1.2; // Можно изменить на 1.3, 1.5 и т.д.

  // Определение метрик, для которых процент рассчитывается динамически
  const dynamicPercentageMetricIds = new Set([
    // Tutorial и Pro Tutorial считаем по количеству событий (ось auto)
    // 'tutorial_start', 'tutorial_complete', 'pro_tutorial_start', 'pro_tutorial_complete',
    'tutorial_skip_rate', 'pro_tutorial_skip_rate',
    // Retention — проценты
    'D1', 'D3', 'D7', 'D30',
    // Trading/Forms — проценты
    'win_rate'
  ]);

  // Функция для получения конфига графика в зависимости от metricId
  const getMetricChartConfig = (metricId: string) => {
    const formatAxisTick = (value: number, decimals: number = 2) => {
      const v = Number(value ?? 0);
      if (!Number.isFinite(v)) return '0';
      const fixed = v.toFixed(decimals);
      // parseFloat уберёт хвостовые нули: 0.20 -> 0.2, 1.00 -> 1
      return String(parseFloat(fixed));
    };
    const tutorialMetricIds = new Set([
      'tutorial_start', 'tutorial_complete',
      'pro_tutorial_start', 'pro_tutorial_complete'
    ]);
    const retentionMetricIds = new Set<RetentionMetric>(['D1', 'D3', 'D7', 'D30', 'churn_rate']);

    if (tutorialMetricIds.has(metricId)) {
      // Tutorial метрики с логичными цветами
      const tutorialColors: Record<string, string> = {
        'tutorial_start': 'blue',        // начало обучения - синий
        'tutorial_complete': 'emerald',  // завершение - зеленый (успех)
        'pro_tutorial_start': 'blue',    // про-начало - синий
        'pro_tutorial_complete': 'emerald' // про-завершение - зеленый (успех)
      };

      return {
        categories: ['Users'],
        colors: [tutorialColors[metricId] || 'blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Users',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
      };
    }
    
    // Позитивные метрики - emerald
    if (metricId === 'sign_up_rate') {
      return {
        categories: ['Signup Rate'],
        colors: ['emerald'],
        valueFormatter: (value: number) => `${Math.round(value)}%`,
        tooltipLabel: 'Signup Rate',
        tooltipValue: (value: number) => `${Math.round(value)}%`
      };
    } else if (['tutorial_complete', 'pro_tutorial_complete'].includes(metricId)) {
      return {
        categories: ['Users'],
        colors: ['emerald'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Users',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
      };
    } else if (['win_rate', 'max_profit_trade'].includes(metricId)) {
      return {
        categories: ['Value'],
        colors: ['emerald'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Value',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
      };
    } else if (metricId === 'order_open') {
      return {
        categories: ['Orders'],
        colors: ['emerald'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Orders',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
      };
    }
    // Негативные метрики - pink
    else if (metricId === 'churn_rate') {
      return {
        categories: ['Churn Rate'],
        colors: ['pink'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        startEndOnly: true,
        valueFormatter: (value: number) => `${Math.round(value)}%`,
        tooltipLabel: 'Churn Rate',
        tooltipValue: (value: number) => `${Math.round(value)}%`
      };
    } else if (metricId === 'max_loss_trade') {
      return {
        categories: ['Max Loss'],
        colors: ['pink'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        showGridLines: true,
        startEndOnly: true,
        valueFormatter: (value: number) => {
          const num = Number(value);
          const formatted = num.toFixed(2);
          return num < 0 ? `-$${Math.abs(num).toFixed(2)}` : `$${formatted}`;
        },
        tooltipLabel: 'Max Loss',
        tooltipValue: (value: number) => {
          const num = Number(value);
          const formatted = num.toFixed(2);
          return num < 0 ? `-$${Math.abs(num).toFixed(2)}` : `$${formatted}`;
        }
      };
    }
    // Количественные метрики - blue
    else if (metricId === 'page_visits') {
      return {
        categories: ['Page Visits'],
        colors: ['blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 0),
        tooltipLabel: 'Page Visits',
        tooltipValue: (value: number) => formatAxisTick(value, 0)
      };
    } else if (['sessions', 'screens_opened'].includes(metricId)) {
      return {
        ...engagementChartConfig,
        tooltipLabel: (engagementChartConfig.tooltipLabel as Function)(metricId),
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipValue: (value: number) => formatAxisTick(value, 2),
        colors: ['blue']
      };
    } else if (['order_close', 'average_profit_loss', 'average_holding_time'].includes(metricId)) {
      return {
        categories: ['Value'],
        colors: ['blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Value',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
      };
    }
    // Вовлеченность - violet и amber
    else if (['avg_virtual_balance', 'session_duration', 'trading_frequency'].includes(metricId)) {
      return {
        ...engagementChartConfig,
        tooltipLabel: (engagementChartConfig.tooltipLabel as Function)(metricId),
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipValue: (value: number) => formatAxisTick(value, 2),
        colors: ['violet']
      };
    } else if (metricId === 'daily_active_traders') {
      return {
        ...engagementChartConfig,
        tooltipLabel: (engagementChartConfig.tooltipLabel as Function)(metricId),
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipValue: (value: number) => formatAxisTick(value, 2),
        colors: ['amber']
      };
    }
    // Ретеншн - amber
    else if (retentionMetricIds.has(metricId as RetentionMetric)) {
      if (metricId === 'churn_rate') {
        // churn_rate уже обработан выше
        return getRetentionChartConfig(metricId as RetentionMetric);
      }
      return getRetentionChartConfig(metricId as RetentionMetric);
    }
    // Торговля нейтральная - amber
    else if (metricId === 'trades_per_user') {
      return {
        categories: ['Trades'],
        colors: ['amber'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Trades',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
      };
    } else {
      // Дефолтный конфиг, если метрика не найдена
      return {
        categories: ['Users'],
        colors: ['blue'],
        showLegend: false,
        showGradient: false,
        showYAxis: true,
        valueFormatter: (value: number) => formatAxisTick(value, 2),
        tooltipLabel: 'Value',
        tooltipValue: (value: number) => formatAxisTick(value, 2)
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

  // Метрики, которые показывают только таблицу (без заголовка и графика)
  const tableOnlyMetrics = [
    'page_visits', 'avg_virtual_balance', 'trading_frequency',
    'order_open', 'order_close', 'average_profit_loss',
    'max_profit_trade', 'max_loss_trade', 'average_holding_time', 'churn_rate', 'sign_up_rate'
  ];

  // Функция для форматирования значений в tooltips
  const formatTooltipValue = (metricId: string, value: number): string => {
    // Для Max Loss - показываем с минусом
    if (metricId === 'max_loss_trade') {
      return `-${Math.round(Math.abs(value))}`;
    }
    // Для Max Profit - показываем с плюсом
    if (metricId === 'max_profit_trade') {
      return `+${Math.round(value)}`;
    }
    // Для Average Profit/Loss - показываем с знаком
    if (metricId === 'average_profit_loss') {
      const formatted = value.toFixed(2);
      return value >= 0 ? `+${formatted}` : formatted;
    }
      // Для пользователей/сделок - без дробей
      if (['sessions', 'trades_per_user', 'daily_active_traders'].includes(metricId)) {
        return Math.round(value).toString();
      }
    // Для остальных метрик убираем .00
    return value % 1 === 0 ? value.toString() : value.toFixed(2);
  };

  const loadChartData = async (metricId: string) => {
    setChartLoading(true);
    setChartError(null);
    // Сбрасываем проценты при переключении метрики, чтобы не тянуть старое значение (например, 5000%)
    // НЕ сбрасываем для метрик с total значениями, так как они будут установлены заново
    const metricsWithTotal = [
      'sessions', 'screens_opened', 'session_duration', 'trading_frequency',
      'avg_virtual_balance', 'trades_per_user', 'order_open', 'order_close',
      'average_profit_loss', 'average_holding_time', 'page_visits',
      'daily_active_traders', 'max_profit_trade', 'max_loss_trade'
    ];
    if (!metricsWithTotal.includes(metricId)) {
      setDynamicOverallPercent(null);
    }

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

        // Загружаем total значение для метрик, которые должны показывать среднее за период
        const metricsWithTotal = [
          'sessions', 'screens_opened', 'session_duration',
          'trades_per_user', 'daily_active_traders'
        ];

        if (metricsWithTotal.includes(metricId)) {
          try {
            const totalUrl = `${config.api.baseUrl}/admin/dashboard/metric/${metricId}/total?${params}`;
            console.log(`[UserAnalytics] FETCHING TOTAL URL:`, totalUrl);
            const totalResponse = await fetch(totalUrl, {
              credentials: 'include'
            });
            console.log(`[UserAnalytics] Total response status:`, totalResponse.status);
            if (totalResponse.ok) {
              const totalData = await totalResponse.json();
              console.log(`[UserAnalytics] Total data received:`, totalData);
              if (totalData && totalData.value !== undefined && totalData.value !== null) {
                const numericValue = Number(totalData.value);
                console.log(`[UserAnalytics] Setting dynamicOverallPercent to:`, numericValue);
                setDynamicOverallPercent(numericValue);
              }
            } else {
              const errorText = await totalResponse.text();
              console.error(`[UserAnalytics] Total response not ok for ${metricId}:`, totalResponse.status, errorText);
            }
          } catch (error) {
            console.error(`Error loading total for metric ${metricId}:`, error);
          }
         }        // Единый формат для всех метрик (как retention): { date, value } => { date, Users }
        // Обработка разных типов ответов с бэкенда
        let trendData: Array<{ date: string; value: number }> = [];
        let totalValue: number | null = null;
        let totalDenominator: number | null = null;

        if (metricId === 'sessions') {
          const { trend, totalSessions, totalUsers } = data;
          trendData = trend;
          // Для метрики 'sessions' обновляем dynamicYAxisMaxValue на основе максимального значения в тренде
          const { min, max } = computeYAxis(trendData.map(i => i.value), 'auto');
          setDynamicYAxisMinValue(min);
          setDynamicYAxisMaxValue(max);
          if (totalUsers > 0) {
            totalValue = parseFloat((totalSessions / totalUsers).toFixed(2)); // Среднее количество сессий на пользователя
          } else {
            totalValue = 0;
          }
        } else if (metricId === 'screens_opened') {
          const { trend, totalScreensOpened } = data;
          trendData = trend;
          // Для метрики 'screens_opened' также обновляем dynamicYAxisMaxValue
          const { min, max } = computeYAxis(trendData.map(i => i.value), 'auto');
          setDynamicYAxisMinValue(min);
          setDynamicYAxisMaxValue(max);
        } else if (metricId === 'trades_per_user') {
          const { trend, usersInPeriod } = data;
          trendData = (trend || []).map((item: any) => ({ date: item.date, value: Number(item.value ?? (item.users > 0 ? item.count / item.users : 0)) }));
          // Общий показатель за период = сумма сделок / уникальные пользователи периода
          if (Array.isArray(trend)) {
            const sumTrades = trend.reduce((s: number, i: any) => s + Number(i.count || 0), 0);
            const denom = Number(usersInPeriod || 0);
            totalValue = denom > 0 ? Math.round(sumTrades / denom) : 0;
          }
          // Для метрики 'trades_per_user' также обновляем dynamicYAxisMaxValue на основе максимального значения в тренде
          const { min, max } = computeYAxis(trendData.map(i => i.value), 'auto');
          setDynamicYAxisMinValue(min);
          setDynamicYAxisMaxValue(max);
        } else if (metricId === 'avg_virtual_balance') {
          const { trend, avgBalance } = data;
          trendData = trend;
          totalValue = Math.floor(avgBalance);
          // Для метрики 'avg_virtual_balance' также обновляем dynamicYAxisMaxValue на основе avgBalance
          const { min, max } = computeYAxis(trendData.map(i => i.value), 'auto');
          setDynamicYAxisMinValue(min);
          setDynamicYAxisMaxValue(max);
        } else if (metricId === 'order_open' || metricId === 'order_close') {
          // generic trend array [{date, value}]
          trendData = data;
          if (dynamicPercentageMetricIds.has(metricId)) {
            const { min, max } = computeYAxis(trendData.map(i => i.value), 'percent');
            setDynamicYAxisMinValue(min);
            setDynamicYAxisMaxValue(max);
          } else {
            const { min, max } = computeYAxis(trendData.map(i => i.value), 'auto');
            setDynamicYAxisMinValue(min);
            setDynamicYAxisMaxValue(max);
          }
        } else {
          trendData = data; // Для tutorial и retention, где data - это уже массив тренда
          const { min, max } = computeYAxis(trendData.map(i => i.value), dynamicPercentageMetricIds.has(metricId) ? 'percent' : 'auto');
          setDynamicYAxisMinValue(min);
          setDynamicYAxisMaxValue(max);
        }

        if (dynamicPercentageMetricIds.has(metricId)) {
          // Trading percentage metrics уже приходят как проценты (0-100) по дням
          const tradingPercentIds = new Set(['win_rate','take_profit_hit_rate','stop_loss_hit_rate']);
          if (tradingPercentIds.has(metricId)) {
            const last = trendData.length > 0 ? trendData[trendData.length - 1] : null;
            setDynamicOverallPercent(last ? Math.round(Number(last.value ?? 0)) : 0);
          } else {
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
          }
        } else {
          // Спец-правило: для tutorial-метрик в шапке показываем % от общего числа пользователей за период,
          // при этом график остаётся в абсолютных значениях
          const tutorialHeaderIds = new Set([
            'tutorial_start', 'tutorial_complete',
            'pro_tutorial_start', 'pro_tutorial_complete'
          ]);
          
          // Специальная логика для signup_rate
          if (metricId === 'signup_rate') {
            try {
              // Получаем общее количество first_open и signup за период
              const signupRateResponse = await fetch(`${config.api.baseUrl}/admin/dashboard/metric/signup_rate/trend?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`, { credentials: 'include' });
              if (signupRateResponse.ok) {
                const signupData = await signupRateResponse.json();
                if (signupData && Array.isArray(signupData)) {
                  const totalFirstOpens = signupData.reduce((sum, item) => sum + (item.firstOpens || 0), 0);
                  const totalSignups = signupData.reduce((sum, item) => sum + (item.signups || 0), 0);
                  const signupRate = totalFirstOpens > 0 ? Math.round((totalSignups / totalFirstOpens) * 100) : 0;
                  setDynamicOverallPercent(signupRate);
                }
              }
            } catch (error) {
              console.error('Error loading signup rate data:', error);
              setDynamicOverallPercent(0);
            }
          } else if (tutorialHeaderIds.has(metricId)) {
            try {
              const totalUsersResponse = await fetch(`${config.api.baseUrl}/admin/dashboard/total-users-in-period?startDate=${dateRange.startDate.toISOString()}&endDate=${dateRange.endDate.toISOString()}`, { credentials: 'include' });
              if (totalUsersResponse.ok) {
                const overviewData = await totalUsersResponse.json();
                const totalUsersInPeriod = Number(overviewData.totalUsers || 0);
                const events = trendData.reduce((sum: number, item: any) => sum + Number(item.value || 0), 0);
                setDynamicOverallPercent(totalUsersInPeriod > 0 ? Math.round((events / totalUsersInPeriod) * 100) : 0);
              } else {
                setDynamicOverallPercent(0);
              }
            } catch {
              setDynamicOverallPercent(0);
          }
        } else {
          // НЕ сбрасываем для метрик с total значениями
          const metricsWithTotal = [
            'sessions', 'screens_opened', 'session_duration', 'trading_frequency',
            'avg_virtual_balance', 'trades_per_user', 'order_open', 'order_close',
            'average_profit_loss', 'average_holding_time', 'page_visits',
            'daily_active_traders', 'max_profit_trade', 'max_loss_trade'
          ];
          if (!metricsWithTotal.includes(metricId)) {
            setDynamicOverallPercent(null); // Сбрасываем только для метрик без процента
          }
          }
        }

        const chartConfigForMetric = getMetricChartConfig(selectedMetric.id);
        const categoryKey = chartConfigForMetric.categories?.[0] ?? 'Value';
        const formattedData: Array<{ date: string; [key: string]: number | string }> = trendData.map((item: any) => {
          const dateObj = new Date(item.date);
          if (isNaN(dateObj.getTime())) {
            console.error('[UserAnalytics] Invalid date received in trendData:', item.date);
            return { date: 'Invalid Date', [categoryKey]: Number(item.value ?? 0) };
          }
          return {
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            [categoryKey]: Number(item.value ?? 0)
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
          fullData.push({ date: dateString, [categoryKey]: existingData ? existingData[categoryKey] : 0 });
        }

        // Улучшаем отображение для коротких периодов (Today/Yesterday/2 days)
        const msPerDay = 86400000;
        const inclusiveDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
        if (inclusiveDays <= 1) {
          const prev = new Date(startDate.getTime() - msPerDay);
          const next = new Date(endDate.getTime() + msPerDay);
          const dateFormat = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const padded = [
            { date: dateFormat(prev), [categoryKey]: 0 },
            fullData[0] ? { ...fullData[0], date: dateFormat(startDate) } : { date: dateFormat(startDate), [categoryKey]: 0 },
            { date: dateFormat(next), [categoryKey]: 0 }
          ];
          setChartData(padded);
        } else if (inclusiveDays === 2) {
          const prev = new Date(startDate.getTime() - msPerDay);
          const next = new Date(endDate.getTime() + msPerDay);
          const dateFormat = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          const padded = [
            { date: dateFormat(prev), [categoryKey]: 0 },
            ...fullData,
            { date: dateFormat(next), [categoryKey]: 0 }
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
            sign_up_rate: '—', // Will calculate from signup endpoint
            // Новые метрики Engagement
            sessions: '—',
            screens_opened: '—',
            trades_per_user: '—',
            avg_virtual_balance: '—',
            sessions_total: data.totalEvents || '—', // Переименовано для ясности
            // Trading Performance
            order_open: '—',
            order_close: '—',
            win_rate: '0%',
            average_profit_loss: '—',
            max_profit_trade: '—',
            max_loss_trade: '—',
            take_profit_hit_rate: '0%',
            stop_loss_hit_rate: '0%',
            manual_close_rate: '0%',
            average_holding_time: '—',
            // Technical Metrics
            // Extended Engagement
            session_duration: '—',
            pages_per_session: '—',
            daily_active_traders: '—',
            trading_frequency: '—',
            average_position_size: '—',
            leverage_usage_distribution: '—',
            // Extended User Acquisition
            page_visits: '—',
            referrer_domain: '—',
            campaign_attribution: '—',
          };

          // Отдельные запросы для Engagement метрик, так как они возвращают { trend, totalValue }
          const engagementMetricRequests: Promise<any>[] = [];
          const engagementMetricIds = [
            'sessions', 'screens_opened', 'trades_per_user', 'avg_virtual_balance', 'churn_rate', 
            'order_open', 'order_close', 'win_rate', 'average_profit_loss', 'max_profit_trade', 
            'max_loss_trade', 'manual_close_rate', 
            'average_holding_time',
            'session_duration', 'pages_per_session', 'daily_active_traders', 'trading_frequency',
            'average_position_size', 'leverage_usage_distribution', 'page_visits',
            'referrer_domain', 'campaign_attribution'
          ];

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
                const trend = result.trend || [];
                const usersInPeriod = Number(result.usersInPeriod || 0);
                const totalTrades = trend.reduce((sum: number, item: any) => sum + (item.count || 0), 0);
                processedMetrics.trades_per_user = usersInPeriod > 0 ? Math.round(totalTrades / usersInPeriod).toString() : '0';
              } else if (metricId === 'avg_virtual_balance') {
                processedMetrics.avg_virtual_balance = Math.floor(result.avgBalance).toString();
              } else if (metricId === 'churn_rate') {
                // Для churn_rate мы ожидаем тренд с процентами, берем последнее значение
                processedMetrics.churn_rate = result.length > 0 ? `${result[result.length - 1].value}%` : '0%';
              } else if (metricId === 'sign_up_rate') {
                // Для sign_up_rate мы ожидаем тренд с процентами, берем последнее значение
                processedMetrics.sign_up_rate = result.length > 0 ? `${result[result.length - 1].value}%` : '0%';
              } else if (metricId === 'order_open') {
                processedMetrics.order_open = result.reduce((sum: number, item: any) => sum + (item.value || 0), 0).toString();
              } else if (metricId === 'order_close') {
                processedMetrics.order_close = result.reduce((sum: number, item: any) => sum + (item.value || 0), 0).toString();
              } else if (metricId === 'win_rate') {
                processedMetrics.win_rate = result.winRate ? `${result.winRate}%` : '0%';
              } else if (metricId === 'average_profit_loss') {
                processedMetrics.average_profit_loss = result.averageProfitLoss || '—';
              } else if (metricId === 'max_profit_trade') {
                processedMetrics.max_profit_trade = result.maxProfitTrade || '—';
              } else if (metricId === 'max_loss_trade') {
                processedMetrics.max_loss_trade = result.maxLossTrade || '—';
              
              } else if (metricId === 'manual_close_rate') {
                processedMetrics.manual_close_rate = result.manualCloseRate ? `${result.manualCloseRate}%` : '0%';
              } else if (metricId === 'average_holding_time') {
                processedMetrics.average_holding_time = result.averageHoldingTime || '—';
              } else if (metricId === 'session_duration') {
                processedMetrics.session_duration = result.sessionDuration || '—';
              } else if (metricId === 'pages_per_session') {
                processedMetrics.pages_per_session = result.pagesPerSession || '—';
              } else if (metricId === 'daily_active_traders') {
                processedMetrics.daily_active_traders = result.dailyActiveTraders || '—';
              } else if (metricId === 'trading_frequency') {
                processedMetrics.trading_frequency = result.tradingFrequency || '—';
              } else if (metricId === 'average_position_size') {
                processedMetrics.average_position_size = result.averagePositionSize || '—';
              } else if (metricId === 'leverage_usage_distribution') {
                processedMetrics.leverage_usage_distribution = result.leverageUsageDistribution || '—';
              } else if (metricId === 'page_visits') {
                processedMetrics.page_visits = result.pageVisits || '—';
              } else if (metricId === 'referrer_domain') {
                processedMetrics.referrer_domain = result.referrerDomain || '—';
              } else if (metricId === 'campaign_attribution') {
                processedMetrics.campaign_attribution = result.campaignAttribution || '—';
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
      // Жёсткий сброс процента при смене метрики, НЕ для метрик с total значениями
      const metricsWithTotal = [
        'sessions', 'screens_opened', 'session_duration',
        'trades_per_user', 'daily_active_traders'
      ];
      if (!metricsWithTotal.includes(selectedMetric.id)) {
        setDynamicOverallPercent(null);
      }
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
              {/* Header with Filters - показываем только для метрик с заголовками */}
              {!tableOnlyMetrics.includes(selectedMetric.id) && (
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
              )}

            {/* Chart - показываем только для метрик с графиками */}
              {!tableOnlyMetrics.includes(selectedMetric.id) && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
                <h3 className="text-sm text-gray-600 mb-1">
                  {dateRange.label} trend for {selectedMetric.title}
                </h3>
                <p className="text-2xl font-bold text-gray-900 mb-4">
                {(() => {
                  const isPercent = dynamicPercentageMetricIds.has(selectedMetric.id);
                  const tutorialHeaderIds = new Set([
                    'tutorial_start', 'tutorial_complete',
                    'pro_tutorial_start', 'pro_tutorial_complete'
                  ]);
                  // Если есть тренд, отображаем итог без прочерка
                  const dataExists = Array.isArray(chartData) && chartData.length > 0;
                  // Для tutorial метрик всегда показываем % в шапке
                  if (tutorialHeaderIds.has(selectedMetric.id)) {
                    return `${Math.round(Number(dynamicOverallPercent ?? 0))}%`;
                  }
                  // Для signup_rate показываем % в шапке
                  if (selectedMetric.id === 'signup_rate') {
                    return `${Math.round(Number(dynamicOverallPercent ?? 0))}%`;
                  }
                  // Для churn_rate показываем % в шапке
                  if (selectedMetric.id === 'churn_rate') {
                    return `${Math.round(Number(dynamicOverallPercent ?? 0))}%`;
                  }
                  if (isPercent) {
                    if (dynamicOverallPercent !== null) return `${dynamicOverallPercent}%`;
                    // если не успели посчитать — показываем 0%
                    return '0%';
                  }
                  // Метрики с total значениями (средние/максимумы за период)
                  const metricsWithTotal = [
                    'sessions', 'screens_opened', 'session_duration', 'trading_frequency',
                    'avg_virtual_balance', 'trades_per_user', 'order_open', 'order_close',
                    'average_profit_loss', 'average_holding_time', 'page_visits',
                    'daily_active_traders', 'max_profit_trade', 'max_loss_trade'
                  ];
                  
                  if (metricsWithTotal.includes(selectedMetric.id)) {
                    if (dynamicOverallPercent !== null) {
                      // Для Session Duration - конвертируем секунды в минуты
                      if (selectedMetric.id === 'session_duration') {
                        const minutes = dynamicOverallPercent / 60;
                        return minutes % 1 === 0 ? minutes.toString() : minutes.toFixed(2);
                      }
                      // Для пользователей/сделок - без дробей
                      if (['sessions', 'trades_per_user', 'daily_active_traders'].includes(selectedMetric.id)) {
                        const value = Math.round(dynamicOverallPercent);
                        return value.toString();
                      }
                      // Для остальных метрик с 2 знаками после запятой, убираем .00
                      const value = Number(dynamicOverallPercent);
                      return value % 1 === 0 ? value.toString() : value.toFixed(2);
                    }
                    return '0';
                  }

                  // user-based метрики без дробей (legacy)
                  const userBased = ['wheel_spin_frequency', 'box_open_frequency', 'ads_watched_per_user'];
                  if (userBased.includes(selectedMetric.id)) {
                    if (dataExists) {
                      const last = chartData[chartData.length - 1] as any;
                      const key = getMetricChartConfig(selectedMetric.id).categories[0];
                      return Math.round(Number(last?.[key] ?? 0)).toString();
                    }
                    return '0';
                  }
                  // иначе оставляем текущее значение, но если есть данные — берем последнее
                  if (dataExists) {
                    const last = chartData[chartData.length - 1] as any;
                    const key = getMetricChartConfig(selectedMetric.id).categories[0];
                    const v = Number(last?.[key] ?? 0);
                    return Number.isFinite(v) ? v.toFixed(2) : '0';
                  }
                  return typeof selectedMetric.value === 'string' ? selectedMetric.value : Number(selectedMetric.value ?? 0).toFixed(2);
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
                  showYAxis={false}
                  yAxisWidth={0}
                  customTooltip={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const config = getMetricChartConfig(selectedMetric.id);
                      const color = config.colors?.[0] || 'blue';
                      const colorClasses = {
                        blue: 'bg-blue-500',
                        emerald: 'bg-emerald-500',
                        pink: 'bg-pink-500',
                        violet: 'bg-violet-500',
                        amber: 'bg-amber-500',
                        purple: 'bg-purple-500',
                        fuchsia: 'bg-fuchsia-500'
                      };
                      
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-0.5 ${colorClasses[color as keyof typeof colorClasses] || 'bg-blue-500'}`}></div>
                            <span className="text-gray-600 text-sm">{config.tooltipLabel}:</span>
                            <span className="text-gray-900 font-semibold text-sm">
                              {formatTooltipValue(selectedMetric.id, payload[0].value as number)}
                            </span>
                          </div>
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
                  showYAxis={false}
                  yAxisWidth={0}
                  customTooltip={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      const config = getMetricChartConfig(selectedMetric.id);
                      const color = config.colors?.[0] || 'blue';
                      const colorClasses = {
                        blue: 'bg-blue-500',
                        emerald: 'bg-emerald-500',
                        pink: 'bg-pink-500',
                        violet: 'bg-violet-500',
                        amber: 'bg-amber-500',
                        purple: 'bg-purple-500',
                        fuchsia: 'bg-fuchsia-500'
                      };
                      
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-0.5 ${colorClasses[color as keyof typeof colorClasses] || 'bg-blue-500'}`}></div>
                            <span className="text-gray-600 text-sm">{config.tooltipLabel}:</span>
                            <span className="text-gray-900 font-semibold text-sm">
                              {formatTooltipValue(selectedMetric.id, payload[0].value as number)}
                            </span>
                          </div>
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
              )}

            {/* Заголовок для метрик "только таблица" */}
            {tableOnlyMetrics.includes(selectedMetric.id) && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm w-full">
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
            )}

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


