import type React from 'react';
import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Button } from './ui/button';

type TextMarkerModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (text: string, fontSize?: number, color?: string) => void;
  initialText?: string;
  initialFontSize?: number;
  initialColor?: string;
}

const TextMarkerModal: React.FC<TextMarkerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialText = '',
  initialFontSize = 14,
  initialColor = '#000000'
}) => {
  const { t } = useTranslation();
  const [text, setText] = useState(initialText);
  const [fontSize, setFontSize] = useState(initialFontSize);
  const [color, setColor] = useState(initialColor);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setFontSize(initialFontSize);
      setColor(initialColor);
      setError('');
    }
  }, [isOpen, initialText, initialFontSize, initialColor]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleSave = () => {
    if (!text.trim()) {
      setError(t('textMarker.error.emptyText') || 'Text cannot be empty');
      return;
    }

    if (text.length > 100) {
      setError(t('textMarker.error.tooLong') || 'Text cannot exceed 100 characters');
      return;
    }

    onSave(text.trim(), fontSize, color);
    onClose();
  };

  const handleCancel = () => {
    setText('');
    setError('');
    onClose();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  };

  const predefinedColors = [
    '#000000', // Black
    '#FF0000', // Red
    '#00FF00', // Green
    '#0000FF', // Blue
    '#FFFF00', // Yellow
    '#FF00FF', // Magenta
    '#00FFFF', // Cyan
    '#FFFFFF', // White
    '#808080', // Gray
    '#FFA500', // Orange
    '#800080', // Purple
    '#008000', // Dark Green
  ];

  const fontSizeOptions = [10, 12, 14, 16, 18, 20, 24, 28, 32];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 z-[9998]" 
        onClick={handleCancel}
        role="button"
        tabIndex={-1}
        aria-label="Close modal"
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex items-center justify-center z-[9999] p-4">
        <div 
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden touch-none flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-labelledby="text-marker-title"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h2 
              id="text-marker-title"
              className="text-xl font-bold text-gray-900"
            >
              {t('textMarker.title') || 'Add Text Marker'}
            </h2>
            <button
              onClick={handleCancel}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label={t('common.close') || 'Close'}
            >
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 overflow-y-auto flex-1">
            {/* Text Input */}
            <div>
              <label 
                htmlFor="marker-text"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                {t('textMarker.label.text') || 'Text'}
              </label>
              <textarea
                id="marker-text"
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder={t('textMarker.placeholder') || 'Enter your text here...'}
                className={`w-full px-3 py-2 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all ${
                  error ? 'border-red-500 focus:ring-red-500' : 'border-gray-300'
                }`}
                rows={2}
                maxLength={100}
                autoFocus
              />
              <div className="flex justify-between items-center mt-1">
                {error && (
                  <span className="text-sm text-red-600">{error}</span>
                )}
                <span className="text-xs text-gray-500 ml-auto">
                  {text.length}/100
                </span>
              </div>
            </div>

            {/* Font Size */}
            <div>
              <label 
                htmlFor="font-size"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                {t('textMarker.label.fontSize') || 'Font Size'}
              </label>
              <select
                id="font-size"
                value={fontSize}
                onChange={(e) => { setFontSize(Number(e.target.value)); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              >
                {fontSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}px
                  </option>
                ))}
              </select>
            </div>

            {/* Color Picker */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('textMarker.label.color') || 'Color'}
              </label>
              <div className="space-y-2">
                {/* Predefined Colors */}
                <div className="grid grid-cols-8 gap-1.5">
                  {predefinedColors.map((presetColor) => (
                    <button
                      key={presetColor}
                      type="button"
                      onClick={() => { setColor(presetColor); }}
                      className={`w-6 h-6 rounded-md border-2 transition-all ${
                        color === presetColor 
                          ? 'border-blue-500 ring-2 ring-blue-200' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      style={{ 
                        backgroundColor: presetColor,
                        boxShadow: presetColor === '#FFFFFF' ? 'inset 0 0 0 1px #e5e7eb' : undefined
                      }}
                      aria-label={`Select color ${presetColor}`}
                    />
                  ))}
                </div>
                
                {/* Custom Color Input */}
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={color}
                    onChange={(e) => { setColor(e.target.value); }}
                    className="w-8 h-6 border border-gray-300 rounded cursor-pointer"
                    aria-label={t('textMarker.label.customColor') || 'Custom color'}
                  />
                  <span className="text-xs text-gray-600 font-mono">
                    {color.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>

            {/* Preview */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('textMarker.label.preview') || 'Preview'}
              </label>
              <div className="p-3 bg-gray-50 rounded-lg border">
                {text ? (
                  <span 
                    style={{ 
                      fontSize: `${fontSize}px`, 
                      color: color,
                      fontFamily: 'system-ui, -apple-system, sans-serif'
                    }}
                  >
                    {text}
                  </span>
                ) : (
                  <span className="text-gray-400 italic">
                    {t('textMarker.preview.empty') || 'Preview will appear here...'}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 p-2 border-t border-gray-200 bg-white">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="px-6 min-h-[44px]"
            >
              {t('common.cancel') || 'Cancel'}
            </Button>
            <Button
              onClick={handleSave}
              disabled={!text.trim()}
              className="px-6 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px] font-semibold"
              type="button"
            >
              {t('textMarker.save') || 'Add Text'}
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default TextMarkerModal;