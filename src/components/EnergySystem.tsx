import type React from 'react';
import { useEnergy } from '@/hooks/useEnergy';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

/**
 * Компонент энергетической системы
 */
export const EnergySystem: React.FC = () => {
  const { t } = useTranslation();
  const {
    progress,
    isLoading,
    error,
    userStats,
    addEnergy,
    resetProgress,
    progressPercentage,
    isCompleted,
    remainingEnergy,
  } = useEnergy();

  const handleAddEnergy = async (amount: number) => {
    const response = await addEnergy(amount);
    if (response?.isCompleted) {
      // Показать уведомление о завершении задания
      console.log(`Задание выполнено! Выполнено заданий: ${String(response.completedTasks)}`);
    }
  };

  const handleReset = async () => {
    if (confirm(t('energy.confirmReset'))) {
      await resetProgress();
    }
  };

  if (isLoading) {
    return (
      <div className="w-full bg-white rounded-xl p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-2 bg-gray-200 rounded-full mb-4"></div>
          <div className="flex gap-2">
            <div className="h-8 bg-gray-200 rounded w-20"></div>
            <div className="h-8 bg-gray-200 rounded w-20"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full bg-red-50 border border-red-200 rounded-xl p-4">
        <div className="text-red-600 text-sm">
          {t('energy.error')}: {error}
        </div>
        <Button 
          onClick={() => { window.location.reload(); }} 
          className="mt-2 bg-red-600 text-white"
        >
          {t('common.retry')}
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-xl p-4 border border-gray-200">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">
          {t('energy.title')}
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">
            {t('energy.progress')}: {progress}/100
          </span>
          {isCompleted && (
            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
              {t('energy.completed')}
            </span>
          )}
        </div>
      </div>

      {/* Прогресс бар */}
      <div className="mb-4">
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${String(progressPercentage)}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>0</span>
          <span>100</span>
        </div>
      </div>

      {/* Статистика */}
      {userStats && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-600">{t('energy.bonus')}:</span>
              <span className="font-semibold ml-1">{userStats.energyTasksBonus}</span>
            </div>
            <div>
              <span className="text-gray-600">{t('energy.trades')}:</span>
              <span className="font-semibold ml-1">{userStats.tradesCount}</span>
            </div>
          </div>
        </div>
      )}

      {/* Кнопки действий */}
      <div className="flex gap-2">
        <Button
          onClick={() => void handleAddEnergy(25)}
          disabled={isLoading}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
        >
          +25 {t('energy.energy')}
        </Button>
        
        <Button
          onClick={() => void handleAddEnergy(50)}
          disabled={isLoading}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white"
        >
          +50 {t('energy.energy')}
        </Button>
        
        <Button
          onClick={() => void handleReset()}
          disabled={isLoading}
          variant="outline"
          className="px-3"
        >
          {t('energy.reset')}
        </Button>
      </div>

      {/* Информация */}
      <div className="mt-3 text-xs text-gray-500">
        {isCompleted ? (
          <p>{t('energy.completedMessage')}</p>
        ) : (
          <p>{t('energy.remainingMessage', { remaining: remainingEnergy })}</p>
        )}
      </div>
    </div>
  );
}; 