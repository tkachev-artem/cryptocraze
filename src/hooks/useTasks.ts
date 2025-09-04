import { useState, useCallback, useEffect } from 'react';
import type { Task} from '@/services/taskService';
import { TaskService } from '@/services/taskService';
import { useAppDispatch } from '@/app/hooks';
import { forceUserUpdate } from '@/app/userSlice';
import { fetchUserDataNoCache } from '@/lib/noCacheApi';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dispatch = useAppDispatch();

  // Принудительное обновление данных пользователя
  const forceUpdateUser = useCallback(async () => {
    try {
      console.log('[useTasks] ПРИНУДИТЕЛЬНОЕ обновление пользователя');
      const response = await fetchUserDataNoCache();
      if (response.ok) {
        const userData = await response.json();
        dispatch(forceUserUpdate(userData));
        console.log('[useTasks] Пользователь обновлен:', { coins: userData.coins, balance: userData.balance });
      }
    } catch (error) {
      console.error('[useTasks] Ошибка обновления пользователя:', error);
    }
  }, [dispatch]);

  // Загрузка заданий
  const loadTasks = useCallback(async () => {
    try {
      setError(null);
      const tasksData = await TaskService.getTasks();
      // SHOW ALL TASKS - let user claim rewards manually, don't auto-hide completed
      setTasks(tasksData.filter(task => task.status === 'active' || (task.status === 'completed' && !task.rewardClaimed)));
      console.log(`[useTasks] Загружено ${tasksData.length} заданий`);
    } catch (err) {
      console.error('[useTasks] Ошибка загрузки заданий:', err);
      setError(err instanceof Error ? err.message : 'Failed to load tasks');
      setTasks([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Завершение задания
  const completeTask = useCallback(async (taskId: string): Promise<{
    wheelResult?: { prize: number; index: number; label: string };
  }> => {
    console.log(`[useTasks] Завершаем задание: ${taskId}`);
    
    try {
      setError(null);
      
      const result = await TaskService.completeTask(taskId);
      
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to complete task');
      }

      console.log(`[useTasks] Задание ${taskId} завершено успешно`);

      // Логируем wheelResult если есть
      if (result.wheelResult) {
        console.log(`[useTasks] 🎡 Получен wheelResult:`, result.wheelResult);
      }

      // МГНОВЕННО удаляем задание из списка
      setTasks(prev => {
        const newTasks = prev.filter(task => task.id !== taskId);
        if (result.newTask) {
          newTasks.push(result.newTask);
        }
        return newTasks;
      });

      // ПРИНУДИТЕЛЬНО обновляем данные пользователя
      await forceUpdateUser();
      
      console.log(`[useTasks] Все обновления завершены для задания ${taskId}`);
      
      // Возвращаем wheelResult для обработки в UI
      return {
        wheelResult: result.wheelResult
      };
      
    } catch (err) {
      console.error('[useTasks] Ошибка завершения задания:', err);
      setError(err instanceof Error ? err.message : 'Failed to complete task');
      return {};
    }
  }, [forceUpdateUser]);

  // Обновление прогресса
  const updateTaskProgress = useCallback(async (taskId: string, progress: number): Promise<void> => {
    console.log(`[useTasks] Обновляем прогресс задания ${taskId}: ${progress}`);
    
    try {
      setError(null);
      
      const result = await TaskService.updateTaskProgress(taskId, progress);
      
      // МГНОВЕННО обновляем задание в списке - KEEP ACTIVE STATUS FOR PICKUP
      setTasks(prev => {
        const updatedTasks = prev.map(task => {
          if (task.id === taskId) {
            const updatedTask = {
              ...result.task,
              // FORCE status to remain 'active' until reward is claimed
              status: 'active' as const,
              isCompleted: result.isCompleted,
              rewardClaimed: result.rewardClaimed
            };
            console.log(`[useTasks] UPDATED TASK ${taskId}:`, updatedTask);
            return updatedTask;
          }
          return task;
        });
        console.log(`[useTasks] FULL TASK LIST AFTER UPDATE (${updatedTasks.length} tasks):`, updatedTasks.map(t => ({id: t.id, status: t.status, progress: t.progress})));
        return updatedTasks;
      });

      // ПРИНУДИТЕЛЬНО обновляем данные пользователя
      await forceUpdateUser();
      
      // ВРЕМЕННО НЕ ПЕРЕЗАГРУЖАЕМ список заданий - это может вызвать автоматическое создание новых
      // await loadTasks();

      console.log(`[useTasks] Прогресс задания ${taskId} обновлен`);
      
    } catch (err) {
      console.error('[useTasks] Ошибка обновления прогресса:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to update task progress';
      
      if (!(errorMessage.includes('Задание не найдено') || errorMessage.includes('Task not found'))) {
        setError(errorMessage);
      }
    }
  }, [forceUpdateUser]);

  // Замена задания
  const replaceTask = useCallback(async (taskId: string): Promise<boolean> => {
    console.log(`[useTasks] Заменяем задание: ${taskId}`);
    
    try {
      setError(null);
      
      const result = await TaskService.replaceTask(taskId);
      
      if (!result.success) {
        throw new Error(result.error ?? 'Failed to replace task');
      }

      // МГНОВЕННО заменяем задание в списке
      setTasks(prev => {
        const newTasks = prev.filter(task => task.id !== taskId);
        if (result.newTask) {
          newTasks.push(result.newTask);
        }
        return newTasks;
      });

      console.log(`[useTasks] Задание ${taskId} заменено успешно`);
      return true;
      
    } catch (err) {
      console.error('[useTasks] Ошибка замены задания:', err);
      setError(err instanceof Error ? err.message : 'Failed to replace task');
      return false;
    }
  }, []);

  // Обновление заданий
  const refreshTasks = useCallback(() => {
    console.log('[useTasks] Обновляем список заданий');
    void loadTasks();
  }, [loadTasks]);

  // Очистка ошибки
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Загружаем задания при монтировании
  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  return {
    tasks,
    isLoading,
    error,
    completeTask,
    updateTaskProgress,
    replaceTask,
    refreshTasks,
    clearError,
    // Legacy
    handleUpdateProgress: updateTaskProgress,
    handleReplaceTask: replaceTask,
    handleClaimReward: completeTask,
  };
}