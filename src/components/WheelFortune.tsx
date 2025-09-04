import type React from 'react';
import { useState, useCallback, useRef, useEffect } from 'react';
import { useUser } from '../hooks/useUser';
import { formatMoneyShort } from '../lib/numberUtils';
import { ErrorBoundary } from './ErrorBoundary';
import { useTranslation } from '../lib/i18n';

// Configuration constants
const WHEEL_CONFIG = {
  SEGMENT_COUNT: 9,
  SPIN_DURATION: 3000,
  SPIN_DELAY: 500,
  FULL_ROTATIONS: 5,
} as const;

const SEGMENT_ANGLE = 360 / WHEEL_CONFIG.SEGMENT_COUNT;

// Prize amounts for each segment (9 segments) - new prizes
const PRIZE_AMOUNTS = [
  100, 200, 500, 700, 1000, 1500, 2000, 150, 10000
] as const;

// Types
type WheelState = 'idle' | 'spinning' | 'completed' | 'error';

interface WheelResult {
  prize: number;
  index: number;
}

interface WheelFortuneProps {
  isOpen: boolean;
  onClose: () => void;
  onSpin: () => Promise<WheelResult>;
  onError?: (error: Error) => void;
}

export const WheelFortune: React.FC<WheelFortuneProps> = ({ 
  isOpen, 
  onClose, 
  onSpin,
  onError 
}) => {
  const { t } = useTranslation();
  const { user } = useUser();
  const fmt = formatMoneyShort;
  const userData = user || { balance: '0', coins: 0 };
  
  const [state, setState] = useState<WheelState>('idle');
  const [currentRotation, setCurrentRotation] = useState(0);
  const [prize, setPrize] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const wheelRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const animateWheel = useCallback((result: WheelResult): Promise<void> => {
    return new Promise((resolve) => {
      const wheel = wheelRef.current;
      if (!wheel) {
        resolve();
        return;
      }

      // Validate index
      if (result.index < 0 || result.index >= WHEEL_CONFIG.SEGMENT_COUNT) {
        console.error('Invalid wheel index:', result.index);
        resolve();
        return;
      }

      // Calculate target angle for the top arrow to point to the winning segment
      // Segments start at -90 degrees (top), so we need to align properly
      const segmentCenter = result.index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;
      // We want the winning segment center to be at the top (0 degrees relative to our wheel)
      const targetAngle = -segmentCenter;
      const spinRotation = WHEEL_CONFIG.FULL_ROTATIONS * 360 + targetAngle;
      
      console.log('🎲 Spinning to index:', result.index, 'prize:', result.prize, 'total rotation:', spinRotation);
      console.log('🎲 Client array:', PRIZE_AMOUNTS);
      console.log('🎲 What should be at index', result.index, ':', PRIZE_AMOUNTS[result.index]);
      console.log('🎲 But server returned:', result.prize);

      // Reset and animate
      wheel.style.transition = 'none';
      wheel.style.transform = `rotate(${currentRotation}deg)`;
      
      requestAnimationFrame(() => {
        wheel.style.transition = `transform ${WHEEL_CONFIG.SPIN_DURATION}ms cubic-bezier(0.23, 1, 0.32, 1)`;
        wheel.style.transform = `rotate(${spinRotation}deg)`;
        
        setTimeout(() => {
          if (mountedRef.current) {
            setCurrentRotation(spinRotation % 360);
            resolve();
          }
        }, WHEEL_CONFIG.SPIN_DURATION);
      });
    });
  }, [currentRotation]);

  const handleSpin = useCallback(async () => {
    if (state !== 'idle') return;

    setState('spinning');
    setError(null);
    setPrize(null);
    
    try {
      const result = await onSpin();
      
      if (!mountedRef.current) return;
      
      await animateWheel(result);
      
      if (!mountedRef.current) return;
      
      setPrize(result.prize);
      setState('completed');
      
    } catch (err) {
      console.error('Wheel spin error:', err);
      if (!mountedRef.current) return;
      
      setError(err instanceof Error ? err.message : 'Spin failed');
      setState('error');
      
      if (onError) {
        onError(err instanceof Error ? err : new Error('Spin failed'));
      }
    }
  }, [state, onSpin, animateWheel, onError]);

  const handleClose = useCallback(() => {
    setState('idle');
    setPrize(null);
    setCurrentRotation(0);
    setError(null);
    
    if (wheelRef.current) {
      wheelRef.current.style.transition = 'none';
      wheelRef.current.style.transform = 'rotate(0deg)';
    }
    
    onClose();
  }, [onClose]);

  const handleRetry = useCallback(() => {
    if (state === 'error') {
      setState('idle');
      setError(null);
    }
  }, [state]);

  if (!isOpen) return null;

  const canSpin = state === 'idle';
  const showLoadingState = state === 'spinning';
  const showResult = state === 'completed' && prize !== null;
  const showError = state === 'error' && error !== null;

  // Show result screen
  if (showResult) {
    return (
      <div className="absolute inset-0 z-50">
        <div className="w-full h-full">
          <ErrorBoundary>
            <div className="h-full bg-[#0C54EA] flex flex-col items-center justify-center p-4">
          {/* Title */}
          <h2 className="text-white text-2xl font-bold mb-6">
            {t('wheel.yourWin')}
          </h2>

          {/* Coins image */}
          <div className="mb-6 relative">
            <div className="flex justify-center items-center mb-4">
              <img
                src="/wheel/coins.svg"
                alt="Coins"
                className="w-32 h-32"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
            
            {/* Prize amount */}
            <div className="text-center">
              <span className="text-5xl font-bold text-yellow-400">
                {prize}$
              </span>
            </div>
          </div>

          {/* Collect button */}
          <button
            onClick={handleClose}
            className="w-full max-w-xs bg-white text-[#0C54EA] py-4 px-6 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            {t('wheel.collect')}
          </button>
            </div>
          </ErrorBoundary>
        </div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 z-50">
      <div className="w-full h-full">
        <ErrorBoundary>
          <div className="h-full bg-[#0C54EA] flex flex-col overflow-hidden">
        {/* Top Navigation */}
        <div className="flex items-center justify-between px-4 py-4 bg-white">
          <button
            onClick={handleClose}
            className="flex items-center gap-2"
          >
            <img src="/top-menu/back.svg" alt={t('wheel.back')} className="w-6 h-6" />
            <span className="text-xl font-bold text-black">{t('wheel.back')}</span>
          </button>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              <img src="/trials/dollars.svg" alt={t('common.balance')} className="w-6 h-6" />
              <span className="text-sm font-bold text-black">{fmt(userData.balance ?? 0)}</span>
            </div>
            <div className="flex items-center gap-1">
              <img src="/money.svg" alt={t('common.coins')} className="w-6 h-6" />
              <span className="text-sm font-bold text-black">{userData.coins ?? 0}</span>
            </div>
          </div>
        </div>

        {/* Main content container */}
        <div className="flex-1 flex flex-col items-center justify-center p-4">
          {/* Title */}
          <h2 className="text-white text-[29px] font-bold mb-4">
            {showLoadingState ? t('wheel.spinning') : t('wheel.tryLuck')}
          </h2>

        {/* Bear image */}
        <img
          src="/wheel/bear.svg"
          alt="bear"
          className="w-[120px] h-[151px] mb-4"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        
        {/* Wheel container - proper Figma design */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="relative" style={{ width: '320px', height: '320px' }}>
            {/* Wheel with proper design */}
            <div
              ref={wheelRef}
              className="absolute inset-0"
              style={{ 
                transform: `rotate(${currentRotation}deg)`
              }}
            >
              <svg width="320" height="320" className="w-full h-full">
                <defs>
                  {/* Gradient for outer ring */}
                  <linearGradient id="outerRingGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#87CEEB" />
                    <stop offset="100%" stopColor="#B0D4F1" />
                  </linearGradient>
                  
                  {/* Gradient for center */}
                  <radialGradient id="centerGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4A90E2" />
                    <stop offset="100%" stopColor="#0C54EA" />
                  </radialGradient>
                </defs>

                {/* Outer white ring */}
                <circle
                  cx="160"
                  cy="160"
                  r="158"
                  fill="white"
                  stroke="none"
                />

                {/* Blue outer border with gradient */}
                <circle
                  cx="160"
                  cy="160"
                  r="145"
                  fill="url(#outerRingGradient)"
                  stroke="none"
                />

                {/* Outer dots on blue ring */}
                {(() => {
                  const dots = [];
                  const radius = 145;
                  const centerX = 160;
                  const centerY = 160;
                  const dotCount = 16;

                  for (let i = 0; i < dotCount; i++) {
                    const angle = (i * (360 / dotCount)) * (Math.PI / 180);
                    const x = centerX + radius * Math.cos(angle);
                    const y = centerY + radius * Math.sin(angle);
                    
                    dots.push(
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="4"
                        fill="#0C54EA"
                      />
                    );
                  }
                  return dots;
                })()}

                {/* Main wheel segments */}
                {(() => {
                  const segments = [];
                  const radius = 130;
                  const centerX = 160;
                  const centerY = 160;

                  for (let i = 0; i < WHEEL_CONFIG.SEGMENT_COUNT; i++) {
                    const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
                    const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);
                    
                    const x1 = centerX + radius * Math.cos(startAngle);
                    const y1 = centerY + radius * Math.sin(startAngle);
                    const x2 = centerX + radius * Math.cos(endAngle);
                    const y2 = centerY + radius * Math.sin(endAngle);
                    
                    const largeArc = SEGMENT_ANGLE > 180 ? 1 : 0;
                    
                    const pathData = [
                      `M ${centerX} ${centerY}`,
                      `L ${x1} ${y1}`,
                      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
                      'Z'
                    ].join(' ');

                    // Color mapping based on prize amounts
                    // 100$ blue, 200$ white, 500$ blue, 700$ white, 1000$ blue, 1500$ white, 2000$ blue, 150$ white, 10000$ #0C46BE
                    const prize = PRIZE_AMOUNTS[i];
                    let segmentColor: string;
                    let textColor: string;
                    
                    if (prize === 10000) {
                      segmentColor = '#0C46BE';
                      textColor = '#FFFFFF';
                    } else if (prize === 100 || prize === 500 || prize === 1000 || prize === 2000) {
                      segmentColor = '#0C54EA';
                      textColor = '#FFFFFF';
                    } else { // 200, 700, 1500, 150
                      segmentColor = '#FFFFFF';
                      textColor = '#0C54EA';
                    }

                    const textAngle = (i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90) * (Math.PI / 180);
                    const textRadius = radius * 0.65;
                    const textX = centerX + textRadius * Math.cos(textAngle);
                    const textY = centerY + textRadius * Math.sin(textAngle);

                    segments.push(
                      <g key={i}>
                        <path
                          d={pathData}
                          fill={segmentColor}
                          stroke="none"
                        />
                        <text
                          x={textX}
                          y={textY}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fontSize="14"
                          fontWeight="bold"
                          fill={textColor}
                          transform={`rotate(${i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2}, ${textX}, ${textY})`}
                        >
                          {PRIZE_AMOUNTS[i]}$
                        </text>
                      </g>
                    );
                  }
                  return segments;
                })()}
                
              </svg>
            </div>

            {/* Static elements that don't rotate */}
            <div className="absolute inset-0 pointer-events-none">
              <svg width="320" height="320" className="w-full h-full">
                <defs>
                  {/* Gradient for center */}
                  <radialGradient id="staticCenterGradient" cx="50%" cy="50%" r="50%">
                    <stop offset="0%" stopColor="#4A90E2" />
                    <stop offset="100%" stopColor="#0C54EA" />
                  </radialGradient>
                </defs>

                {/* Arrow using external SVG image - 2x bigger (behind circle) */}
                <image
                  href="/trials/arrow.svg"
                  x="137"
                  y="98"
                  width="46"
                  height="62"
                />

                {/* Center circle with gradient and proper border */}
                <circle
                  cx="160"
                  cy="160"
                  r="28"
                  fill="url(#staticCenterGradient)"
                  stroke="#8ABBFD"
                  strokeWidth="2"
                />
                
                {/* White center dot */}
                <circle
                  cx="160"
                  cy="160"
                  r="8"
                  fill="white"
                />

                {/* Circle in center of inner circle (on top of arrow) */}
                <image
                  href="/trials/circle.svg"
                  x="144"
                  y="144"
                  width="32"
                  height="32"
                />
              </svg>
            </div>
          </div>

        </div>

        {/* Error display */}
        {showError && (
          <div className="mb-4 text-center">
            <div className="bg-red-100 border border-red-400 rounded-lg p-4">
              <h3 className="text-red-700 font-bold mb-2">{t('common.error')}</h3>
              <p className="text-red-600 mb-3">{error}</p>
              <button
                onClick={handleRetry}
                className="bg-red-600 text-white px-4 py-2 rounded font-medium hover:bg-red-700 transition-colors"
              >
                {t('common.retry')}
              </button>
            </div>
          </div>
        )}

          {/* Action buttons */}
          <div className="flex flex-col gap-3 w-full max-w-xs">
            {canSpin && (
              <button
                onClick={handleSpin}
                className="w-full bg-white text-[#0C54EA] py-3 px-6 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors"
              >
                {t('wheel.spin')}
              </button>
            )}
          </div>
        </div>
          </div>
        </ErrorBoundary>
      </div>
    </div>
  );
};