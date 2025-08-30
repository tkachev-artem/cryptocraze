import React, { useEffect, useRef, useState } from 'react';
import { createChart, LineSeries, IChartApi, ISeriesApi, LineData } from 'lightweight-charts';
import { useTranslation } from '@/lib/i18n';

interface ProfitLossChartProps {
  userId?: string;
  height?: number;
  days?: number;
}

interface ChartDataPoint {
  date: string;
  profit: number;
  trades: number;
}

const ProfitLossChart: React.FC<ProfitLossChartProps> = ({ 
  userId, 
  height = 300,
  days = 30 
}) => {
  const { t } = useTranslation();
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch chart data
  const fetchChartData = async () => {
    if (!userId) return;
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/dashboard/profit-chart?days=${days}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch chart data');
      }
      
      const result = await response.json();
      setData(result.data || []);
    } catch (err) {
      console.error('Error fetching chart data:', err);
      setError('Failed to load chart data');
    } finally {
      setIsLoading(false);
    }
  };

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart with same styling as existing Chart.tsx
    chartRef.current = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: height,
      layout: {
        background: { color: '#ffffff' },
        textColor: '#333333',
      },
      grid: {
        vertLines: { color: '#f0f0f0' },
        horzLines: { color: '#f0f0f0' },
      },
      rightPriceScale: {
        borderColor: '#cccccc',
      },
      timeScale: {
        borderColor: '#cccccc',
        timeVisible: true,
        secondsVisible: false,
      },
      localization: {
        priceFormatter: (price: number) => {
          return price >= 0 
            ? `+$${Math.abs(price).toFixed(2)}`
            : `-$${Math.abs(price).toFixed(2)}`;
        },
      },
    });

    // Create line series
    lineSeriesRef.current = chartRef.current.addSeries(LineSeries, {
      color: '#2EBD85', // Green color from ProfileDashboard
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerRadius: 4,
      crosshairMarkerBorderColor: '#2EBD85',
      crosshairMarkerBackgroundColor: '#2EBD85',
    });

    // Handle resize
    const handleResize = () => {
      if (chartRef.current && chartContainerRef.current) {
        chartRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        chartRef.current.remove();
      }
    };
  }, [height]);

  // Update chart data
  useEffect(() => {
    if (!lineSeriesRef.current || !data.length) return;

    const chartData: LineData[] = data.map((item) => ({
      time: item.date as any,
      value: item.profit,
    }));

    lineSeriesRef.current.setData(chartData);

    // Color based on profit/loss - dynamic color change
    const hasProfit = chartData.some(d => d.value > 0);
    const hasLoss = chartData.some(d => d.value < 0);
    
    let color = '#2EBD85'; // Default green
    if (hasLoss && !hasProfit) {
      color = '#F6465D'; // Red if only losses
    } else if (hasLoss && hasProfit) {
      color = '#F5A600'; // Orange if mixed
    }

    lineSeriesRef.current.applyOptions({ color });

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [data]);

  // Fetch data on mount and when deps change
  useEffect(() => {
    fetchChartData();
  }, [userId, days]);

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-base">{t('dashboard.profitChart') || 'Profit/Loss Chart'}</h3>
          <div className="text-xs text-black opacity-50">{days}d</div>
        </div>
        <div 
          style={{ height: `${height}px` }} 
          className="bg-gray-100 rounded animate-pulse flex items-center justify-center"
        >
          <div className="text-gray-400">Loading chart...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-base">{t('dashboard.profitChart') || 'Profit/Loss Chart'}</h3>
          <div className="text-xs text-black opacity-50">{days}d</div>
        </div>
        <div 
          style={{ height: `${height}px` }} 
          className="bg-red-50 border border-red-200 rounded flex items-center justify-center"
        >
          <div className="text-red-500 text-sm">Failed to load chart</div>
        </div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-bold text-base">{t('dashboard.profitChart') || 'Profit/Loss Chart'}</h3>
          <div className="text-xs text-black opacity-50">{days}d</div>
        </div>
        <div 
          style={{ height: `${height}px` }} 
          className="bg-gray-50 border border-gray-100 rounded flex items-center justify-center"
        >
          <div className="text-gray-500 text-sm">No trading data available</div>
        </div>
      </div>
    );
  }

  const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
  const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      {/* Header with stats - following ProfileDashboard pattern */}
      <div className="flex justify-between items-center mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
            totalProfit >= 0 ? 'bg-[#2EBD85]' : 'bg-[#F6465D]'
          }`}>
            <img 
              src={totalProfit >= 0 ? "/dashboard/up.svg" : "/dashboard/down.svg"} 
              alt="trend" 
              className="w-3 h-3 filter brightness-0 invert"
            />
          </div>
          <h3 className="font-bold text-base">{t('dashboard.profitChart') || 'Profit/Loss'}</h3>
        </div>
        <div className="text-right">
          <div className={`text-sm font-bold ${
            totalProfit >= 0 ? 'text-[#2EBD85]' : 'text-[#F6465D]'
          }`}>
            {totalProfit >= 0 ? '+' : ''}${totalProfit.toFixed(2)}
          </div>
          <div className="text-xs text-black opacity-50">
            {totalTrades} trades · {days}d
          </div>
        </div>
      </div>

      {/* Chart container */}
      <div 
        ref={chartContainerRef}
        style={{ height: `${height}px` }}
        className="rounded border border-gray-100"
      />
    </div>
  );
};

export default React.memo(ProfitLossChart);