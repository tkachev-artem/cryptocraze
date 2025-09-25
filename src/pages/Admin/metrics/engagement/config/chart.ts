export const engagementChartConfig = {
    categories: ['Users'],
    colors: ['blue'],
    showLegend: false,
    showGradient: false,
    showYAxis: true,
    valueFormatter: (value: number) => value.toString(),
    tooltipLabel: (metricId: string) => {
        if (metricId === 'sessions') return 'Sessions';
        if (metricId === 'screens_opened') return 'Screens';
        if (metricId === 'avg_virtual_balance') return 'Balance';
        return 'Users';
    },
    tooltipValue: (value: number) => value.toString()
};
