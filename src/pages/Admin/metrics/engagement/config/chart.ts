export const engagementChartConfig = {
    categories: ['Users'],
    colors: ['blue'],
    showLegend: false,
    showGradient: false,
    showYAxis: true,
    valueFormatter: (value: number) => value.toString(),
    tooltipLabel: 'Users',
    tooltipValue: (value: number) => value.toString()
};
