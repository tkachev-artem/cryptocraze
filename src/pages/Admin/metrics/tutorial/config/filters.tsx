import React from 'react';
import { Calendar } from 'lucide-react';
import type { TutorialMetricId } from '../types';

export const TUTORIAL_FILTER_CONFIG: Record<TutorialMetricId, any[]> = {
  tutorial_start: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ],
  tutorial_complete: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ],
  tutorial_skip_rate: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ],
  pro_tutorial_start: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ],
  pro_tutorial_complete: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ],
  pro_tutorial_skip_rate: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ]
};
