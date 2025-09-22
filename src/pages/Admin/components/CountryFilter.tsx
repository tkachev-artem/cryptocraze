import React, { useState, useEffect } from 'react';
import { Globe, Search, X, ChevronDown } from 'lucide-react';
import { config } from '../../../lib/config';
import CustomCheckbox from './CustomCheckbox';

type CountryOption = {
  id: string;
  label: string;
  value: string;
};

type CountryFilterProps = {
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: () => void;
  isOpen: boolean;
  onToggleOpen: () => void;
};

const CountryFilter: React.FC<CountryFilterProps> = ({
  selectedValues,
  onToggle,
  onClear,
  isOpen,
  onToggleOpen
}) => {
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchCountries = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${config.api.baseUrl}/admin/dashboard/countries`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setCountries(data);
        }
      } catch (error) {
        console.error('Failed to load countries:', error);
      } finally {
        setLoading(false);
      }
    };

    if (isOpen && countries.length === 0) {
      fetchCountries();
    }
  }, [isOpen]);

  const filteredCountries = countries.filter(country =>
    country.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getDisplayText = () => {
    if (selectedValues.length === 0) return 'Country';
    if (selectedValues.length === 1) {
      const country = countries.find(c => c.value === selectedValues[0]);
      return country?.label || 'Country';
    }
    return `Country (${selectedValues.length})`;
  };

  return (
    <div className="relative">
      <button
        onClick={onToggleOpen}
        className={`inline-flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${
          selectedValues.length > 0
            ? 'bg-green-50 border-green-200 text-green-700'
            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Globe className="w-4 h-4" />
        <span>{getDisplayText()}</span>
        {selectedValues.length > 0 ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="ml-1 hover:bg-green-100 rounded-full p-0.5"
            >
            <X className="w-3 h-3" />
          </button>
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 min-w-max bg-white border border-gray-200 rounded-lg shadow-lg z-50">
          <div className="p-2">
            <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2 px-1 whitespace-nowrap">
              Select Country
            </h4>
            <div className="border-b border-gray-100 mb-2 pb-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search countries..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="min-w-[200px] pl-10 pr-4 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>
            </div>
          </div>
          
          <div className="max-h-60 overflow-y-auto px-2 pb-2">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading countries...</div>
            ) : filteredCountries.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No countries found</div>
            ) : (
              filteredCountries.map((country) => (
                <div key={country.id} className="relative">
                  <CustomCheckbox
                    checked={selectedValues.includes(country.value)}
                    onChange={() => onToggle(country.value)}
                    label={country.label}
                    className="pr-12"
                  />
                  <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
                    {country.value}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CountryFilter;
