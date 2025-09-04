import { useState, useEffect, useCallback } from 'react';
import { EnergyService } from '@/services/energyService';
import type { EnergyAddResponse, UserStats } from '@/types/energy';

/**
 * Хук для работы с энергетической системой
 */
export const useEnergy = (options?: { autoload?: boolean }) => {
  const [progress, setProgress] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const shouldAutoload = options?.autoload !== false;

  /**
   * Загрузить текущий прогресс энергии
   */
  const loadProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await EnergyService.getProgress();
      setProgress(data.progress);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки прогресса');
      console.error('Ошибка загрузки прогресса энергии:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Добавить энергию
   */
  const addEnergy = useCallback(async (amount: number): Promise<EnergyAddResponse | null> => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await EnergyService.addEnergy(amount);
      setProgress(response.newProgress);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка добавления энергии');
      console.error('Ошибка добавления энергии:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Сбросить прогресс энергии
   */
  const resetProgress = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await EnergyService.resetProgress();
      setProgress(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса прогресса');
      console.error('Ошибка сброса прогресса энергии:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Загрузить статистику пользователя
   */
  const loadUserStats = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const stats = await EnergyService.getUserStats();
      setUserStats(stats);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки статистики');
      console.error('Ошибка загрузки статистики пользователя:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Обновить все данные
   */
  const refresh = useCallback(async () => {
    await Promise.all([loadProgress(), loadUserStats()]);
  }, [loadProgress, loadUserStats]);

  // Автоматическая загрузка при монтировании
  useEffect(() => {
    if (!shouldAutoload) return;
    void refresh();
  }, [refresh, shouldAutoload]);

  return {
    // Состояние
    progress,
    isLoading,
    error,
    userStats,
    
    // Методы
    loadProgress,
    addEnergy,
    resetProgress,
    loadUserStats,
    refresh,
    
    // Вычисляемые значения
    progressPercentage: Math.min(100, Math.round((progress / 100) * 100)), // Ограничиваем визуальный прогресс до 100% для полосы
    isCompleted: progress >= 100,
    remainingEnergy: Math.max(0, 100 - progress), // Не даём отрицательным значениям
  };
}; 