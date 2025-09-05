import React, { useEffect } from 'react';
import { useOrientationLock } from '../hooks/useOrientationLock';
import { analyticsService } from '../services/analyticsService';

interface OrientationGuardProps {
  children: React.ReactNode;
}

export const OrientationGuard: React.FC<OrientationGuardProps> = ({ children }) => {
  const { isLandscape } = useOrientationLock();

  // Отправляем аналитику при блокировке ориентации
  useEffect(() => {
    if (isLandscape) {
      const orientation = window.innerWidth > window.innerHeight ? 'landscape' : 'portrait';
      analyticsService.trackOrientationBlocked(orientation);
    }
  }, [isLandscape]);

  if (isLandscape) {
    return <LandscapeBlockedScreen />;
  }

  return <>{children}</>;
};

const LandscapeBlockedScreen: React.FC = () => {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center z-[9999]">
      <div className="text-center text-white px-6">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-4">
            Поверните устройство
          </h1>
        </div>
        
        <div className="bg-gray-800 bg-opacity-50 rounded-xl p-6">
          <div className="flex justify-center items-center space-x-4">
            {/* Анимация поворота */}
            <div className="transform rotate-90 transition-transform duration-1000">
              <svg className="w-8 h-8 text-red-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
              </svg>
            </div>
            <span className="text-xl">→</span>
            <div className="transform rotate-0 transition-transform duration-1000">
              <svg className="w-8 h-8 text-green-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};