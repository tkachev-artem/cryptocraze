import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { apiRequest } from '../lib/queryClient';
import { useTranslation } from '../lib/i18n';
import { useToast } from '../hooks/use-toast';
import { useAuth } from '../hooks/useAuth';

export function DailyRewards() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: progress } = useQuery({
    queryKey: ['/api/gamification/progress'],
    queryFn: () => apiRequest('/api/gamification/progress'),
  });

  const claimDailyMutation = useMutation({
    mutationFn: async () => {
      return apiRequest('/api/gamification/daily-reward', {
        method: 'POST',
      });
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: t('common.success'),
          description: `${t('rewards.youWon')} $${data.reward.amount}`,
        });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
        queryClient.invalidateQueries({ queryKey: ['/api/gamification/progress'] });
      } else {
        toast({
          title: t('common.error'),
          description: data.error,
          variant: 'destructive',
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: t('common.error'),
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Generate 24 days of rewards (simplified progression)
  const dailyRewards = Array.from({ length: 24 }, (_, index) => {
    const day = index + 1;
    const baseAmount = 100;
    const multiplier = 1 + (day - 1) * 0.5;
    return {
      day,
      amount: Math.floor(baseAmount * multiplier),
      isSpecial: day % 7 === 0, // Every 7th day is special
    };
  });

  const currentStreak = user?.dailyStreak || 0;
  const canClaim = progress?.canClaimDaily || false;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{t('rewards.title')}</h1>
        <div className="text-lg text-gray-600">
          {t('rewards.streak', { day: currentStreak })}
        </div>
      </div>

      {/* Claim Button */}
      <Card className="text-center">
        <CardContent className="pt-6">
          {canClaim ? (
            <div className="space-y-4">
              <div className="text-lg font-medium">
                {t('rewards.dailyBonus')} - Day {Math.min(currentStreak + 1, 24)}
              </div>
              <div className="text-3xl font-bold text-green-600">
                ${dailyRewards[Math.min(currentStreak, 23)].amount}
              </div>
              <Button
                onClick={() => claimDailyMutation.mutate()}
                disabled={claimDailyMutation.isPending}
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                {claimDailyMutation.isPending ? t('common.loading') : t('rewards.claim')}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-lg font-medium text-gray-600">
                {currentStreak > 0 ? t('rewards.comeBaclTomorrow') : t('rewards.streakBroken')}
              </div>
              <div className="text-6xl">⏰</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rewards Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Reward Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {dailyRewards.map((reward) => {
              const isCompleted = currentStreak >= reward.day;
              const isCurrent = currentStreak + 1 === reward.day && canClaim;
              const isNext = currentStreak + 1 === reward.day && !canClaim;

              return (
                <div
                  key={reward.day}
                  className={`
                    relative p-3 border rounded-lg text-center transition-all
                    ${isCompleted 
                      ? 'bg-green-100 border-green-300' 
                      : isCurrent 
                        ? 'bg-yellow-100 border-yellow-300 animate-pulse' 
                        : isNext
                          ? 'bg-blue-100 border-blue-300'
                          : 'bg-gray-50 border-gray-200'
                    }
                  `}
                >
                  <div className="text-xs font-medium mb-1">
                    Day {reward.day}
                  </div>
                  <div className="text-lg font-bold">
                    ${reward.amount}
                  </div>
                  
                  {reward.isSpecial && (
                    <Badge 
                      variant="secondary" 
                      className="absolute -top-2 -right-2 text-xs bg-yellow-400 text-yellow-900"
                    >
                      ⭐
                    </Badge>
                  )}
                  
                  {isCompleted && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-lg">
                        ✓
                      </div>
                    </div>
                  )}
                  
                  {isCurrent && (
                    <div className="absolute -top-1 -right-1">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Streak Information */}
      <Card>
        <CardHeader>
          <CardTitle>Streak Bonuses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl mb-2">🔥</div>
              <div className="font-medium">7 Day Streak</div>
              <div className="text-sm text-gray-600">Double rewards</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl mb-2">💎</div>
              <div className="font-medium">14 Day Streak</div>
              <div className="text-sm text-gray-600">Triple rewards</div>
            </div>
            <div className="text-center p-4 bg-yellow-50 rounded-lg">
              <div className="text-2xl mb-2">👑</div>
              <div className="font-medium">24 Day Streak</div>
              <div className="text-sm text-gray-600">Maximum rewards</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
