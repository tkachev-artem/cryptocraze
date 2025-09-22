import React, { useState } from 'react';
import { Users, Globe, X } from 'lucide-react';
import DateRangeFilter from './DateRangeFilter';
import CountryFilter from './CountryFilter';

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

type FilterBarProps = {
  dateRange: DateRange;
  onDateRangeChange: (range: DateRange) => void;
  selectedFilters: Record<string, string[]>;
  onFiltersChange: (filters: Record<string, string[]>) => void;
};

const FilterBar: React.FC<FilterBarProps> = ({
  dateRange,
  onDateRangeChange,
  selectedFilters,
  onFiltersChange
}) => {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  // Filter definitions
  const filterDefinitions = {
    userType: {
      label: 'User Type',
      icon: <Users className="w-4 h-4" />,
      options: [
        { id: 'free', label: 'Free Users', value: 'free' },
        { id: 'premium', label: 'Premium Users', value: 'premium' }
      ]
    }
  };

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


  const getActiveFilterCount = () => {
    return Object.values(selectedFilters).reduce((count, values) => count + values.length, 0);
  };

  const getFilterDisplayText = (filterId: string) => {
    const selectedValues = selectedFilters[filterId] || [];
    const filterDef = filterDefinitions[filterId as keyof typeof filterDefinitions];
    
    if (selectedValues.length === 0) return filterDef.label;
    if (selectedValues.length === 1) {
      const option = filterDef.options.find(opt => opt.value === selectedValues[0]);
      return option?.label || filterDef.label;
    }
    // При множественном выборе не показываем счётчик
    return filterDef.label;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        {/* Date Range Filter */}
        <DateRangeFilter
          selectedRange={dateRange}
          onChange={onDateRangeChange}
        />

        {/* Other Filters */}
        {Object.entries(filterDefinitions).map(([filterId, filterDef]) => (
          <div key={filterId} className="relative">
            <button
              onClick={() => setOpenDropdown(openDropdown === filterId ? null : filterId)}
              className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
                selectedFilters[filterId]?.length > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
              }`}
            >
              {filterDef.icon}
              <span>{getFilterDisplayText(filterId)}</span>
              {selectedFilters[filterId]?.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFilter(filterId);
                  }}
                  className="ml-1 hover:bg-blue-100 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </button>

            {openDropdown === filterId && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="p-2 max-h-60 overflow-y-auto">
                  {filterDef.options.map((option) => (
                    <label
                      key={option.id}
                      className="flex items-center gap-2 px-3 py-2 hover:bg-gray-50 rounded-md cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedFilters[filterId]?.includes(option.value) || false}
                        onChange={() => handleFilterToggle(filterId, option.value)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700">{option.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Country Filter */}
        <CountryFilter
          selectedValues={selectedFilters.geography || []}
          onToggle={(value) => handleFilterToggle('geography', value)}
          onClear={() => clearFilter('geography')}
          isOpen={openDropdown === 'geography'}
          onToggleOpen={() => setOpenDropdown(openDropdown === 'geography' ? null : 'geography')}
        />

        {/* Clear All Filters removed */}
      </div>

      {/* Active Filters Display */}
      {getActiveFilterCount() > 0 && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {Object.entries(selectedFilters).map(([filterId, values]) =>
              values.map((value) => {
                const filterDef = filterDefinitions[filterId as keyof typeof filterDefinitions];
                const option = filterDef.options.find(opt => opt.value === value);
                return (
                  <span
                    key={`${filterId}-${value}`}
                    className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                  >
                    {filterDef.label}: {option?.label || value}
                    <button
                      onClick={() => handleFilterToggle(filterId, value)}
                      className="hover:bg-blue-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default FilterBar;
