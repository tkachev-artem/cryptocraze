import React, { useState } from 'react';
import { Calendar, Users, Globe, ChevronDown, X } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import CountryFilter from './CountryFilter';
import CustomCheckbox from './CustomCheckbox';

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

type FilterOption = {
  id: string;
  label: string;
  value: string;
};

type FilterDefinition = {
  id: string;
  type: 'dateRange' | 'select' | 'country';
  label: string;
  icon: React.ReactNode;
  options?: FilterOption[];
  defaultValue?: any;
};

type MetricFiltersProps = {
  metricId: string;
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedFilters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
};

// Конфигурация фильтров для разных метрик
const FILTER_CONFIGS: Record<string, FilterDefinition[]> = {
  // Tutorial метрики
  tutorial_start: [
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
  tutorial_complete: [
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
  tutorial_skip_rate: [
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
  pro_tutorial_start: [
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
  pro_tutorial_complete: [
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
  pro_tutorial_skip_rate: [
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
  // Retention метрики
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
  // Другие метрики могут иметь только дату
  sessions: [
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
  screens_opened: [
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
  // Engagement метрики
  avg_virtual_balance: [
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
  session_duration: [
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
  daily_active_traders: [
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
  trading_frequency: [
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
    }
  ],
  // Trading метрики
  trades_per_user: [
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
    },
    {
      id: 'tradeActivity',
      type: 'select',
      label: 'Trade Activity',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'all', label: 'All', value: 'all' },
        { id: 'profit', label: 'Profit', value: 'profit' },
        { id: 'loss', label: 'Loss', value: 'loss' }
      ]
    }
  ],
  order_open: [
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
  order_close: [
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
    },
    {
      id: 'tradeActivity',
      type: 'select',
      label: 'Trade Activity',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'all', label: 'All', value: 'all' },
        { id: 'profit', label: 'Profit', value: 'profit' },
        { id: 'loss', label: 'Loss', value: 'loss' }
      ]
    }
  ],
  win_rate: [
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
  average_profit_loss: [
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
  max_profit_trade: [
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
  max_loss_trade: [
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
  average_holding_time: [
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
  // Acquisition метрики
  page_visits: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ],
  // Churn и Sign-up метрики
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
  ],
  sign_up_rate: [
    {
      id: 'dateRange',
      type: 'dateRange',
      label: 'Date Range',
      icon: <Calendar className="w-4 h-4" />,
      defaultValue: 'Last 7 days'
    }
  ]
};

const MetricFilters: React.FC<MetricFiltersProps> = ({
  metricId,
  dateRange,
  onDateRangeChange,
  selectedFilters,
  onFiltersChange
}) => {
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  // Получаем конфигурацию фильтров для текущей метрики
  const filterConfig = FILTER_CONFIGS[metricId] || FILTER_CONFIGS.default;

  const handleFilterToggle = (filterId: string, optionValue: string) => {
    const currentValues = selectedFilters[filterId] || [];
    const newValues = currentValues.includes(optionValue)
      ? currentValues.filter(v => v !== optionValue)
      : [...currentValues, optionValue];
    
    onFiltersChange({
      ...selectedFilters,
      [filterId]: newValues
    });
  };

  const clearFilter = (filterId: string) => {
    const newFilters = { ...selectedFilters };
    delete newFilters[filterId];
    onFiltersChange(newFilters);
  };

  const getFilterDisplayText = (filter: FilterDefinition) => {
    if (filter.type === 'select') {
      const selectedValues = selectedFilters[filter.id] || [];
      if (selectedValues.length === 0) return filter.label;
      if (selectedValues.length === 1) {
        const option = filter.options?.find(opt => opt.value === selectedValues[0]);
        return option?.label || filter.label;
      }
      // При множественном выборе не показываем счётчик
      return filter.label;
    }
    return filter.label;
  };

  const renderFilter = (filter: FilterDefinition) => {
    switch (filter.type) {
      case 'dateRange':
        return (
          <div key={filter.id} className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === filter.id ? null : filter.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                dateRange.label !== filter.defaultValue
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.icon}
              <span>{dateRange.label}</span>
              {dateRange.label !== filter.defaultValue ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    const end = new Date();
                    end.setUTCHours(23, 59, 59, 999);
                    const start = new Date(end);
                    start.setUTCDate(end.getUTCDate() - 6);
                    start.setUTCHours(0, 0, 0, 0);
                    onDateRangeChange({ startDate: start, endDate: end, label: 'Last 7 days' });
                  }}
                  className="ml-1 hover:bg-green-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {openFilter === filter.id && (
              <div className="absolute top-full right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                <DateRangeFilter
                  selectedRange={dateRange}
                  onChange={(range) => {
                    onDateRangeChange(range);
                    setOpenFilter(null);
                  }}
                />
              </div>
            )}
          </div>
        );

      case 'select':
        return (
          <div key={filter.id} className="relative">
            <button
              onClick={() => setOpenFilter(openFilter === filter.id ? null : filter.id)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                selectedFilters[filter.id]?.length > 0
                  ? 'bg-green-50 border-green-200 text-green-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filter.icon}
              <span>{getFilterDisplayText(filter)}</span>
              {selectedFilters[filter.id]?.length > 0 ? (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter(filter.id);
                  }}
                  className="ml-1 hover:bg-green-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {openFilter === filter.id && (
              <div className="absolute top-full right-0 mt-2 min-w-max bg-white border border-gray-200 rounded-lg shadow-xl z-50">
                <div className="p-2">
                  <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1 whitespace-nowrap">
                    Select {filter.label}
                  </h4>
                  <div className="space-y-0.5 max-h-60 overflow-y-auto">
                    {filter.options?.map((option) => {
                      const isSelected = selectedFilters[filter.id]?.includes(option.value) || false;
                      return (
                        <CustomCheckbox
                          key={option.id}
                          checked={isSelected}
                          onChange={() => handleFilterToggle(filter.id, option.value)}
                          label={option.label}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'country':
        return (
          <CountryFilter
            key={filter.id}
            selectedValues={selectedFilters[filter.id] || []}
            onToggle={(value) => handleFilterToggle(filter.id, value)}
            onClear={() => clearFilter(filter.id)}
            isOpen={openFilter === filter.id}
            onToggleOpen={() => setOpenFilter(openFilter === filter.id ? null : filter.id)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-row flex-wrap items-center gap-3">
      {filterConfig.map(renderFilter)}
    </div>
  );
};

export default MetricFilters;
