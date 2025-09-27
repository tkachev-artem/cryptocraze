import type { TutorialMetricId } from '../types';

export const getTutorialChartConfig = (metricId: TutorialMetricId) => {
  const baseConfig = {
    categories: ['Users'],
    colors: ['purple'],
    showLegend: false,
    showGradient: false,
    showYAxis: true,
    valueFormatter: (value: number) => value.toString(),
    tooltipLabel: 'Users',
    tooltipValue: (value: number) => value.toString()
  };

  return baseConfig;
};

