import React from 'react';
import CustomCheckbox from './CustomCheckbox';

type DateRange = {
  startDate: Date;
  endDate: Date;
  label: string;
};

type DateRangeFilterProps = {
  selectedRange: DateRange;
  onChange: (range: DateRange) => void;
};

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({ selectedRange, onChange }) => {

  // Preset date ranges
  const presets = [
    {
      label: 'Today',
      getValue: () => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const endOfDay = new Date(today);
        endOfDay.setUTCHours(23, 59, 59, 999);
        return { startDate: today, endDate: endOfDay, label: 'Today' };
      }
    },
    {
      label: 'Yesterday',
      getValue: () => {
        const yesterday = new Date();
        yesterday.setUTCDate(yesterday.getUTCDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        const endOfYesterday = new Date(yesterday);
        endOfYesterday.setUTCHours(23, 59, 59, 999);
        return { startDate: yesterday, endDate: endOfYesterday, label: 'Yesterday' };
      }
    },
    {
      label: 'Last 7 days',
      getValue: () => {
        const end = new Date();
        end.setUTCHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setUTCDate(end.getUTCDate() - 6);
        start.setUTCHours(0, 0, 0, 0);
        return { startDate: start, endDate: end, label: 'Last 7 days' };
      }
    },
    {
      label: 'Last 30 days',
      getValue: () => {
        const end = new Date();
        end.setUTCHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setUTCDate(end.getUTCDate() - 29);
        start.setUTCHours(0, 0, 0, 0);
        return { startDate: start, endDate: end, label: 'Last 30 days' };
      }
    },
    {
      label: 'Last 90 days',
      getValue: () => {
        const end = new Date();
        end.setUTCHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setUTCDate(end.getUTCDate() - 89);
        start.setUTCHours(0, 0, 0, 0);
        return { startDate: start, endDate: end, label: 'Last 90 days' };
      }
    },
    {
      label: 'This month',
      getValue: () => {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59, 999));
        return { startDate: start, endDate: end, label: 'This month' };
      }
    },
    {
      label: 'Last month',
      getValue: () => {
        const now = new Date();
        const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
        const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0, 23, 59, 59, 999));
        return { startDate: start, endDate: end, label: 'Last month' };
      }
    }
  ];


  const handlePresetSelect = (preset: typeof presets[0]) => {
    const range = preset.getValue();
    onChange(range);
  };


  return (
    <div className="min-w-max p-2">
      <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1 whitespace-nowrap">
        Select Time Period
      </h4>
      <div className="space-y-0.5">
        {presets.map((preset) => {
          const isSelected = selectedRange.label === preset.label;
          return (
            <CustomCheckbox
              key={preset.label}
              checked={isSelected}
              onChange={() => handlePresetSelect(preset)}
              label={preset.label}
            />
          );
        })}
      </div>
    </div>
  );
};

export default DateRangeFilter;
