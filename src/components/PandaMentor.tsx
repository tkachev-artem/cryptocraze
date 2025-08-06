import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useTranslation } from '../lib/i18n';

interface PandaMentorProps {
  mode?: 'tutorial' | 'tip' | 'encouragement' | 'warning';
  message?: string;
  onClose?: () => void;
  showRandomTips?: boolean;
}

export function PandaMentor({ 
  mode = 'tip', 
  message, 
  onClose, 
  showRandomTips = false 
}: PandaMentorProps) {
  const { t } = useTranslation();
  const [currentTip, setCurrentTip] = useState<string>('');
  const [isVisible, setIsVisible] = useState(true);

  const tips = [
    'diversify',
    'patience',
    'research',
    'riskManagement',
    'emotions',
    'smallStart',
    'stopLoss',
    'trends'
  ];

  useEffect(() => {
    if (showRandomTips && !message) {
      const randomTip = tips[Math.floor(Math.random() * tips.length)];
      setCurrentTip(t(`panda.tips.${randomTip}`));
    }
  }, [showRandomTips, message, t]);

  const getTitle = () => {
    switch (mode) {
      case 'tutorial':
        return t('panda.hello');
      case 'encouragement':
        return t('panda.encouragement');
      case 'warning':
        return t('panda.warning');
      default:
        return t('panda.tip');
    }
  };

  const getBackgroundColor = () => {
    switch (mode) {
      case 'encouragement':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  const getPandaExpression = () => {
    switch (mode) {
      case 'encouragement':
        return '🐼✨';
      case 'warning':
        return '🐼⚠️';
      default:
        return '🐼💡';
    }
  };

  if (!isVisible) return null;

  return (
    <Card className={`max-w-md ${getBackgroundColor()}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <span className="text-2xl">{getPandaExpression()}</span>
          {getTitle()}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-700 mb-4">
          {message || currentTip}
        </p>
        {onClose && (
          <div className="flex justify-end">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setIsVisible(false);
                onClose();
              }}
            >
              {t('common.close')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
