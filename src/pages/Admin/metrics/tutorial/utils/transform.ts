import type { TutorialTrendPoint } from '../types';

export const toChartData = (rows: any[]): { date: string; Users: number; userCount?: number }[] => {
  return rows.map((r: any) => ({
    date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    Users: Math.floor(r.percent || 0),
    userCount: Math.floor(r.userCount || 0),
  }));
};


