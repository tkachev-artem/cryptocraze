import React from 'react';
import { Calendar, Users, Globe } from 'lucide-react';

export const RETENTION_FILTER_CONFIG = {
  D1: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    },
    {
      id: 'userType',
      type: 'select',
      label: 'User Type',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'free', label: 'FREE', value: 'free' },
        { id: 'premium', label: 'PRO', value: 'premium' }
      ]
    },
    {
      id: 'geography',
      type: 'country',
      label: 'Country',
      icon: <Globe className="w-4 h-4" />
    }
  ],
  D3: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    },
    {
      id: 'userType',
      type: 'select',
      label: 'User Type',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'free', label: 'FREE', value: 'free' },
        { id: 'premium', label: 'PRO', value: 'premium' }
      ]
    },
    {
      id: 'geography',
      type: 'country',
      label: 'Country',
      icon: <Globe className="w-4 h-4" />
    }
  ],
  D7: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    },
    {
      id: 'userType',
      type: 'select',
      label: 'User Type',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'free', label: 'FREE', value: 'free' },
        { id: 'premium', label: 'PRO', value: 'premium' }
      ]
    },
    {
      id: 'geography',
      type: 'country',
      label: 'Country',
      icon: <Globe className="w-4 h-4" />
    }
  ],
  D30: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    },
    {
      id: 'userType',
      type: 'select',
      label: 'User Type',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'free', label: 'FREE', value: 'free' },
        { id: 'premium', label: 'PRO', value: 'premium' }
      ]
    },
    {
      id: 'geography',
      type: 'country',
      label: 'Country',
      icon: <Globe className="w-4 h-4" />
    }
  ],
  churn_rate: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    },
    {
      id: 'userType',
      type: 'select',
      label: 'User Type',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'free', label: 'FREE', value: 'free' },
        { id: 'premium', label: 'PRO', value: 'premium' }
      ]
    },
    {
      id: 'geography',
      type: 'country',
      label: 'Country',
      icon: <Globe className="w-4 h-4" />
    }
  ]
};
