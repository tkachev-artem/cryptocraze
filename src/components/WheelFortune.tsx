import type React from 'react';
import { useState, useCallback, useRef } from 'react';
import { useTranslation } from '../lib/i18n';

type WheelFortuneProps = {
  isOpen: boolean;
  onClose: () => void;
  onSpin: () => Promise<{ prize: number; index: number }>;
}

// Параметры колеса
// Должно соответствовать количеству призов на бэкенде (см. CryptoAnalyzer/server/wheel.ts → WHEEL_PRIZES)
const SEGMENT_COUNT = 9;   // число секторов на фоне
const SEGMENT_ANGLE = 360 / SEGMENT_COUNT;
// Калибровка по макету. При необходимости подстройте на ±1-3°
const ROTATION_OFFSET_DEG = 0;

export const WheelFortune: React.FC<WheelFortuneProps> = ({ 
  isOpen, 
  onClose, 
  onSpin 
}) => {
  const { t } = useTranslation();
  const [isSpinning, setIsSpinning] = useState(false);
  const [currentRotation, setCurrentRotation] = useState(0);
  const [prize, setPrize] = useState<number | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);

  const handleSpin = useCallback(async () => {
    if (isSpinning) {
      return;
    }

    try {
      setIsSpinning(true);
      setPrize(null);

      // Получаем результат от сервера
      const result = await onSpin();
      
      if (!result || typeof result.prize === 'undefined' || typeof result.index === 'undefined') {
        throw new Error('Invalid wheel result');
      }
      
      // Рассчитываем угол для победного сектора:
      // Стрелка закреплена сверху по центру, указывает на центр сектора.
      const safeIndex = Math.max(0, Math.min(result.index, SEGMENT_COUNT - 1));
      const targetAngle = ROTATION_OFFSET_DEG + 360 - (safeIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);
      const spinRotation = 360 * 2 + targetAngle; // 2 оборота + доводка
      
      // Сбрасываем rotation для чистого старта
      const startRotation = 0;
      const finalRotation = spinRotation;
      
      // Применяем CSS анимацию
      if (wheelRef.current) {
        const wheel = wheelRef.current;
        
        // Сначала убираем любые переходы и устанавливаем начальное положение
        wheel.style.transition = 'none';
        wheel.style.transform = `rotate(${startRotation}deg)`;
        
        // Принудительно применяем стили через requestAnimationFrame для надёжности
        requestAnimationFrame(() => {
          // Принудительно запускаем reflow
          wheel.offsetHeight; 
          
          // Теперь добавляем переход и устанавливаем финальный угол
          wheel.style.transition = 'transform 2s ease-out';
          wheel.style.transform = `rotate(${finalRotation}deg)`;
        });
        
        // Обновляем состояние после анимации
        setTimeout(() => {
          setCurrentRotation(finalRotation % 360); // Нормализуем для следующего вращения
        }, 2100);
      }

      // Показываем приз после окончания анимации с дополнительной задержкой
      setTimeout(() => {
        setPrize(result.prize);
        setIsSpinning(false);
      }, 2500); // 2 секунды анимации + 500мс задержки

    } catch (error) {
      console.error('Ошибка при вращении рулетки:', error);
      setIsSpinning(false);
    }
  }, [isSpinning, currentRotation, onSpin]);

  const handleClose = useCallback(() => {
    if (isSpinning) return;
    
    setPrize(null);
    setCurrentRotation(0);
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    onClose();
  }, [isSpinning, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50"
      style={{
        background: 'radial-gradient(circle at 50% 44.25%, #0C54EA 14.52%, #072F84 100%)'
      }}
    >
      <div className="w-full h-full flex flex-col items-center justify-between p-6">

        {/* Заголовок - вверху */}
        <div className="text-center pt-8">
          <h2 className="text-white text-2xl font-bold">
            {prize !== null && !isSpinning ? t('wheel.yourWin') : t('wheel.tryLuck')}
          </h2>
        </div>

        {/* Рулетка или результат - по центру */}
        <div className="flex-1 flex items-center justify-center">
          {prize === null || isSpinning ? (
            <div className="flex flex-col items-center gap-6">
              {/* Изображение медведя между заголовком и колесом */}
              <img
                src="/wheel/bear.svg"
                alt="bear"
                className="w-32 h-40"
              />
              
              {/* Контейнер колеса фиксированного размера, чтобы легко центрировать стрелку */}
              <div
                className="relative"
                style={{ width: '320px', height: '320px' }}
              >
                {/* Стрелка строго по центру сверху круга */}
                <img
                  src="/wheel/arrow.svg"
                  alt="arrow"
                  className="absolute z-10 pointer-events-none select-none"
                  style={{
                    left: '50%',
                    top: '38%',
                    transform: 'translate(-50%, -50%)',
                    width: '23px',
                    height: '62px'
                  }}
                />

                {/* Вращаемый фон */}
                <div
                  ref={wheelRef}
                  className="absolute inset-0"
                  style={{ 
                    transform: `rotate(${String(currentRotation)}deg)`, 
                    transformOrigin: '50% 50%',
                    backfaceVisibility: 'hidden',
                    willChange: 'transform'
                  }}
                >
                  <img
                    src="/wheel/background.svg"
                    alt="wheel"
                    className="w-full h-full select-none"
                    draggable={false}
                  />
                </div>

                {/* Центральный круг поверх всего */}
                <img
                  src="/wheel/circle.svg"
                  alt="center"
                  className="absolute z-20 pointer-events-none select-none"
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: 'translate(-50%, -50%)',
                    width: '32px',
                    height: '32px'
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="text-center flex flex-col items-center gap-4">
              <img
                src="/wheel/coins.svg"
                alt="coins"
                className="w-32 h-24"
              />
              <p className="text-[40px] font-extrabold tracking-[0px] text-[#F5A600]">
                ${String(prize)}
              </p>
            </div>
          )}
        </div>

        {/* Кнопка действия - внизу */}
        <div className="text-center pb-8 w-full max-w-md">
          {prize ? (
            <button
              onClick={handleClose}
              className="flex w-full h-[48px] px-[16px] flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-[#0C54EA] text-white font-bold transition-colors hover:bg-[#0A4BD8]"
            >
              {t('common.claim')}
            </button>
          ) : (
            <button
              onClick={() => { void handleSpin(); }}
              disabled={isSpinning}
              className="flex w-full h-[48px] px-[16px] flex-col justify-center items-center gap-[8px] flex-shrink-0 rounded-[100px] bg-white text-blue-600 font-bold transition-colors hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSpinning ? t('wheel.spinning') : t('wheel.spin')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default WheelFortune;