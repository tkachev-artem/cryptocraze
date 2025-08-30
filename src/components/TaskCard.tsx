import React, { useState, useCallback, useMemo, useEffect } from 'react';
import type { Task } from '../services/taskService';
import { useTranslation } from '../lib/i18n';
import { useTaskTranslation } from '../lib/translationUtils';

type TaskCardProps = {
  task: Task;
  onComplete: (taskId: string) => Promise<{ wheelResult?: { prize: number; index: number; label: string } }>;
  onUpdateProgress?: (taskId: string, progress: number) => Promise<void>;
  onReplace?: (taskId: string) => Promise<boolean>;
  onWheelOpen?: (taskId: string) => void;
};

export const TaskCard: React.FC<TaskCardProps> = React.memo(({ 
  task, 
  onComplete,
  onUpdateProgress,
  onReplace,
  onWheelOpen
}) => {
  const { t } = useTranslation();
  const { translateTask } = useTaskTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSlidingOut, setIsSlidingOut] = useState(false);
  const [isSlidingIn, setIsSlidingIn] = useState(true); // Новое состояние для анимации появления
  // Видеозадания теперь используют server-side прогресс, локальное состояние не требуется
  const [isSimulatingAd, setIsSimulatingAd] = useState(false); // Симуляция просмотра рекламы

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
  
  const isActive = useMemo(() => task.status === 'active', [task.status]);
  const isCompleted = useMemo(() => task.status === 'completed', [task.status]);
  
  // Проверяем, достигнут ли максимальный прогресс
  const isProgressComplete = useMemo(() => {
    return task.progress.current >= task.progress.total && task.progress.total > 0;
  }, [task.progress]);

  // Проверяем, завершено ли задание но награда не получена
  const isCompletedButNotClaimed = useMemo(() => {
    return task.isCompleted === true && task.rewardClaimed === false;
  }, [task.isCompleted, task.rewardClaimed]);

  // Управление анимацией появления
  useEffect(() => {
    if (isSlidingIn) {
      // Убираем класс анимации появления после завершения
      const timer = setTimeout(() => {
        setIsSlidingIn(false);
      }, 400); // Время анимации slideInFromBottom
      
      return () => {
        clearTimeout(timer);
      };
    }
  }, [isSlidingIn]);

  // Останавливаем симуляцию рекламы если задание больше не активно
  useEffect(() => {
    if (!isActive && isSimulatingAd) {
      console.log(`[TaskCard] Task ${task.title} no longer active, stopping ad simulation`);
      setIsSimulatingAd(false);
    }
  }, [isActive, isSimulatingAd, task.title]);

  // Переводим задание
  const translatedTask = useMemo(() => translateTask(task), [task, translateTask]);

  // Проверяем специальные задания
  const isDailyBonus = useMemo(() => translatedTask.title === t('task.dailyBonus'), [translatedTask.title, t]);
  const isVideoBonus = useMemo(() => translatedTask.title === t('task.videoBonus'), [translatedTask.title, t]);
  const isVideoBonus2 = useMemo(() => translatedTask.title === t('task.videoBonus2'), [translatedTask.title, t]);
  const isDealOfDay = useMemo(() => translatedTask.title === t('task.dealOfDay'), [translatedTask.title, t]);

  // Определяем, нужно ли показать кнопку pickup для видео заданий
  const shouldShowPickupButton = useMemo(() => {
    return (isVideoBonus || isVideoBonus2) && isActive && (isProgressComplete || isCompletedButNotClaimed);
  }, [isVideoBonus, isVideoBonus2, isActive, isProgressComplete, isCompletedButNotClaimed]);

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

  const handleComplete = useCallback(async () => {
    if (isLoading || !isActive) return;
    
    // For wheel tasks - open wheel modal instead of completing directly
    if (task.reward.type === 'wheel') {
      console.log('[TaskCard] Opening wheel for task:', task.title);
      onWheelOpen?.(task.id);
      return;
    }
    
    console.log('[TaskCard] Completing task:', {
      id: task.id,
      title: task.title,
      reward: task.reward
    });
    
    setIsLoading(true);
    setIsAnimating(true);
    
    try {
      const result = await onComplete(task.id);
      console.log('[TaskCard] Task completed successfully');
      
      // Log wheelResult if present (for debugging)
      if (result.wheelResult) {
        console.log('[TaskCard] 🎡 WheelResult received:', result.wheelResult);
      }
      
      // Task will disappear automatically from the list
      setTimeout(() => {
        setIsSlidingOut(true);
      }, 1000);
      
    } catch (error) {
      console.error('[TaskCard] Error completing task:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => {
        setIsAnimating(false);
      }, 500);
    }
  }, [isLoading, isActive, task.id, task.title, task.reward, onComplete, onWheelOpen]);

  // Видео-бонус: пользователь нажал «Выполнить» — запускаем симуляцию просмотра рекламы
  const handleVideoStart = useCallback(async () => {
    if (isLoading || !isActive || !onUpdateProgress) return;
    
    // Предотвращаем запуск если задание уже завершено
    if (isProgressComplete || isCompletedButNotClaimed) {
      console.log(`[TaskCard] Task ${task.title} already completed, ignoring video start`);
      return;
    }
    
    setIsSimulatingAd(true);
    setIsLoading(true);
    
    try {
      // Симулируем просмотр рекламы (3 секунды)
      console.log(`[TaskCard] Starting video ad simulation for ${task.title}`);
      
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Обновляем прогресс на +1
      const next = Math.min((task.progress.current || 0) + 1, task.progress.total || 1);
      console.log(`[TaskCard] Updating progress for ${task.title}: ${(task.progress.current || 0).toString()} -> ${next.toString()}`);
      
      await onUpdateProgress(task.id, next);
      
      console.log(`[TaskCard] Video ad completed successfully for ${task.title}`);
      
    } catch (error) {
      console.error(`[TaskCard] Error during video ad simulation:`, error);
    } finally {
      setIsSimulatingAd(false);
      setIsLoading(false);
    }
  }, [isLoading, isActive, onUpdateProgress, task.id, task.progress, task.title, isProgressComplete, isCompletedButNotClaimed]);

  // Claim reward for completed task (same as handleComplete for simplicity)
  const handleClaimReward = handleComplete;

  const handleReplace = useCallback(async () => {
    if (isLoading || !onReplace) return;
    
    console.log('🔄 TaskCard: Нажата кнопка "Заменить" для задания:', {
      id: task.id,
      title: task.title
    });
    
    setIsLoading(true);
    
    try {
      const replaced = await onReplace(task.id);
      if (replaced) {
        console.log('✅ TaskCard: Задание заменено успешно');
        // Запускаем анимацию исчезновения только при успешной замене
        setTimeout(() => {
          setIsSlidingOut(true);
        }, 100);
      } else {
        console.log('ℹ️ TaskCard: Замена не выполнена (лимиты). Показываем короткую анимацию обратной связи');
        // Лёгкая анимация обратной связи, карточка остаётся на месте
        setIsAnimating(true);
        setTimeout(() => {
          setIsAnimating(false);
        }, 350);
      }
    } catch (error) {
      console.error('❌ TaskCard: Ошибка при замене задания:', error);
      // НЕ запускаем анимацию при ошибке
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, task.id, task.title, onReplace]);



  // Упразднено: handleClaimReward объединено с handleComplete





  // Мемоизируем стили для предотвращения лишних вычислений
  const cardClassName = useMemo(() => {
    const baseClasses = 'task-card bg-white rounded-xl border border-gray-200 transition-all duration-300 relative transform hover:scale-105';
    const animatingClasses = isAnimating ? 'scale-105' : '';
    const slidingOutClasses = isSlidingOut ? 'slideOut' : '';
    const slidingInClasses = isSlidingIn ? 'slideInFromBottom' : '';
    return `${baseClasses} ${animatingClasses} ${slidingOutClasses} ${slidingInClasses}`.trim();
  }, [isAnimating, isSlidingOut, isSlidingIn]);

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
          (isProgressComplete || isCompleted || isCompletedButNotClaimed || (isDailyBonus && isActive) || shouldShowPickupButton) ? 'bg-[#0C54EA26]' : ''
        }`}>
          {/* Заголовок и описание */}
          <div className="space-y-1 text-start mb-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-black">{translatedTask.title}</h3>
            </div>
            <p className="text-xs font-semibold text-black opacity-80">{translatedTask.description}</p>
          </div>

          {/* Прогресс бар или кнопки */}
          {isActive && !isDailyBonus && !isVideoBonus && !isVideoBonus2 && !isProgressComplete ? (
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
          ) : isDailyBonus && isActive && !isProgressComplete && !isCompleted ? (
            <div className="flex justify-start mt-4">
              <button
                onClick={() => {
                  void handleComplete();
                }}
                disabled={isLoading}
                className="flex w-[120px] h-[28px] p-0 flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold text-base hover:bg-[#0A4BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span className="text-xs">...</span>
                  </div>
                ) : (
                  t('common.claim')
                )}
              </button>
            </div>
          ) : (isVideoBonus || isVideoBonus2) && isActive && !isProgressComplete ? (
            <div className="space-y-3">
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
              <div className="flex mt-2">
                <button
                  onClick={() => {
                    void handleVideoStart();
                  }}
                  disabled={isLoading || isSimulatingAd}
                  className="flex w-[120px] h-[28px] p-0 flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold text-base hover:bg-[#0A4BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading || isSimulatingAd ? (
                    <div className="flex items-center justify-center">
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                      <span className="text-xs">{isSimulatingAd ? 'Ad...' : '...'}</span>
                    </div>
                  ) : (
                    t('common.execute')
                  )}
                </button>
              </div>
            </div>
          ) : shouldShowPickupButton ? (
            <div className="flex justify-start mt-4">
              <button
                onClick={() => {
                  if (isVideoBonus2) {
                    onWheelOpen?.(task.id);
                  } else {
                    void handleClaimReward();
                  }
                }}
                disabled={isLoading}
                className="flex w-[120px] h-[28px] p-0 flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold text-base hover:bg-[#0A4BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span className="text-xs">...</span>
                  </div>
                ) : (
                  isVideoBonus2 ? t('wheel.spin') : t('common.claim')
                )}
              </button>
            </div>
          ) : (isActive && (isProgressComplete || isCompleted)) ? (
            <div className="flex justify-start mt-4">
              <button
                onClick={() => {
                  void handleComplete();
                }}
                disabled={isLoading}
                className="flex w-[120px] h-[28px] p-0 flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold text-base hover:bg-[#0A4BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span className="text-xs">...</span>
                  </div>
                ) : (
                  t('common.claim')
                )}
              </button>
            </div>
          ) : (isDailyBonus || isDealOfDay) && (isCompleted || isProgressComplete) ? (
            <div className="flex justify-start mt-4">
              <button
                onClick={() => {
                  void handleComplete();
                }}
                disabled={isLoading}
                className="flex w-[120px] h-[28px] p-0 flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold text-base hover:bg-[#0A4BC8] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin mr-1" />
                    <span className="text-xs">...</span>
                  </div>
                ) : (
                  t('common.claim')
                )}
              </button>
            </div>
          ) : null}


        </div>

        {/* Иконка перезагрузки в правом верхнем углу */}
        <div className="absolute top-3 right-3">
          {(isDailyBonus || isDealOfDay || isVideoBonus) && (isCompleted || isProgressComplete) ? (
            <button
              onClick={() => {
                void handleReplace();
              }}
              disabled={isLoading || !onReplace}
              className="w-[32px] h-[32px] bg-white rounded-full flex items-center justify-center hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img 
                src="/trials/reload.svg" 
                alt="reload" 
                className="w-[20px] h-[20px]"
              />
            </button>
          ) : (
            <button
              onClick={() => {
                void handleReplace();
              }}
              disabled={isLoading || !onReplace}
              className="hover:bg-gray-50 rounded-full p-1 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <img 
                src="/trials/reload.svg" 
                alt="reload" 
                className="w-[20px] h-[20px]"
              />
            </button>
          )}
        </div>
      </div>

    </div>
  );
}); 

export default TaskCard;