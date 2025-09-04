import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../lib/i18n';
import { useTaskTranslation } from '../lib/translationUtils';
import type {
  Task,
  TaskState,
  TaskCardProps,
  TaskCardState,
  ApiError
} from '../types/task';

// Constants for better maintainability
const PROGRESS_UPDATE_DEBOUNCE_MS = 500;
const VIDEO_AD_SIMULATION_DURATION_MS = 3000;
const LOADING_ANIMATION_DURATION_MS = 500;
const SLIDE_OUT_DELAY_MS = 1000;
const SLIDE_IN_ANIMATION_DURATION_MS = 400;

export const TaskCard: React.FC<TaskCardProps> = React.memo(({ 
  task, 
  onComplete,
  onUpdateProgress,
  onReplace,
  onWheelOpen
}) => {
  const { t } = useTranslation();
  const { translateTask } = useTaskTranslation();
  const navigate = useNavigate();
  
  // Component state management with proper typing
  const [componentState, setComponentState] = useState<TaskCardState>({
    isLoading: false,
    isAnimating: false,
    isSlidingOut: false,
    isSlidingIn: true,
    isSimulatingAd: false,
    apiError: null
  });
  
  // Refs for cleanup and preventing race conditions
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);

  // Мемоизируем вычисляемые значения
  const progress = useMemo(() => {
    if (!task.progress.total || task.progress.total === 0) return 0;
    const calculatedProgress = (task.progress.current / task.progress.total) * 100;
    
    // Отладочная информация только в development режиме и только при значительных изменениях
    if (import.meta.env.DEV && calculatedProgress > 0) {
      console.log(`🔍 TaskCard Progress Debug - ${task.title}:`, {
        current: task.progress.current,
        total: task.progress.total,
        calculatedProgress: calculatedProgress,
        taskId: task.id
      });
    }
    
    return calculatedProgress;
  }, [task.progress, task.title, task.id]);
  
  // Fixed task state management - resolve conflicting boolean flags
  const taskState = useMemo((): TaskState => {
    const isActive = task.status === 'active';
    const isCompleted = task.status === 'completed';
    const isProgressComplete = task.progress.current >= task.progress.total && task.progress.total > 0;
    
    // UNIVERSAL CLAIM LOGIC - ALL TASKS MUST BE CLAIMABLE WHEN PROGRESS IS COMPLETE
    const canClaimReward = (
      task.isCompleted === true && task.rewardClaimed === false
    ) || (
      isActive && isProgressComplete
    ) || (
      isCompleted
    ) || (
      // FORCE CLAIMABLE: Any active task with full progress should be claimable
      isActive && task.progress.current >= task.progress.total && task.progress.total > 0
    );
    
    
    return {
      isActive,
      isCompleted,
      isProgressComplete,
      canClaimReward
    };
  }, [task.status, task.progress, task.isCompleted, task.rewardClaimed]);

  // Use computed task state instead of separate variables
  const { isActive, isCompleted, isProgressComplete, canClaimReward } = taskState;
  
  // Debug logging for claim button logic
  React.useEffect(() => {
    console.log(`[TaskCard] canClaimReward calculation for ${(task as any).taskType}:`, {
      'task.isCompleted': task.isCompleted,
      'task.rewardClaimed': task.rewardClaimed,
      'condition1': task.isCompleted === true && task.rewardClaimed === false,
      'isActive': isActive,
      'isProgressComplete': isProgressComplete,
      'condition2': isActive && isProgressComplete,
      'isCompleted': isCompleted,
      'condition3': isCompleted,
      'finalCanClaimReward': canClaimReward,
      'progress.current': task.progress.current,
      'progress.total': task.progress.total,
      'taskStatus': task.status
    });
  }, [task, isActive, isCompleted, isProgressComplete, canClaimReward]);
  
  // Destructure component state for easier access
  const { isLoading, isAnimating, isSlidingOut, isSlidingIn, isSimulatingAd, apiError } = componentState;

  // Slide-in animation management
  useEffect(() => {
    if (isSlidingIn) {
      // Remove slide-in animation class after completion
      const timer = setTimeout(() => {
        setComponentState(prev => ({ ...prev, isSlidingIn: false }));
      }, SLIDE_IN_ANIMATION_DURATION_MS);
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isSlidingIn]);

  // Stop ad simulation if task is no longer active
  useEffect(() => {
    if (!isActive && isSimulatingAd) {
      console.log(`[TaskCard] Task ${task.title} no longer active, stopping ad simulation`);
      setComponentState(prev => ({ ...prev, isSimulatingAd: false }));
      isUpdatingRef.current = false;
    }
  }, [isActive, isSimulatingAd, task.title]);
  
  // Cleanup on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
      isUpdatingRef.current = false;
    };
  }, []);

  // Переводим задание
  const translatedTask = useMemo(() => translateTask(task), [task, translateTask]);

  // Проверяем типы заданий по taskType
  const isVideoTask = useMemo(() => {
    const result = (task as any).taskType?.startsWith('video_');
    console.log(`[TaskCard] isVideoTask for ${(task as any).taskType}:`, result);
    return result;
  }, [(task as any).taskType]);
  const isDailyTask = useMemo(() => {
    const result = (task as any).taskType?.startsWith('daily_');
    console.log(`[TaskCard] isDailyTask for ${(task as any).taskType}:`, result);
    return result;
  }, [(task as any).taskType]);
  const isTradeTask = useMemo(() => {
    const taskType = (task as any).taskType;
    // Check both prefix and if taskType contains 'trade' or 'trader' anywhere
    const result = taskType?.startsWith('trade_') || taskType?.includes('trade');
    console.log(`[TaskCard] isTradeTask for ${taskType}:`, result);
    return result;
  }, [(task as any).taskType]);
  const isPremiumTask = useMemo(() => {
    const result = (task as any).taskType?.startsWith('premium_');
    console.log(`[TaskCard] isPremiumTask for ${(task as any).taskType}:`, result);
    return result;
  }, [(task as any).taskType]);

  // Определяем какую кнопку показать - ALL TASKS MUST SHOW PICKUP BUTTON
  const getButtonConfig = useMemo(() => {
    const result = (() => {
      if (!isActive) return null;
      
      // FOR ALL TASK TYPES: Show claim button when ready, otherwise show action button
      if (canClaimReward) {
        return { text: t('common.collect'), action: 'claim' };
      }
      
      // Show action button for incomplete tasks
      if (isVideoTask) {
        return { text: t('common.execute'), action: 'video' };
      }
      
      if (isTradeTask) {
        return { text: t('common.execute'), action: 'navigate' };
      }
      
      // Daily and Premium tasks need execution button for manual activation  
      const containsDaily = (task as any).taskType?.includes('daily');
      const containsPremium = (task as any).taskType?.includes('premium');
      console.log(`[TaskCard] Daily/Premium check for ${(task as any).taskType}: isDailyTask=${isDailyTask}, isPremiumTask=${isPremiumTask}, containsDaily=${containsDaily}, containsPremium=${containsPremium}, isTradeTask=${isTradeTask}`);
      
      if ((isDailyTask || containsDaily) && !isTradeTask) {
        console.log(`[TaskCard] Daily task - showing execute button for manual activation`);
        return { text: t('common.execute'), action: 'daily' };
      }
      
      // Premium tasks also need execution button for manual activation
      if ((isPremiumTask || containsPremium) && !isTradeTask && !isDailyTask) {
        console.log(`[TaskCard] Premium task - showing execute button for manual activation`);
        return { text: t('common.execute'), action: 'premium' };
      }

      // For other tasks - show claim button (they should auto-complete)
      return { text: t('common.collect'), action: 'claim' };
    })();
    
    console.log(`[TaskCard] Button config for ${(task as any).taskType}:`, {
      isActive,
      isVideoTask,
      canClaimReward,
      isDailyTask,
      isPremiumTask,
      isTradeTask,
      isProgressComplete,
      'progress.current': task.progress.current,
      'progress.total': task.progress.total,
      taskStatus: task.status,
      isCompleted: task.isCompleted,
      rewardClaimed: task.rewardClaimed,
      result
    });
    
    return result;
  }, [isVideoTask, isTradeTask, isDailyTask, isPremiumTask, isActive, canClaimReward, isProgressComplete, task.taskType, task.reward.type, t]);

  // Функция навигации для торговых заданий
  const handleNavigateToTrading = useCallback(() => {
    // Перенаправляем на страницу торговли
    navigate('/trade');
  }, [navigate]);

  const getRewardIcon = useCallback((type: string) => {
    switch (type) {
      case 'money':
        return '/trials/dollars.svg';
      case 'coins':
        return '/money.svg';
      case 'energy':
        return '/trials/energy.svg';
      case 'mixed':
        return '/trials/energy.svg'; // Для смешанных наград показываем энергию как основную
      case 'wheel':
        return '/trials/wheel.svg';
      default:
        return '/trials/energy-white.svg';
    }
  }, []);

  // Получаем награду для отображения
  const displayReward = useMemo(() => task.reward, [task.reward]);

  // Enhanced task completion with proper error handling
  const handleComplete = useCallback(async () => {
    if (componentState.isLoading || !isActive || isUpdatingRef.current) {
      console.log(`[TaskCard] Cannot complete task - conditions not met for ${task.title}`);
      return;
    }
    
    // For wheel tasks - complete the task first, THEN open wheel modal
    if (task.reward.type === 'wheel') {
      console.log('[TaskCard] Completing wheel task first, then will open wheel:', task.title);
      // Don't return early - let the task complete normally, then open wheel
    }
    
    console.log('[TaskCard] Completing task:', {
      id: task.id,
      title: task.title,
      reward: task.reward
    });
    
    isUpdatingRef.current = true;
    setComponentState(prev => ({
      ...prev,
      isLoading: true,
      isAnimating: true,
      apiError: null
    }));
    
    try {
      const result = await onComplete(task.id);
      console.log('[TaskCard] Task completed successfully');
      
      // Log wheelResult if present (for debugging)
      if (result.wheelResult) {
        console.log('[TaskCard] 🎡 WheelResult received:', result.wheelResult);
      }
      
      // IMPORTANT: For wheel tasks, open wheel modal AFTER task completion
      if (task.reward.type === 'wheel') {
        console.log('[TaskCard] Task completed, now opening wheel modal for reward');
        onWheelOpen?.(task.id);
      }
      
      // Task will NOT disappear automatically - user must see the completed state
      // setTimeout(() => {
      //   setComponentState(prev => ({ ...prev, isSlidingOut: true }));
      // }, SLIDE_OUT_DELAY_MS);
      
    } catch (error) {
      console.error('[TaskCard] Error completing task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Task completion failed';
      setComponentState(prev => ({
        ...prev,
        apiError: errorMessage,
        isLoading: false
      }));
      isUpdatingRef.current = false;
      setTimeout(() => {
        setComponentState(prev => ({ ...prev, isAnimating: false }));
      }, LOADING_ANIMATION_DURATION_MS);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [isLoading, isActive, task.id, task.title, task.reward, onComplete, onWheelOpen]);

  // Fixed video task progress - ensure simulation accounts for completed tasks
  const handleVideoStart = useCallback(async () => {
    if (componentState.isLoading || !isActive || !onUpdateProgress || isUpdatingRef.current) {
      console.log(`[TaskCard] Cannot start video - conditions not met for ${task.title}`);
      return;
    }
    
    // Prevent starting if already completed
    if (canClaimReward) {
      console.log(`[TaskCard] Task ${task.title} can claim reward, ignoring video start`);
      return;
    }
    
    // Prevent multiple simultaneous updates
    isUpdatingRef.current = true;
    setComponentState(prev => ({
      ...prev,
      isSimulatingAd: true,
      isLoading: true,
      apiError: null
    }));
    
    try {
      console.log(`[TaskCard] Starting video ad simulation for ${task.title}`);
      
      // Simulate ad viewing with proper duration
      await new Promise(resolve => setTimeout(resolve, VIDEO_AD_SIMULATION_DURATION_MS));
      
      // Calculate next progress value safely
      const currentProgress = task.progress.current || 0;
      const maxProgress = task.progress.total || 1;
      const nextProgress = Math.min(currentProgress + 1, maxProgress);
      
      console.log(`[TaskCard] Updating progress for ${task.title}: ${currentProgress} -> ${nextProgress}`);
      
      await onUpdateProgress(task.id, nextProgress);
      
      console.log(`[TaskCard] Video ad completed successfully for ${task.title}`);
      
      // Reset loading state after successful completion
      setComponentState(prev => ({
        ...prev,
        isSimulatingAd: false,
        isLoading: false,
        apiError: null
      }));
      
    } catch (error) {
      console.error(`[TaskCard] Error during video ad simulation:`, error);
      const errorMessage = error instanceof Error ? error.message : 'Video ad failed';
      setComponentState(prev => ({
        ...prev,
        apiError: errorMessage,
        isSimulatingAd: false,
        isLoading: false
      }));
    } finally {
      isUpdatingRef.current = false;
    }
  }, [isLoading, isActive, onUpdateProgress, task.id, task.progress, task.title, canClaimReward]);

  // Claim reward for completed task (same as handleComplete for simplicity)
  const handleClaimReward = handleComplete;

  // Handle daily task completion
  const handleDailyTaskComplete = useCallback(async () => {
    if (componentState.isLoading || !isActive || isUpdatingRef.current) {
      console.log(`[TaskCard] Cannot complete daily task - conditions not met for ${task.title}`);
      return;
    }

    console.log(`[TaskCard] Executing daily task: ${task.title}`);
    
    isUpdatingRef.current = true;
    setComponentState(prev => ({
      ...prev,
      isLoading: true,
      isAnimating: true,
      apiError: null
    }));

    try {
      // For daily tasks, we complete them immediately when user clicks execute
      const result = await onComplete(task.id);
      console.log('[TaskCard] Daily task completed successfully');
      
    } catch (error) {
      console.error('[TaskCard] Error completing daily task:', error);
      const errorMessage = error instanceof Error ? error.message : 'Daily task completion failed';
      setComponentState(prev => ({
        ...prev,
        apiError: errorMessage,
        isLoading: false
      }));
      isUpdatingRef.current = false;
      setTimeout(() => {
        setComponentState(prev => ({ ...prev, isAnimating: false }));
      }, LOADING_ANIMATION_DURATION_MS);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [isLoading, isActive, task.id, task.title, onComplete]);

  // Enhanced task replacement with better error handling
  const handleReplace = useCallback(async () => {
    if (componentState.isLoading || !onReplace || isUpdatingRef.current) {
      console.log(`[TaskCard] Cannot replace task - conditions not met for ${task.title}`);
      return;
    }
    
    console.log('🔄 TaskCard: Replace button clicked for task:', {
      id: task.id,
      title: task.title
    });
    
    isUpdatingRef.current = true;
    setComponentState(prev => ({
      ...prev,
      isLoading: true,
      apiError: null
    }));
    
    try {
      const replaced = await onReplace(task.id);
      if (replaced) {
        console.log('✅ TaskCard: Task replaced successfully');
        // Task replacement successful - no automatic disappearing
        // setTimeout(() => {
        //   setComponentState(prev => ({ ...prev, isSlidingOut: true }));
        // }, 100);
      } else {
        console.log('ℹ️ TaskCard: Replacement not performed (limits). Showing feedback animation');
        // Light feedback animation, card stays in place
        setComponentState(prev => ({ ...prev, isAnimating: true }));
        setTimeout(() => {
          setComponentState(prev => ({ ...prev, isAnimating: false }));
        }, 350);
      }
    } catch (error) {
      console.error('❌ TaskCard: Error replacing task:', error);
      setComponentState(prev => ({ ...prev, apiError: error instanceof Error ? error.message : 'Task replacement failed' }));
      // Don't start animation on error
    } finally {
      setComponentState(prev => ({ ...prev, isLoading: false }));
      isUpdatingRef.current = false;
    }
  }, [isLoading, task.id, task.title, onReplace]);



  // Упразднено: handleClaimReward объединено с handleComplete





  // Memoize styles to prevent unnecessary recalculations
  const cardClassName = useMemo(() => {
    const baseClasses = 'task-card bg-white rounded-xl border border-gray-200 transition-all duration-300 relative transform hover:scale-105';
    const animatingClasses = componentState.isAnimating ? 'scale-105' : '';
    const slidingOutClasses = componentState.isSlidingOut ? 'slideOut' : '';
    const slidingInClasses = componentState.isSlidingIn ? 'slideInFromBottom' : '';
    return `${baseClasses} ${animatingClasses} ${slidingOutClasses} ${slidingInClasses}`.trim();
  }, [componentState.isAnimating, componentState.isSlidingOut, componentState.isSlidingIn]);

  const progressBarClassName = useMemo(() => 
    'h-4 rounded-full transition-all duration-500 ease-out bg-[#0C54EA]'
  , []);





  return (
    <div className={`${cardClassName} overflow-hidden`}>
      <div className="flex items-stretch min-h-[100px]">
        {/* Левая часть - Награда */}
        <div className="w-20 bg-[#F1F7FF] border-r border-gray-200 rounded-l-xl flex flex-col items-center justify-center gap-2 p-3">
          {/* Награда */}
          <div className="flex flex-col items-center gap-2">
            {displayReward.type === 'mixed' && displayReward.amount.includes('_energy_') ? (
              <>
                {/* Энергия сверху */}
                <div className="flex flex-col items-center gap-1">
                  <div className="w-6 h-6 bg-[#0C54EA] rounded-full flex items-center justify-center">
                    <img 
                      src="/trials/energy.svg" 
                      alt="energy" 
                      className="w-4 h-4 filter brightness-0 invert"
                    />
                  </div>
                  <span className="text-sm font-bold text-black">
                    {displayReward.amount.split('_')[0]}
                  </span>
                </div>
                
                {/* Деньги/монеты снизу */}
                <div className="flex flex-col items-center gap-1">
                  {displayReward.amount.includes('_money') ? (
                    <img 
                      src="/trials/dollars.svg" 
                      alt="money" 
                      className="w-6 h-6"
                    />
                  ) : (
                    <img 
                      src="/money.svg" 
                      alt="coins" 
                      className="w-6 h-6"
                    />
                  )}
                  <span className="text-sm font-bold text-black">
                    {(() => {
                      const energyPart = displayReward.amount.split('_energy_')[1];
                      if (!energyPart) return '0';
                      const parts = energyPart.split('_');
                      return parts[0] || '0'; // Возвращаем сумму (1K), а не тип (money/coins)
                    })()}
                  </span>
                </div>
              </>
            ) : displayReward.type === 'wheel' ? (
              <>
                <img 
                  src={getRewardIcon(displayReward.type)} 
                  alt={displayReward.type} 
                  className="w-6 h-6"
                />
                <span className="text-sm font-bold text-black whitespace-nowrap">1</span>
              </>
            ) : (
              <>
                {/* Обычная награда */}
                {displayReward.type === 'energy' ? (
                  <div className="w-6 h-6 bg-[#0C54EA] rounded-full flex items-center justify-center">
                    <img 
                      src={getRewardIcon(displayReward.type)} 
                      alt={displayReward.type} 
                      className="w-4 h-4 filter brightness-0 invert"
                    />
                  </div>
                ) : (
                  <img 
                    src={getRewardIcon(displayReward.type)} 
                    alt={displayReward.type} 
                    className="w-6 h-6"
                  />
                )}
                <span className="text-sm font-bold text-black">
                  {displayReward.amount}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Правая часть - Информация о задании */}
        <div className={`flex-1 p-3 flex flex-col justify-between ${
          canClaimReward ? 'bg-[#0C54EA26]' : ''
        }`}>
          {/* Error message display */}
          {apiError && (
            <div className="mb-2 p-2 bg-red-100 border border-red-400 rounded text-red-700 text-xs">
              Error: {apiError}
            </div>
          )}
          {/* Заголовок и описание */}
          <div className="space-y-1 text-start mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-black">{translatedTask.title}</h3>
            </div>
            <p className="text-xs font-semibold text-black opacity-80">{translatedTask.description}</p>
          </div>

          {/* Прогресс бар только для заданий с прогрессом */}
          {(isVideoTask || isTradeTask) ? (
            <div className="space-y-2">
              <div className="flex items-center justify-end">
                <span className="text-xs font-bold text-[#0C54EA]">
                  {task.progress.current || 0}/{task.progress.total || 1}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
                <div 
                  className={progressBarClassName}
                  role="progressbar"
                  aria-label={t('task.progressLabel')}
                  aria-valuenow={Number(progress.toFixed(0))}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  style={{ 
                    width: `${progress.toString()}%`,
                    transition: 'width 0.5s ease-out'
                  }}
                />
              </div>
            </div>
          ) : null}

          {/* Кнопки действий */}
          {getButtonConfig ? (
            <div className="flex justify-start mt-4">
              <button
                onClick={() => {
                  if (getButtonConfig.action === 'claim') {
                    void handleComplete();
                  } else if (getButtonConfig.action === 'video') {
                    void handleVideoStart();
                  } else if (getButtonConfig.action === 'navigate') {
                    handleNavigateToTrading();
                  } else if (getButtonConfig.action === 'daily') {
                    // Daily tasks are completed immediately when user clicks execute
                    void handleDailyTaskComplete();
                  } else if (getButtonConfig.action === 'premium') {
                    // Premium tasks are completed immediately when user clicks execute
                    void handleDailyTaskComplete(); // Use the same handler as daily tasks
                  }
                }}
                disabled={isLoading || (getButtonConfig.action === 'video' && isSimulatingAd)}
                className="flex w-[120px] h-[28px] p-0 flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold text-base hover:bg-[#0A4BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading || (getButtonConfig.action === 'video' && isSimulatingAd) ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span className="text-xs">{getButtonConfig.action === 'video' && isSimulatingAd ? 'Ad...' : '...'}</span>
                  </div>
                ) : (
                  getButtonConfig.text
                )}
              </button>
            </div>
          ) : null}


        </div>

      </div>

    </div>
  );
}); 

export default TaskCard;