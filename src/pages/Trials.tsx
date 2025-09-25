import { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/hooks/useUser';
import { useTasks } from '@/hooks/useTasks';
import { usePremium } from '@/hooks/usePremium';
import { formatMoneyShort } from '@/lib/numberUtils';
import { WheelFortune } from '@/components/WheelFortune';
import TaskCard from '@/components/TaskCard';
import { Box } from '@/components/Box';
import { useAppDispatch } from '@/app/hooks';
import { forceUserUpdate } from '@/app/userSlice';
import { fetchUserDataNoCache } from '@/lib/noCacheApi';
import type { LevelProgressProps, BoxPositions } from '@/types/task';

// Constants for better maintainability
const BOX_POSITIONS: BoxPositions = {
  ENERGY: 0,
  RED_BOX: 30,
  GREEN_BOX: 70,
  X_BOX: 100
} as const;

const MAX_ENERGY_DISPLAY = 100;
const PROGRESS_UPDATE_DEBOUNCE_MS = 500;
const PERIODIC_UPDATE_INTERVAL_MS = 10000;

// Energy level progress component
const LevelProgress: React.FC<LevelProgressProps> = ({ 
  energyProgress, 
  onRedBoxClick,
  onGreenBoxClick,
  onXBoxClick
}) => {
  const { t } = useTranslation();
  
  // Fixed energy calculation - properly handle values exceeding 100
  const progressPercentage = Math.min(energyProgress, MAX_ENERGY_DISPLAY);
  const actualEnergy = Math.floor(energyProgress);
  const displayedEnergy = Math.min(actualEnergy, MAX_ENERGY_DISPLAY);
  
  // Extract box positions to constants and make them responsive
  const boxPositions = useMemo(() => [
    { position: BOX_POSITIONS.ENERGY, icon: '/trials/energy.svg', label: `${displayedEnergy}/${MAX_ENERGY_DISPLAY}`, isEnergy: true },
    { position: BOX_POSITIONS.RED_BOX, icon: '/trials/red-box.svg', label: '30', isRedBox: true },
    { position: BOX_POSITIONS.GREEN_BOX, icon: '/trials/green-box.svg', label: '70', isGreenBox: true },
    { position: BOX_POSITIONS.X_BOX, icon: '/trials/x-box.svg', label: '100', isXBox: true }
  ], [displayedEnergy]);
  
  return (
    <div className="w-full py-4">
      <div className="flex items-center">
        <div className="flex-1 relative">
          <div className="w-full bg-gray-200 rounded-full h-[20px] overflow-hidden relative">
            <div 
              className="bg-[#0C54EA] h-full rounded-full transition-all duration-700 ease-out" 
              style={{ width: `${String(progressPercentage)}%` }} 
            />
          </div>
          <div className="pointer-events-none absolute left-0 top-1/2 -translate-y-1/2 h-[20px] w-[20px] bg-white rounded-l-full z-[5]" />          
          {boxPositions.map((box) => {
              const isBoxReached = energyProgress >= box.position;
              
              // Simplified box click logic - replace complex nested ternary operators
              const boxState = {
                isRedBoxActive: box.isRedBox && isBoxReached,
                isGreenBoxActive: box.isGreenBox && isBoxReached,
                isXBoxActive: box.isXBox && isBoxReached
              };
              
              const isAnyBoxActive = boxState.isRedBoxActive || boxState.isGreenBoxActive || boxState.isXBoxActive;
              
              // Calculate responsive translate based on position
              const getTranslateX = (position: number): string => {
                if (position === 0) return '0%';
                if (position === 100) return '-100%';
                return '-50%';
              };
              
              const translateX = getTranslateX(box.position);

              const handleBoxClick = useCallback(() => {
                if (boxState.isRedBoxActive) onRedBoxClick();
                else if (boxState.isGreenBoxActive) onGreenBoxClick();
                else if (boxState.isXBoxActive) onXBoxClick();
              }, [boxState.isRedBoxActive, boxState.isGreenBoxActive, boxState.isXBoxActive]);

              return (
                <div 
                  key={box.position}
                  className={`absolute transition-all duration-700 ease-out ${isBoxReached ? 'z-10' : 'z-0'}`}
                  style={{ 
                    left: `${String(box.position)}%`,
                    top: '50%',
                    transform: `translate(${translateX}, -50%)`
                  }}
                >
                  <div className="flex flex-col items-center gap-1 mt-4">
                    <div 
                      className={`${box.isEnergy ? 'w-[40px] h-[40px]' : 'w-[60px] h-[60px]'} relative group ${
                        isAnyBoxActive ? 'cursor-pointer' : ''
                      }`}
                      onClick={isAnyBoxActive ? handleBoxClick : undefined}
                    >
                      <div className={`w-full h-full ${box.isEnergy ? 'rounded-full' : 'rounded-[50px]'} border-[2px] transition-all duration-500 ${
                        box.isEnergy 
                          ? 'bg-[#F1F7FF] border-[#0C54EA]' 
                          : isBoxReached 
                            ? 'bg-[#F1F7FF] border-[#0C54EA]' 
                            : 'bg-gray-100 border-gray-300'
                      }`}>
                        <img 
                          src={box.icon} 
                          alt={box.isEnergy ? "energy" : "reward box"} 
                          className={`w-full h-full object-contain ${box.isEnergy ? 'p-2' : 'p-2'} transition-all duration-500 relative z-10`}
                        />
                      </div>

                      {isBoxReached && !box.isEnergy && (
                        <div className="absolute inset-0 bg-[#0C54EA] rounded-full opacity-10 animate-pulse z-0" 
                             style={{ animationDuration: '10s' }} />
                      )}

                      <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap">
                        {isAnyBoxActive ? t('ui.trials.clickToOpen') : t('ui.trials.rewardReceived')}
                      </div>
                    </div>

                    <span className={`text-sm font-bold transition-all duration-500 ${
                      box.isEnergy 
                        ? 'text-[#0C54EA]' 
                        : isBoxReached 
                          ? 'text-[#0C54EA]' 
                          : 'text-gray-400'
                    }`}>
                      {box.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
    </div>
  );
};

export function Trials() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useUser();
  const { isPremium } = usePremium();
  const dispatch = useAppDispatch();
  const {
    tasks,
    isLoading,
    completeTask,
    updateTaskProgress,
    replaceTask,
  } = useTasks();

  // Состояние для коробок
  const [redBoxModalOpen, setRedBoxModalOpen] = useState(false);
  const [greenBoxModalOpen, setGreenBoxModalOpen] = useState(false);
  const [xBoxModalOpen, setXBoxModalOpen] = useState(false);
  const [isWheelOpen, setIsWheelOpen] = useState(false);
  // Removed unused activeWheelTaskId to satisfy linter
  const [hiddenTaskIds] = useState<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  const handleBack = () => {
    void navigate(-1);
  };

  const fmt = (v: string | number) => formatMoneyShort(v);

  // Sticky offset equals actual top bar height
  const headerRef = useRef<HTMLDivElement | null>(null);
  const [stickyTop, setStickyTop] = useState<number>(64);

  useEffect(() => {
    const measure = () => {
      const h = headerRef.current?.offsetHeight ?? 64;
      if (h !== stickyTop) setStickyTop(h);
    };

    measure();

    let ro: ResizeObserver | null = null;
    if (headerRef.current && 'ResizeObserver' in window) {
      ro = new ResizeObserver(() => measure());
      ro.observe(headerRef.current);
    }

    window.addEventListener('resize', measure);
    return () => {
      window.removeEventListener('resize', measure);
      if (ro && headerRef.current) ro.disconnect();
    };
  }, [stickyTop]);

  // Fix race conditions with debounced user updates
  const updateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isUpdatingRef = useRef(false);
  
  const forceUpdateUser = useCallback(async () => {
    // Prevent multiple simultaneous updates
    if (isUpdatingRef.current) {
      console.log('[Trials] Update already in progress, skipping');
      return;
    }
    
    try {
      isUpdatingRef.current = true;
      console.log('[Trials] Force updating user data');
      
      const response = await fetchUserDataNoCache();
      if (response.ok) {
        const userData = await response.json();
        dispatch(forceUserUpdate(userData));
        console.log('[Trials] User updated successfully:', { 
          coins: userData.coins, 
          balance: userData.balance,
          energy: userData.energyTasksBonus 
        });
      } else {
        console.warn('[Trials] Failed to fetch user data:', response.status);
      }
    } catch (error) {
      console.error('[Trials] Error updating user data:', error);
    } finally {
      isUpdatingRef.current = false;
    }
  }, [dispatch]);
  
  // Debounced version of forceUpdateUser to prevent excessive API calls
  const debouncedForceUpdateUser = useCallback(() => {
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    updateTimeoutRef.current = setTimeout(() => {
      void forceUpdateUser();
    }, PROGRESS_UPDATE_DEBOUNCE_MS);
  }, [forceUpdateUser]);

  // Обработчики кликов по коробкам
  const handleRedBoxClick = () => {
    setRedBoxModalOpen(true);
  };

  const handleGreenBoxClick = () => {
    setGreenBoxModalOpen(true);
  };

  const handleXBoxClick = () => {
    setXBoxModalOpen(true);
  };

  // Рулетка
  const handleOpenWheel = (taskId: string) => { 
    console.log('🎰 Trials: Открываем рулетку для задания:', taskId);
    setIsWheelOpen(true); 
  };

  const handleCloseWheel = useCallback(() => { 
    console.log('🎰 Trials: Closing wheel');
    setIsWheelOpen(false); 
    // Use debounced update to prevent race conditions
    debouncedForceUpdateUser();
  }, [debouncedForceUpdateUser]);

  const handleSpinWheel = async (): Promise<{ prize: number; index: number }> => {
    try {
      console.log('🎰 Trials: Вызов API рулетки напрямую');
      
      const response = await fetch('/api/wheel/spin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();
      console.log('🎰 Trials: Результат API рулетки:', result);

      if (result.success) {
        // FIXED: Just return the wheel result - no task manipulation
        // The task should be completed via the normal claim button flow
        console.log('🎰 Trials: Wheel spun successfully, returning result');
        
        return {
          prize: result.prize,
          index: result.index
        };
      } else {
        throw new Error(result.error || 'Wheel API error');
      }
    } catch (error) {
      console.error(`🎰 Trials: ${t('errors.wheelSpinError')}:`, error);
      throw error;
    }
  };

  // Мемоизируем данные пользователя
  const userData = useMemo(() => ({
    balance: user?.balance, // Показываем реальный баланс (как в Trade)
    coins: user?.coins,
    energyProgress: user?.energyTasksBonus ?? 0,
    userId: user?.id,
  }), [user?.balance, user?.coins, user?.energyTasksBonus, user?.id]);

  // Мемоизируем список заданий с заменой премиум заданий
  const tasksList = useMemo(() => {
    const filteredTasks = tasks.filter(task => {
      // Исключаем завершенные и скрытые задания
      if (task.status === 'completed' || hiddenTaskIds.has(task.id)) {
        return false;
      }
      
      return true;
    });

    // Заменяем премиум задания на обычные для пользователей без премиума
    return filteredTasks.map(task => {
      const isPremiumTask = (task as any).taskType?.startsWith('premium_');
      if (isPremiumTask && !isPremium) {
        // Заменяем премиум задание на обычное
        return {
          ...task,
          taskType: 'daily_bonus', // Заменяем на daily_bonus
          title: 'tasks.dailyBonus.title',
          description: 'tasks.dailyBonus.description',
          reward: {
            type: 'money',
            amount: '750'
          },
          icon: '/trials/energy.svg'
        };
      }
      return task;
    });
  }, 
    [tasks, hiddenTaskIds, isPremium]
  );

  // Fix memory leaks and ensure proper cleanup
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🔄 Trials: Initializing and updating user data');
      void forceUpdateUser();
      isInitializedRef.current = true;
    }
  }, [forceUpdateUser]);

  // Periodic updates with proper cleanup to prevent memory leaks
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Trials: Periodic user data update');
      void forceUpdateUser();
    }, PERIODIC_UPDATE_INTERVAL_MS);
    
    // Cleanup function to prevent memory leaks
    return () => {
      console.log('🔄 Trials: Cleaning up periodic update interval');
      clearInterval(interval);
      
      // Clear any pending debounced updates
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
        updateTimeoutRef.current = null;
      }
    };
  }, [forceUpdateUser]);

  return (
    <div className="p-0">
      <div className="flex flex-col min-h-screen bg-white pb-[calc(16px+env(safe-area-inset-bottom))]">
        {/* Top Navigation */}
        <div ref={headerRef} className="sticky top-0 z-10 bg-white flex items-center justify-between px-4 py-4">
          <button
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <img src="/top-menu/back.svg" alt={t('nav.back')} className="w-6 h-6" />
            <span className="text-xl font-extrabold text-black">{t('nav.back')}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <img src="/trials/dollars.svg" alt={t('alt.balance')} className="w-6 h-6" />
              <span className="text-sm font-bold text-black">{fmt(userData.balance ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <img src="/money.svg" alt={t('alt.coins')} className="w-6 h-6" />
              <span className="text-sm font-bold text-black">
                {userData.coins ?? 500}
              </span>
            </div>
          </div>
        </div>

        {/* Прогресс уровня */}
        <div className="sticky z-10 bg-white px-4 pt-0 pb-8" style={{ top: `${stickyTop}px` }}>
          <LevelProgress 
            energyProgress={userData.energyProgress} 
            onRedBoxClick={handleRedBoxClick}
            onGreenBoxClick={handleGreenBoxClick}
            onXBoxClick={handleXBoxClick}
          />
        </div>

        {/* Модальные окна */}
        <Box type="red" isOpen={redBoxModalOpen} onClose={() => { 
          setRedBoxModalOpen(false);
          debouncedForceUpdateUser();
        }} />
        
        <Box type="green" isOpen={greenBoxModalOpen} onClose={() => { 
          setGreenBoxModalOpen(false);
          debouncedForceUpdateUser();
        }} />
        
        <Box type="x" isOpen={xBoxModalOpen} onClose={() => { 
          setXBoxModalOpen(false);
          debouncedForceUpdateUser();
        }} />
        
        {/* Рулетка */}
        <WheelFortune
          isOpen={isWheelOpen}
          onClose={handleCloseWheel}
          onSpin={handleSpinWheel}
        />

        {/* Карточки заданий */}
        <div className="flex-1 px-4 py-4 overflow-y-auto allow-pan-y">
          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-full bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-16 h-16 bg-gray-200 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4" />
                      <div className="h-3 bg-gray-200 rounded w-1/2" />
                      <div className="h-3 bg-gray-200 rounded w-1/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : tasksList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8">
              <img src="/trials/energy.svg" alt={t('alt.noTasks')} className="w-16 h-16 mb-4 opacity-50" />
              <p className="text-gray-500 text-center">{t('ui.trials.noTasks')}</p>
              <p className="text-sm text-gray-400 text-center mt-1">
                {t('ui.trials.createNewTasks')}
              </p>
            </div>
          ) : (
            <div className="tasks-container flex flex-col gap-4">
              {tasksList.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onComplete={completeTask}
                  onUpdateProgress={updateTaskProgress}
                  onReplace={replaceTask}
                  onWheelOpen={handleOpenWheel}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}