import { RetentionMetric } from '../types/retention';

export const getRetentionChartConfig = (metricId: RetentionMetric) => {
  const baseConfig = {
    categories: ['Users'],
    colors: ['amber'],
    showLegend: false,
    showGradient: false,
    showYAxis: true,
    valueFormatter: (value: number) => `${Math.floor(value)}`, // Целое число пользователей
    tooltipLabel: 'Users',
    tooltipValue: (value: number) => `${Math.floor(value)}`,
  };

  if (metricId === 'churn_rate') {
    return {
      ...baseConfig,
      colors: ['pink'],
      tooltipLabel: 'Churned Users',
      tooltipValue: (value: number) => `${Math.floor(value)}`,
    };
  }

  return baseConfig;
};
