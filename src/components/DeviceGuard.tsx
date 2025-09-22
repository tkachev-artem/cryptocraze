import React, { useEffect, useState } from 'react';
import { isPhoneDevice } from '../lib/viewportUtils';
import { analyticsService } from '../services/analyticsService';

interface DeviceGuardProps {
  children: React.ReactNode;
}

export const DeviceGuard: React.FC<DeviceGuardProps> = ({ children }) => {
  const [isAllowedDevice, setIsAllowedDevice] = useState<boolean | null>(null);

  useEffect(() => {
    const checkDevice = () => {
      const isPhone = isPhoneDevice();
      const isAdminRoute = window.location.pathname.startsWith('/admin');
      
      let isAllowed = false;
      
      if (isAdminRoute) {
        // Админка доступна ТОЛЬКО с компьютера (НЕ телефон)
        isAllowed = !isPhone;
      } else {
        // Остальные страницы ТОЛЬКО для телефонов
        isAllowed = isPhone;
      }
      
      setIsAllowedDevice(isAllowed);
      
      // Логируем для аналитики
      console.log(`Device check: isPhone=${isPhone}, isAdminRoute=${isAdminRoute}, isAllowed=${isAllowed}, userAgent=${navigator.userAgent}`);
      
      // Отправляем аналитику
      if (isAllowed) {
        analyticsService.trackDeviceAccepted();
      } else {
        const deviceType = /iPad/.test(navigator.userAgent) ? 'tablet' : 'desktop';
        analyticsService.trackDeviceBlocked(deviceType, navigator.userAgent);
      }
    };

    checkDevice();
    
    // Повторная проверка при изменении размера окна (для отладки)
    window.addEventListener('resize', checkDevice);
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  // Показываем loading пока определяемся с устройством
  if (isAllowedDevice === null) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Проверка устройства...</p>
        </div>
      </div>
    );
  }

  // Блокируем доступ с планшетов и десктопов
  if (!isAllowedDevice) {
    return <DesktopBlockedScreen />;
  }

  return <>{children}</>;
};

const DesktopBlockedScreen: React.FC = () => {
  const isAdminRoute = typeof window !== 'undefined' && window.location.pathname.startsWith('/admin');
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#0C54EA] px-4">
      <img src="/alert.svg" alt="" className="mb-6 w-16 h-16" />
      <h1 className="text-xl font-bold text-white text-center max-w-xs">
        {isAdminRoute 
          ? "Админка доступна только с компьютера" 
          : "Только для мобильных устройств"
        }
      </h1>
      {isAdminRoute && (
        <p className="mt-4 text-white text-center max-w-sm opacity-75">
          Попробуйте открыть эту ссылку на компьютере или ноутбуке
        </p>
      )}
    </div>
  );
};