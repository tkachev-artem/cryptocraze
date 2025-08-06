import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { apiRequest } from '../lib/queryClient';
import { useTranslation } from '../lib/i18n';
import { useToast } from '../hooks/use-toast';

export function Achievements() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: progress, isLoading } = useQuery({
    queryKey: ['/api/gamification/progress'],
    queryFn: () => apiRequest('/api/gamification/progress'),
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (achievementId: number) => {
      // Note: The backend doesn't have a specific claim endpoint yet
      // but we can implement it similar to daily rewards
      return { success: true };
    },
    onSuccess: () => {
      toast({
        title: t('common.success'),
        description: t('achievements.claimReward'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/gamification/progress'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
  });

  const getAchievementIcon = (key: string) => {
    const icons: Record<string, string> = {
      'first_trade': '🎯',
      'profitable_trade': '💰',
      'complete_tutorial': '🎓',
      'daily_login_streak': '📅',
      'trades_count': '📈',
      'total_volume': '💎',
      'win_streak': '🔥',
      'high_leverage_trade': '⚡',
      'big_profit': '🏆',
      'watch_ads': '📺',
    };
    return icons[key] || '🏅';
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'trading': 'bg-blue-100 text-blue-800',
      'learning': 'bg-green-100 text-green-800',
      'gamification': 'bg-purple-100 text-purple-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">{t('common.loading')}</div>
      </div>
    );
  }

  const achievements = progress?.achievements || [];
  const completedCount = achievements.filter((a: any) => a.isCompleted).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">{t('achievements.title')}</h1>
        <div className="text-right">
          <div className="text-sm text-gray-600">{t('achievements.completed')}</div>
          <div className="text-2xl font-bold">
            {completedCount}/{achievements.length}
          </div>
        </div>
      </div>

      {/* Overall Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span>Level {progress?.level || 1}</span>
              <span>{progress?.experience || 0} XP</span>
            </div>
            <Progress 
              value={((progress?.experience || 0) / (progress?.nextLevelExp || 1000)) * 100} 
            />
            <div className="text-sm text-gray-600">
              {(progress?.nextLevelExp || 1000) - (progress?.experience || 0)} XP to next level
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((userAchievement: any) => {
          const achievement = userAchievement.achievement;
          if (!achievement) return null;

          const progressPercentage = Math.min(
            (userAchievement.progress / achievement.requirement) * 100,
            100
          );

          return (
            <Card 
              key={achievement.id} 
              className={`${userAchievement.isCompleted ? 'border-green-500 bg-green-50' : ''}`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="text-2xl">{getAchievementIcon(achievement.key)}</div>
                  <Badge className={getCategoryColor(achievement.category)}>
                    {t(`achievements.categories.${achievement.category}`)}
                  </Badge>
                </div>
                <CardTitle className="text-lg">
                  {t(`achievements.${achievement.key}`)}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-sm text-gray-600">
                  {achievement.descriptionKey}
                </div>

                {!userAchievement.isCompleted ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('achievements.progress')}</span>
                      <span>{userAchievement.progress}/{achievement.requirement}</span>
                    </div>
                    <Progress value={progressPercentage} />
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <div className="text-green-600 font-medium">✓ {t('achievements.completed')}</div>
                  </div>
                )}

                {achievement.reward > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{t('achievements.reward')}:</span>
                    <span className="text-green-600 font-bold">
                      ${Number(achievement.reward).toFixed(0)}
                    </span>
                  </div>
                )}

                {userAchievement.isCompleted && !userAchievement.rewardClaimed && (
                  <Button
                    onClick={() => claimRewardMutation.mutate(achievement.id)}
                    disabled={claimRewardMutation.isPending}
                    className="w-full"
                    size="sm"
                  >
                    {claimRewardMutation.isPending 
                      ? t('common.loading') 
                      : t('achievements.claimReward')
                    }
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {achievements.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <div className="text-6xl mb-4">🏆</div>
            <div className="text-xl font-semibold mb-2">No achievements yet</div>
            <div className="text-gray-600">
              Start trading and completing tasks to earn your first achievements!
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
