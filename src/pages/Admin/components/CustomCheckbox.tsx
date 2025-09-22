import React from 'react';
import { Check } from 'lucide-react';

type CustomCheckboxProps = {
  checked: boolean;
  onChange: () => void;
  label: string;
  className?: string;
  disabled?: boolean;
};

const CustomCheckbox: React.FC<CustomCheckboxProps> = ({
  checked,
  onChange,
  label,
  className = '',
  disabled = false
}) => {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      className={`flex items-center gap-3 px-2 py-2 text-sm rounded-md transition-colors whitespace-nowrap ${
        checked
          ? 'bg-green-50 text-green-700'
          : 'text-gray-700 hover:bg-gray-50'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'} ${className}`}
    >
      <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
        checked
          ? 'bg-green-500 border-green-500'
          : 'border-gray-300 hover:border-green-300'
      }`}>
        {checked && (
          <Check className="w-3 h-3 text-white" />
        )}
      </div>
      <span className="flex-1 text-left">{label}</span>
    </button>
  );
};

export default CustomCheckbox;
