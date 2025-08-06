import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { apiRequest } from '../lib/queryClient';
import { useTranslation } from '../lib/i18n';
import { useToast } from '../hooks/use-toast';

interface LootBoxProps {
  type: 'roulette' | 'treasureBox';
  onClose?: () => void;
}

export function LootBox({ type, onClose }: LootBoxProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpening, setIsOpening] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [showResult, setShowResult] = useState(false);

  // Mock loot box data (in real app, this would come from API)
  const lootBoxData = {
    roulette: {
      id: 1,
      prizes: [
        { type: 'currency', amount: 100, weight: 30 },
        { type: 'currency', amount: 250, weight: 20 },
        { type: 'currency', amount: 500, weight: 15 },
        { type: 'currency', amount: 1000, weight: 10 },
        { type: 'pro_mode', duration: 72, weight: 8 },
        { type: 'currency', amount: 2500, weight: 5 },
        { type: 'no_ads', duration: 168, weight: 3 },
        { type: 'currency', amount: 5000, weight: 2 },
        { type: 'currency', amount: 10000, weight: 0.5 },
      ],
    },
    treasureBox: {
      id: 2,
      prizes: [
        { type: 'currency', amount: 100, weight: 40 },
        { type: 'currency', amount: 300, weight: 25 },
        { type: 'currency', amount: 500, weight: 15 },
        { type: 'currency', amount: 1000, weight: 10 },
        { type: 'pro_mode', duration: 72, weight: 5 },
        { type: 'currency', amount: 3000, weight: 3 },
        { type: 'no_ads', duration: 168, weight: 1.5 },
        { type: 'currency', amount: 5000, weight: 0.5 },
      ],
    },
  };

  const openLootBoxMutation = useMutation({
    mutationFn: async (lootBoxId: number) => {
      return apiRequest(`/api/gamification/loot-box/${lootBoxId}`, {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        setResult(data.reward);
        setTimeout(() => {
          setIsOpening(false);
          setShowResult(true);
        }, type === 'roulette' ? 3000 : 2000); // Different animation durations
        
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      } else {
        setIsOpening(false);
        toast({
          title: t('common.error'),
          description: data.error,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      setIsOpening(false);
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleOpen = () => {
    setIsOpening(true);
    setShowResult(false);
    setResult(null);
    openLootBoxMutation.mutate(lootBoxData[type].id);
  };

  const handleWatchAdForTicket = () => {
    // In a real app, this would trigger ad SDK
    toast({
      title: t('common.success'),
      description: 'Free ticket earned!',
    });
  };

  const formatPrize = (prize: any) => {
    if (prize.type === 'currency') {
      return `$${prize.amount}`;
    } else if (prize.type === 'pro_mode') {
      return `${t('rewards.proMode')} ${t('rewards.duration', { duration: Math.floor(prize.duration / 24) })}`;
    } else if (prize.type === 'no_ads') {
      return `${t('rewards.noAds')} ${t('rewards.duration', { duration: Math.floor(prize.duration / 24) })}`;
    }
    return prize.type;
  };

  const getPrizeColor = (prize: any) => {
    if (prize.amount >= 5000 || prize.type !== 'currency') return 'text-yellow-600';
    if (prize.amount >= 1000) return 'text-purple-600';
    if (prize.amount >= 500) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className="max-w-md mx-auto space-y-6">
      <Card className="text-center">
        <CardHeader>
          <CardTitle className="flex items-center justify-center gap-2">
            <span className="text-2xl">
              {type === 'roulette' ? '🎯' : '📦'}
            </span>
            {t(`lootbox.${type}`)}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Animation Area */}
          <div className="h-48 flex items-center justify-center border-2 border-dashed border-gray-300 rounded-lg">
            {isOpening ? (
              <div className="text-center">
                <div className="text-6xl animate-spin mb-4">
                  {type === 'roulette' ? '🎯' : '📦'}
                </div>
                <div className="text-lg font-medium">
                  {type === 'roulette' ? t('lootbox.spinning') : t('lootbox.opening')}
                </div>
              </div>
            ) : showResult ? (
              <div className="text-center space-y-4">
                <div className="text-6xl">🎉</div>
                <div className="text-xl font-bold">{t('rewards.congratulations')}</div>
                <div className="text-lg">{t('rewards.youWon')}</div>
                <div className={`text-2xl font-bold ${getPrizeColor(result)}`}>
                  {formatPrize(result)}
                </div>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <div className="text-8xl">
                  {type === 'roulette' ? '🎯' : '📦'}
                </div>
                <div className="text-lg font-medium text-gray-600">
                  {t('lootbox.prizes')}
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          {!showResult && (
            <div className="space-y-3">
              <Button
                onClick={handleOpen}
                disabled={isOpening || openLootBoxMutation.isPending}
                className="w-full"
                size="lg"
              >
                {isOpening 
                  ? (type === 'roulette' ? t('lootbox.spinning') : t('lootbox.opening'))
                  : (type === 'roulette' ? t('lootbox.spin') : t('lootbox.openBox'))
                }
              </Button>
              
              <Button
                onClick={handleWatchAdForTicket}
                variant="outline"
                className="w-full"
                size="sm"
              >
                {t('lootbox.watchAdForTicket')}
              </Button>
            </div>
          )}

          {showResult && (
            <div className="space-y-3">
              <Button
                onClick={() => {
                  setShowResult(false);
                  setResult(null);
                }}
                className="w-full"
              >
                {type === 'roulette' ? t('lootbox.spin') : t('lootbox.openBox')} Again
              </Button>
              
              {onClose && (
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="w-full"
                >
                  {t('common.close')}
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Prize Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('lootbox.prizes')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {lootBoxData[type].prizes
              .sort((a, b) => b.weight - a.weight)
              .map((prize, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <span className={`font-medium ${getPrizeColor(prize)}`}>
                    {formatPrize(prize)}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {prize.weight}%
                  </Badge>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
