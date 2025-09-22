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
  Shield
} from 'lucide-react';
import { AreaChart, Card } from '@tremor/react';
import { config } from '../../lib/config';
import MetricTable from './components/MetricTable';
import MetricFilters from './components/MetricFilters';
// Конфиги графиков встроены, чтобы избежать проблем с импортом

// Функция для получения конфига графика
const getChartConfig = (metricId: string) => {
  const baseConfig = {
    categories: ['Users'],
    colors: ['blue'],
    showLegend: false,
    showGradient: false,
    showYAxis: true,
    valueFormatter: (value: number) => `${Math.floor(value)}`, // Целое число пользователей
    tooltipLabel: 'Users',
    tooltipValue: (value: number) => `${Math.floor(value)}`
  };

  // Для churn_rate используем красный цвет
  if (metricId === 'churn_rate') {
    return {
      ...baseConfig,
      colors: ['red'],
      tooltipLabel: 'Churned Users',
      tooltipValue: (value: number) => `${Math.floor(value)}`
    };
  }

  return baseConfig;
};

// Используем valueFormatter из конфига
const getValueFormatter = (metricId: string) => {
  const config = getChartConfig(metricId);
  return config.valueFormatter;
};

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
    <div className="text-sm font-semibold text-gray-900">{metric.value}</div>
  </button>
);

