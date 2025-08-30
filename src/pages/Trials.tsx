import { useMemo, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '@/lib/i18n';
import { useUser } from '@/hooks/useUser';
import { useTasks } from '@/hooks/useTasks';
import { formatMoneyShort } from '@/lib/numberUtils';
import { Grid } from '@/components/ui/grid';
import WheelFortune from '@/components/WheelFortune';
import TaskCard from '@/components/TaskCard';
import { Box } from '@/components/Box';
import { useAppDispatch } from '@/app/hooks';
import { forceUserUpdate } from '@/app/userSlice';
import { fetchUserDataNoCache } from '@/lib/noCacheApi';

// Компонент прогресса уровня
const LevelProgress = ({ 
  energyProgress, 
  onRedBoxClick,
  onGreenBoxClick,
  onXBoxClick
}: { 
  energyProgress: number; 
  onRedBoxClick: () => void;
  onGreenBoxClick: () => void;
  onXBoxClick: () => void;
}) => {
  const { t } = useTranslation();
  const progressPercentage = Math.min(energyProgress, 100);
  
  // Позиции коробок на прогресс-баре
  const displayedEnergy = Math.min(energyProgress, 100); // Показываем максимум 100 в лейбле
  const boxPositions = [
    { position: 0, icon: '/trials/energy.svg', label: `${String(displayedEnergy)}/100`, isEnergy: true },
    { position: 30, icon: '/trials/red-box.svg', label: '30', isRedBox: true },
    { position: 70, icon: '/trials/green-box.svg', label: '70', isGreenBox: true },
    { position: 100, icon: '/trials/x-box.svg', label: '100', isXBox: true }
  ];
  
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
              const isRedBoxActive = box.isRedBox && isBoxReached;
              const isGreenBoxActive = box.isGreenBox && isBoxReached;
              const isXBoxActive = box.isXBox && isBoxReached;
              const isAnyBoxActive = isRedBoxActive ? true : (isGreenBoxActive ? true : isXBoxActive);
              const translateX = box.position === 0 ? '0%' : (box.position === 100 ? '-100%' : '-50%');

              const handleBoxClick = () => {
                if (isRedBoxActive) onRedBoxClick();
                if (isGreenBoxActive) onGreenBoxClick();
                if (isXBoxActive) onXBoxClick();
              };

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
  const [activeWheelTaskId, setActiveWheelTaskId] = useState<string | null>(null);
  const [hiddenTaskIds] = useState<Set<string>>(new Set());
  const isInitializedRef = useRef(false);

  const handleBack = () => {
    void navigate(-1);
  };

  const fmt = (v: string | number) => formatMoneyShort(v);

  // Принудительное обновление пользователя
  const forceUpdateUser = async () => {
    try {
      console.log('[Trials] ПРИНУДИТЕЛЬНОЕ обновление пользователя');
      const response = await fetchUserDataNoCache();
      if (response.ok) {
        const userData = await response.json();
        dispatch(forceUserUpdate(userData));
        console.log('[Trials] Пользователь обновлен:', { coins: userData.coins, balance: userData.balance });
      }
    } catch (error) {
      console.error('[Trials] Ошибка обновления пользователя:', error);
    }
  };

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
    setActiveWheelTaskId(taskId);
    setIsWheelOpen(true); 
  };

  const handleCloseWheel = () => { 
    console.log('🎰 Trials: Закрываем рулетку');
    setIsWheelOpen(false); 
    setActiveWheelTaskId(null);
    // Принудительно обновляем данные
    void forceUpdateUser();
  };

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
        // Завершаем активное задание если есть
        if (activeWheelTaskId) {
          const wheelTask = tasks.find(task => task.id === activeWheelTaskId);
          if (wheelTask && wheelTask.status === 'active') {
            console.log('🎰 Trials: Завершаем задание с рулеткой:', wheelTask.id);
            await completeTask(wheelTask.id);
          }
        }

        return {
          prize: result.prize,
          index: result.index
        };
      } else {
        throw new Error(result.error || 'Wheel API error');
      }
    } catch (error) {
      console.error('🎰 Trials: Ошибка при вращении рулетки:', error);
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

  // Мемоизируем список заданий
  const tasksList = useMemo(() => tasks.filter(task => task.status !== 'completed' && !hiddenTaskIds.has(task.id)), [tasks, hiddenTaskIds]);

  // Обновляем данные при загрузке страницы
  useEffect(() => {
    if (!isInitializedRef.current) {
      console.log('🔄 Trials.tsx: Инициализация и обновление данных пользователя');
      void forceUpdateUser();
      isInitializedRef.current = true;
    }
  }, []);

  // Периодическое обновление каждые 10 секунд
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('🔄 Trials.tsx: Периодическое обновление данных пользователя');
      void forceUpdateUser();
    }, 10000);
    
    return () => { clearInterval(interval); };
  }, []);

  return (
    <Grid className="p-0">
      <div className="flex flex-col min-h-screen bg-white pb-[calc(16px+env(safe-area-inset-bottom))]">
        {/* Top Navigation */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-4 py-4">
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
        <div className="px-4 py-4 pb-8">
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
          void forceUpdateUser();
        }} />
        
        <Box type="green" isOpen={greenBoxModalOpen} onClose={() => { 
          setGreenBoxModalOpen(false);
          void forceUpdateUser();
        }} />
        
        <Box type="x" isOpen={xBoxModalOpen} onClose={() => { 
          setXBoxModalOpen(false);
          void forceUpdateUser();
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
    </Grid>
  );
}