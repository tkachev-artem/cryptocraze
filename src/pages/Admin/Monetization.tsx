import React, { useState, useEffect } from 'react';
import { 
  DollarSign, 
  CreditCard, 
  TrendingUp, 
  Users, 
  Play, 
  Eye, 
  Target, 
  Gift, 
  Crown, 
  ShoppingCart,
  BarChart3,
  Activity,
  MousePointer,
  CheckCircle,
  AlertCircle,
  Percent,
  Coins,
  Zap,
  Shield
} from 'lucide-react';
import { AreaChart, Card } from '@tremor/react';
import { computeYAxis } from './utils/computeYAxis';
import { config } from '../../lib/config';
import MetricTable from './components/MetricTable';
import MetricFilters from './components/MetricFilters';

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

const Monetization: React.FC = () => {
  const [selectedMetric, setSelectedMetric] = useState<Metric | null>(null);
  const [metricsData, setMetricsData] = useState<Record<string, string | number>>({});
  const [chartData, setChartData] = useState<Array<{ date: string; [key: string]: number | string }>>([]);
  const [loading, setLoading] = useState(true);
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<string | null>(null);
  const [dynamicOverallPercent, setDynamicOverallPercent] = useState<number | null>(null);
  const [dynamicYAxisMaxValue, setDynamicYAxisMaxValue] = useState<number | null>(null);
  const [dynamicYAxisMinValue, setDynamicYAxisMinValue] = useState<number>(0);
  
  const Y_AXIS_MULTIPLIER = 1.2;

  // Определение метрик, для которых процент рассчитывается динамически
  const dynamicPercentageMetricIds = new Set([
    'conversion_to_paid', 'pro_subscription_conversion', 'ad_engagement_rate',
    'rewarded_video_completion_rate', 'achievement_completion_rate'
  ]);

  // Filter states
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    const start = new Date(end);
    start.setUTCDate(end.getUTCDate() - 6);
    start.setUTCHours(0, 0, 0, 0);
    return { startDate: start, endDate: end, label: 'Last 7 days' };
  });
  const [selectedFilters, setSelectedFilters] = useState<Record<string, string[]>>({});

  // Define all monetization metrics
  const allMetrics: Metric[] = [
    // Revenue Metrics
    { id: 'total_revenue', title: 'Total Revenue', value: '—', icon: <DollarSign className="w-4 h-4 text-white" />, color: 'bg-green-600', category: 'Revenue', description: 'Total revenue from all sources' },
    { id: 'ARPU', title: 'ARPU', value: '—', icon: <TrendingUp className="w-4 h-4 text-white" />, color: 'bg-blue-600', category: 'Revenue', description: 'Average Revenue Per User' },
    { id: 'ARPPU', title: 'ARPPU', value: '—', icon: <Users className="w-4 h-4 text-white" />, color: 'bg-purple-600', category: 'Revenue', description: 'Average Revenue Per Paying User' },
    { id: 'revenue_growth_rate', title: 'Revenue Growth', value: '—', icon: <Activity className="w-4 h-4 text-white" />, color: 'bg-indigo-600', category: 'Revenue', description: 'Month-over-month revenue growth' },
    
    // Conversion Metrics
    { id: 'conversion_to_paid', title: 'Conversion to Paid', value: '0%', icon: <Target className="w-4 h-4 text-white" />, color: 'bg-orange-600', category: 'Conversion', description: 'Percentage of users who made a purchase' },
    { id: 'pro_subscription_conversion', title: 'Pro Subscription', value: '0%', icon: <Crown className="w-4 h-4 text-white" />, color: 'bg-yellow-600', category: 'Conversion', description: 'Conversion to Pro subscription' },
    { id: 'virtual_currency_purchases', title: 'Virtual Currency', value: '—', icon: <Coins className="w-4 h-4 text-white" />, color: 'bg-amber-600', category: 'Conversion', description: 'Virtual currency purchases' },
    { id: 'purchase_frequency', title: 'Purchase Frequency', value: '—', icon: <ShoppingCart className="w-4 h-4 text-white" />, color: 'bg-teal-600', category: 'Conversion', description: 'Average purchases per paying user' },
    { id: 'average_purchase_value', title: 'Avg Purchase Value', value: '—', icon: <CreditCard className="w-4 h-4 text-white" />, color: 'bg-cyan-600', category: 'Conversion', description: 'Average value per purchase' },
    
    // Ad Performance
    { id: 'ads_watched', title: 'Ads Watched', value: '—', icon: <Play className="w-4 h-4 text-white" />, color: 'bg-red-600', category: 'Ads', description: 'Total ads viewed by users' },
    { id: 'ads_watched_per_user', title: 'Ads/User', value: '—', icon: <Eye className="w-4 h-4 text-white" />, color: 'bg-pink-600', category: 'Ads', description: 'Average ads watched per user' },
    { id: 'ad_engagement_rate', title: 'Ad Engagement', value: '0%', icon: <MousePointer className="w-4 h-4 text-white" />, color: 'bg-rose-600', category: 'Ads', description: 'Percentage of users engaging with ads' },
    { id: 'rewarded_video_completion_rate', title: 'Video Completion', value: '0%', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-emerald-600', category: 'Ads', description: 'Rewarded video completion rate' },
    { id: 'interstitial_impression_rate', title: 'Interstitial Rate', value: '0%', icon: <AlertCircle className="w-4 h-4 text-white" />, color: 'bg-lime-600', category: 'Ads', description: 'Interstitial ad impression rate' },
    { id: 'video_bonus_usage', title: 'Video Bonus Usage', value: '—', icon: <Zap className="w-4 h-4 text-white" />, color: 'bg-orange-500', category: 'Ads', description: 'Users using video bonus feature' },
    { id: 'reward_redemption_rate', title: 'Reward Redemption', value: '0%', icon: <Percent className="w-4 h-4 text-white" />, color: 'bg-violet-600', category: 'Ads', description: 'Percentage of rewards redeemed' },
    
    // Gamification Revenue
    { id: 'daily_reward_claimed', title: 'Daily Rewards', value: '—', icon: <Gift className="w-4 h-4 text-white" />, color: 'bg-yellow-500', category: 'Gamification', description: 'Users who claimed daily rewards' },
    { id: 'wheel_spin_frequency', title: 'Wheel Spins', value: '—', icon: <BarChart3 className="w-4 h-4 text-white" />, color: 'bg-blue-500', category: 'Gamification', description: 'Average wheel spins per user' },
    { id: 'box_open_frequency', title: 'Box Opens', value: '—', icon: <ShoppingCart className="w-4 h-4 text-white" />, color: 'bg-green-500', category: 'Gamification', description: 'Average box opens per user' },
    { id: 'golden_prize_wins', title: 'Golden Prizes', value: '—', icon: <Crown className="w-4 h-4 text-white" />, color: 'bg-yellow-400', category: 'Gamification', description: 'Number of golden prize wins' },
    { id: 'no_ads_activation_rate', title: 'No Ads Activation', value: '0%', icon: <Shield className="w-4 h-4 text-white" />, color: 'bg-purple-500', category: 'Gamification', description: 'Rate of no-ads feature activation' },
    { id: 'achievement_completion_rate', title: 'Achievement Rate', value: '0%', icon: <CheckCircle className="w-4 h-4 text-white" />, color: 'bg-indigo-500', category: 'Gamification', description: 'Percentage of achievements completed' },
  ];

  // Унифицированное форматирование значений оси/tooltip
  const formatAxisTick = (value: number, decimals: number = 2) => {
    const v = Number(value ?? 0);
    if (!Number.isFinite(v)) return '0';
    return String(parseFloat(v.toFixed(decimals)));
  };

  const percentMetricIds = new Set([
    'conversion_to_paid', 'pro_subscription_conversion', 'ad_engagement_rate',
    'rewarded_video_completion_rate', 'interstitial_impression_rate', 'reward_redemption_rate',
    'no_ads_activation_rate', 'achievement_completion_rate'
  ]);

  // Функция для получения конфига графика
  const getMetricChartConfig = (metricId: string) => {
    const isPercent = percentMetricIds.has(metricId);
    return {
      categories: ['Revenue'],
      colors: ['blue'],
      showLegend: false,
      showGradient: false,
      showYAxis: true,
      valueFormatter: (value: number) => isPercent ? `${formatAxisTick(value, 0)}%` : formatAxisTick(value, 2),
      tooltipLabel: isPercent ? 'Percent' : 'Value',
      tooltipValue: (value: number) => isPercent ? `${formatAxisTick(value, 0)}%` : formatAxisTick(value, 2)
    };
  };

  const getMetricValueFormatter = (metricId: string) => {
    const config = getMetricChartConfig(metricId);
    return config.valueFormatter;
  };

  const getMetricTooltipValueFormatter = (metricId: string) => {
    const config = getMetricChartConfig(metricId);
    return config.tooltipValue;
  };

  const loadChartData = async (metricId: string) => {
    setChartLoading(true);
    setChartError(null);

    try {
      const params = new URLSearchParams({
        startDate: dateRange.startDate.toISOString(),
        endDate: dateRange.endDate.toISOString(),
        ...Object.fromEntries(
          Object.entries(selectedFilters).map(([key, values]) => {
            const serverKey = key === 'geography' ? 'country' : key;
            return [serverKey, values.join(',')];
          })
        )
      });

      const apiUrl = `${config.api.baseUrl}/admin/dashboard/metric/${metricId}/trend?${params}`;
      const response = await fetch(apiUrl, {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        let trendData: Array<{ date: string; value: number }> = data || [];
        
        const { min, max } = computeYAxis(trendData.map(i => i.value), dynamicPercentageMetricIds.has(metricId) ? 'percent' : 'auto');
        setDynamicYAxisMinValue(min);
        setDynamicYAxisMaxValue(max);

        const formattedData: Array<{ date: string; [key: string]: number | string }> = trendData.map((item: any) => {
          const dateObj = new Date(item.date);
          if (isNaN(dateObj.getTime())) {
            return { date: 'Invalid Date', [getMetricChartConfig(selectedMetric!.id).categories[0]]: item.value || 0 };
          }
          return {
            date: dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            [getMetricChartConfig(selectedMetric!.id).categories[0]]: item.value || 0
          };
        });

        setChartData(formattedData);
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
        const params = new URLSearchParams({
          startDate: dateRange.startDate.toISOString(),
          endDate: dateRange.endDate.toISOString(),
          ...Object.fromEntries(
            Object.entries(selectedFilters).map(([key, values]) => {
              const serverKey = key === 'geography' ? 'country' : key;
              return [serverKey, values.join(',')];
            })
          )
        });

        const response = await fetch(`${config.api.baseUrl}/admin/dashboard/monetization/overview`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          const processedMetrics = {
            total_revenue: data.totalRevenue || '—',
            ARPU: data.ARPU || '—',
            ARPPU: data.ARPPU || '—',
            revenue_growth_rate: data.revenueGrowthRate || '—',
            conversion_to_paid: data.conversionToPaid || '0%',
            pro_subscription_conversion: data.proSubscriptionConversion || '0%',
            virtual_currency_purchases: data.virtualCurrencyPurchases || '—',
            purchase_frequency: data.purchaseFrequency || '—',
            average_purchase_value: data.averagePurchaseValue || '—',
            ads_watched: data.adsWatched || '—',
            ads_watched_per_user: data.adsWatchedPerUser || '—',
            ad_engagement_rate: data.adEngagementRate || '0%',
            rewarded_video_completion_rate: data.rewardedVideoCompletionRate || '0%',
            interstitial_impression_rate: data.interstitialImpressionRate || '0%',
            video_bonus_usage: data.videoBonusUsage || '—',
            reward_redemption_rate: data.rewardRedemptionRate || '0%',
            daily_reward_claimed: data.dailyRewardClaimed || '—',
            wheel_spin_frequency: data.wheelSpinFrequency || '—',
            box_open_frequency: data.boxOpenFrequency || '—',
            golden_prize_wins: data.goldenPrizeWins || '—',
            no_ads_activation_rate: data.noAdsActivationRate || '0%',
            achievement_completion_rate: data.achievementCompletionRate || '0%',
          };
          
          setMetricsData(processedMetrics);
        } else {
          console.error('Failed to load monetization metrics:', response.status);
        }
      } catch (error) {
        console.error('Failed to load monetization metrics:', error);
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, [dateRange, selectedFilters]);

  useEffect(() => {
    if (selectedMetric) {
      loadChartData(selectedMetric.id);
    }
  }, [selectedMetric]);

  useEffect(() => {
    if (selectedMetric) {
      loadChartData(selectedMetric.id);
    }
  }, [dateRange, selectedFilters]);

  // Update metrics with loaded data
  const metricsWithData = allMetrics.map(metric => ({
    ...metric,
    value: metricsData[metric.id] !== undefined ? metricsData[metric.id] : metric.value
  }));

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
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Monetization Metrics</h3>
          
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
                <div className="flex flex-row flex-wrap items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${selectedMetric.color}`}>
                      {selectedMetric.icon}
                    </div>
                    <h1 className="text-xl font-bold text-gray-900">{selectedMetric.title}</h1>
                  </div>
                  
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
                    return isDynamic && dynamicOverallPercent !== null
                      ? `${dynamicOverallPercent}%`
                      : selectedMetric.value;
                  })()}
                </p>
                <div className="mt-6">
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
                    className="h-48 [&_.recharts-cartesian-axis-tick-value]:text-xs [&_.recharts-cartesian-axis-tick-value]:fill-gray-600"
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
                <DollarSign className="w-8 h-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2">Select a Monetization Metric</h3>
              <p className="text-sm text-gray-500 max-w-sm">
                Choose a metric from the sidebar to view detailed revenue, conversion, and ad performance analytics.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Monetization;