const UserAnalytics: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [metricsData, setMetricsData] = useState<Record<string, string | number>>({});
  const [chartData, setChartData] = useState<Array<{ date: string; Users: number; percent?: number; totalUsers?: number }>>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  
  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setHours(23, 59, 59, 999);
    const start = new Date();
    start.setDate(start.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    return { startDate: start, endDate: end, label: 'Last 7 days' };
  });
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Value formatter для графика - только целые числа
  const valueFormatter = (number: number) =>
    `${Intl.NumberFormat('us').format(Math.floor(number)).toString()}`;

  // Используем valueFormatter из конфига
  const getValueFormatter = (metricId: string) => {
    const config = getChartConfig(metricId);
    return config.valueFormatter;
  };

  // Y-axis tick formatter - только целые числа
  const yAxisTickFormatter = (value: number) => {
    return Math.floor(value).toString();
  };



  // Define all metrics with their properties
  const allMetrics: Metric[] = [
    // User Acquisition
    { id: 'installs', title: 'Installs', value: '—', icon: <Download className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Acquisition', description: 'Total app downloads' },
    { id: 'first_open', title: 'First Open', value: '—', icon: <Eye className="w-4 h-4 text-white" />, color: 'bg-indigo-500', category: 'Acquisition', description: 'Users who opened app after install' },
    { id: 'signup_rate', title: 'Signup Rate', value: '—', icon: <UserCheck className="w-4 h-4 text-white" />, color: 'bg-green-500', category: 'Acquisition', description: 'Conversion from visitor to user' },
    { id: 'trade_open_rate', title: 'Trade Open Rate', value: '—', icon: <TrendingUp className="w-4 h-4 text-white" />, color: 'bg-emerald-500', category: 'Acquisition', description: 'Users who started first trade' },
    
    // Engagement
    { id: 'sessions', title: 'Sessions', value: '—', icon: <BarChart3 className="w-4 h-4 text-white" />, color: 'bg-purple-500', category: 'Engagement', description: 'Total user sessions' },
    { id: 'screens_opened', title: 'Screens Opened', value: '—', icon: <Monitor className="w-4 h-4 text-white" />, color: 'bg-violet-500', category: 'Engagement', description: 'Average screens per session' },
    { id: 'trades_per_user', title: 'Trades/User', value: '—', icon: <MousePointer className="w-4 h-4 text-white" />, color: 'bg-cyan-500', category: 'Engagement', description: 'Average trades per active user' },
    { id: 'avg_virtual_balance', title: 'Avg Virtual Balance', value: '—', icon: <Wallet className="w-4 h-4 text-white" />, color: 'bg-teal-500', category: 'Engagement', description: 'Average virtual money balance' },
    
    // Retention
    { id: 'D1', title: 'D1 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-orange-500', category: 'Retention', description: 'Active for 1+ days' },
    { id: 'D3', title: 'D3 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-amber-500', category: 'Retention', description: 'Active for 3+ days' },
    { id: 'D7', title: 'D7 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-yellow-500', category: 'Retention', description: 'Active for 7+ days' },
    { id: 'D30', title: 'D30 Retention', value: '0%', icon: <RotateCcw className="w-4 h-4 text-white" />, color: 'bg-lime-500', category: 'Retention', description: 'Active for 30+ days' },
    { id: 'churn_rate', title: 'Churn Rate', value: '—', icon: <UserMinus className="w-4 h-4 text-white" />, color: 'bg-red-500', category: 'Retention', description: 'Who stopped using app' },
    
    // Tutorialи
    { id: 'tutorial_start', title: 'Tutorial Start', value: '—', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-blue-600', category: 'Tutorial', description: 'Users who started tutorial' },
    { id: 'tutorial_complete', title: 'Tutorial Complete', value: '—', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-green-600', category: 'Tutorial', description: 'Users who completed tutorial' },
    { id: 'tutorial_skip_rate', title: 'Tutorial Skip Rate', value: '—', icon: <SkipForward className="w-4 h-4 text-white" />, color: 'bg-gray-500', category: 'Tutorial', description: 'Users who skipped tutorial' },

    // Pro Tutorial
    { id: 'pro_tutorial_start', title: 'Pro Tutorial Start', value: '—', icon: <GraduationCap className="w-4 h-4 text-white" />, color: 'bg-purple-600', category: 'Tutorial', description: 'Premium users who started pro tutorial' },
    { id: 'pro_tutorial_complete', title: 'Pro Tutorial Complete', value: '—', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-indigo-600', category: 'Tutorial', description: 'Premium users who completed pro tutorial' },
    { id: 'pro_tutorial_skip_rate', title: 'Pro Tutorial Skip Rate', value: '—', icon: <SkipForward className="w-4 h-4 text-white" />, color: 'bg-slate-600', category: 'Tutorial', description: 'Premium users who skipped pro tutorial' },
    
    // Trading
    { id: 'price_stream_start', title: 'Price Stream Start', value: '—', icon: <Activity className="w-4 h-4 text-white" />, color: 'bg-pink-500', category: 'Trading', description: 'Users who viewed live prices' },
    { id: 'order_open', title: 'Order Open', value: '—', icon: <ArrowUpRight className="w-4 h-4 text-white" />, color: 'bg-green-600', category: 'Trading', description: 'Total orders placed' },
    { id: 'order_close_auto', title: 'Order Close Auto', value: '—', icon: <ArrowDownRight className="w-4 h-4 text-white" />, color: 'bg-orange-600', category: 'Trading', description: 'Orders closed automatically' },
    { id: 'order_close_manual', title: 'Order Close Manual', value: '—', icon: <Hand className="w-4 h-4 text-white" />, color: 'bg-blue-600', category: 'Trading', description: 'Orders closed manually by users' },
    
    // Gamification & Ads
    { id: 'daily_reward_claimed', title: 'Daily Reward', value: '—', icon: <Gift className="w-4 h-4 text-white" />, color: 'bg-yellow-600', category: 'Gamification', description: 'Users who claimed daily rewards' },
    { id: 'ads_watched', title: 'Ads Watched', value: '—', icon: <Play className="w-4 h-4 text-white" />, color: 'bg-red-600', category: 'Ads', description: 'Total ads viewed by users' },
    { id: 'ads_consent', title: 'Ads Consent', value: '—', icon: <Shield className="w-4 h-4 text-white" />, color: 'bg-slate-500', category: 'Ads', description: 'Users who gave ads consent' },
  ];

  const loadChartData = async (metricId: string) => {
    setChartLoading(true);
    setChartError(null);

    try {
      console.log(`Loading chart data for metric: ${metricId}`);

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

      const response = await fetch(`${config.api.baseUrl}/admin/dashboard/metric/${metricId}/trend?${params}`, {
        credentials: 'include'
      });

      console.log(`Response status: ${response.status}`);

      if (response.ok) {
        const data = await response.json();
        console.log('Chart data received:', data);

        // Проверяем, является ли метрика tutorial-метрикой
        const isTutorialMetric = [
          'tutorial_start', 'tutorial_complete', 'tutorial_skip_rate',
          'pro_tutorial_start', 'pro_tutorial_complete', 'pro_tutorial_skip_rate'
        ].includes(metricId);

        let formattedData: Array<{ date: string; Users: number; percent?: number; totalUsers?: number }>;

        if (isTutorialMetric) {
          // Для tutorial-метрик сервер возвращает { date, percent, userCount, totalUsers }
          // Мы показываем userCount как значение на графике
          formattedData = data.map((item: any) => ({
            date: item.date, // Сервер уже возвращает в правильном формате
            Users: Math.floor(item.userCount || 0),
            percent: item.percent,
            totalUsers: Math.floor(item.totalUsers || 0)
          }));
        } else {
          // Для остальных метрик - стандартная обработка
          formattedData = data.map((item: any) => ({
            date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            Users: Math.floor(item.value || 0)
          }));
        }

        // Создаем полный период данных на основе выбранного диапазона
        const fullData: Array<{ date: string; Users: number; percent?: number; totalUsers?: number }> = [];
        const startDate = new Date(dateRange.startDate);
        const endDate = new Date(dateRange.endDate);

        for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
          let dateString: string;
          if (isTutorialMetric) {
            // Для tutorial-метрик используем ISO формат даты
            dateString = d.toISOString().slice(0, 10);
          } else {
            // Для остальных метрик используем локализованный формат
            dateString = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }

          // Ищем данные для этой даты
          const existingData = formattedData.find(item => {
            if (isTutorialMetric) {
              return item.date === dateString;
            } else {
              return item.date === dateString;
            }
          });

          fullData.push({
            date: dateString,
            Users: existingData ? Math.floor(existingData.Users) : 0,
            percent: existingData?.percent,
            totalUsers: existingData?.totalUsers
          });
        }

        // Улучшаем отображение для коротких периодов (Today/Yesterday/2 days)
        const msPerDay = 86400000;
        const inclusiveDays = Math.floor((endDate.getTime() - startDate.getTime()) / msPerDay) + 1;
        if (inclusiveDays <= 1) {
          const prev = new Date(startDate.getTime() - msPerDay);
          const next = new Date(endDate.getTime() + msPerDay);
          const dateFormat = isTutorialMetric ?
            (d: Date) => d.toISOString().slice(0, 10) :
            (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const padded = [
            { date: dateFormat(prev), Users: 0, percent: undefined, totalUsers: undefined },
            fullData[0] ? { ...fullData[0], date: dateFormat(startDate) } : { date: dateFormat(startDate), Users: 0, percent: undefined, totalUsers: undefined },
            { date: dateFormat(next), Users: 0, percent: undefined, totalUsers: undefined }
          ];
          console.log('Chart data padded for single-day range:', padded);
          setChartData(padded);
        } else if (inclusiveDays === 2) {
          const prev = new Date(startDate.getTime() - msPerDay);
          const next = new Date(endDate.getTime() + msPerDay);
          const dateFormat = isTutorialMetric ?
            (d: Date) => d.toISOString().slice(0, 10) :
            (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

          const padded = [
            { date: dateFormat(prev), Users: 0, percent: undefined, totalUsers: undefined },
            ...fullData.map(item => {
              if (isTutorialMetric) {
                return { ...item, date: dateFormat(new Date(item.date)) };
              } else {
                return item;
              }
            }),
            { date: dateFormat(next), Users: 0, percent: undefined, totalUsers: undefined }
          ];
          console.log('Chart data padded for two-day range:', padded);
          setChartData(padded);
        } else {
          console.log('Chart data with selected date range:', fullData);
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
            sessions: data.totalEvents || '—',
            ads_watched: '—',
          };
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
  }, [dateRange, selectedFilters]);


  // Update metrics with loaded data
  console.log('Current metricsData:', metricsData);
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
                  // Для tutorial-метрик рассчитываем общий процент за период
                  const isTutorialMetric = [
                    'tutorial_start', 'tutorial_complete', 'tutorial_skip_rate',
                    'pro_tutorial_start', 'pro_tutorial_complete', 'pro_tutorial_skip_rate'
                  ].includes(selectedMetric.id);

                  if (isTutorialMetric && chartData.length > 0) {
                    // Сервер теперь возвращает одинаковый percent для всех дней (общий за период)
                    return `${chartData[0]?.percent || 0}%`;
                  }

                  return selectedMetric.value;
                })()}
              </p>
              <div className="mt-6 hidden sm:block">
              <AreaChart
                data={chartData.length > 0 ? chartData : [
                  { date: 'No Data', Users: 0 }
                ]}
                index="date"
                categories={['Users']}
                colors={['blue']}
                showLegend={false}
                showGradient={false}
                  valueFormatter={getValueFormatter(selectedMetric.id)}
                  showYAxis={true}
                  yAxisWidth={60}
                  maxValue={Math.max(...chartData.map(d => d.Users), 1)}
                  customTooltip={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
                          <p className="text-blue-600 text-sm">
                            Users: {getValueFormatter(selectedMetric.id)(typeof payload[0].value === 'number' ? payload[0].value : 0)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  className="h-48 chart-y-axis-whole-numbers [&_.recharts-cartesian-axis-tick-value]:text-xs [&_.recharts-cartesian-axis-tick-value]:fill-gray-600"
                />
              </div>
              <div className="mt-6 block sm:hidden">
                <AreaChart
                  data={chartData.length > 0 ? chartData : [
                    { date: 'No Data', Users: 0 }
                  ]}
                  index="date"
                  categories={['Users']}
                  colors={['blue']}
                  showLegend={false}
                  showGradient={false}
                  valueFormatter={getValueFormatter(selectedMetric.id)}
                  startEndOnly={true}
                showYAxis={true}
                  yAxisWidth={60}
                  maxValue={Math.max(...chartData.map(d => d.Users), 1)}
                  customTooltip={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                          <p className="text-gray-700 font-medium text-sm mb-1">{label}</p>
                          <p className="text-blue-600 text-sm">
                            Users: {getValueFormatter(selectedMetric.id)(typeof payload[0].value === 'number' ? payload[0].value : 0)}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                  className="h-48 chart-y-axis-whole-numbers [&_.recharts-cartesian-axis-tick-value]:text-xs [&_.recharts-cartesian-axis-tick-value]:fill-gray-600"
                />
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


