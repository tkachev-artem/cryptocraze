import type { TutorialMetricId } from '../types';

export const getTutorialChartConfig = (metricId: TutorialMetricId) => {
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

  return baseConfig;
};

