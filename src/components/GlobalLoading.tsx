import type { FC } from 'react';
import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

type GlobalLoadingProps = {
  children: React.ReactNode;
  minimumLoadingTime?: number;
}

// ТОЛЬКО критичные изображения для основных экранов - 43 файла
const CRITICAL_IMAGES = [
  // Для /home
  '/panda.webp',
  '/avatar.webp',
  '/crown.webp',
  '/logo/logo.svg',
  '/vault.webp',
  '/money.svg',
  '/awards.svg',
  '/settings.svg',
  
  // Навигация (нижнее меню)
  '/menu/active/home.svg',
  '/menu/active/trading.svg',
  '/menu/active/profile.svg',
  '/menu/active/rating.svg',
  '/menu/active/best.svg',
  '/menu/no-active/home.svg',
  '/menu/no-active/trading.svg',
  '/menu/no-active/profile.svg',
  '/menu/no-active/rating.svg',
  '/menu/no-active/best.svg',
  
  // Для рейтинга
  '/rating/arrow-down.svg',
  '/rating/arrow-up.svg',
  '/rating/rating-bg.webp',
  '/rating/top-bg.webp',
  '/top-menu/back.svg',
  
  // Для профиля
  '/avatar-big.svg',
  '/email.svg',
  '/phone.svg',
  '/dollar.svg',
  '/top-menu/edit.svg',
  '/ellipse.svg',
  '/top-menu/edit-light.svg',
  '/close.svg',
  '/accept.webp',
  
  // Для торговли /trade
  '/trade/wallet.svg',
  '/trade/money.svg',
  '/trade/trades.svg',
  '/top-menu/list.svg',
  '/dashboard/up.svg',
  '/dashboard/down.svg',
  '/deal/up.svg',
  '/deal/down.svg',
  '/trade/down-arrow.svg',
  '/dashboard/diamond.svg',
  '/dashboard/energy.svg'
];

// Принудительная предзагрузка с Promise - загружаем максимум 3 секунды
const forcePreloadImages = (): Promise<void> => {
  return new Promise((resolve) => {
    let loadedCount = 0;
    let errorCount = 0;
    const totalImages = CRITICAL_IMAGES.length;
    
    if (totalImages === 0) {
      resolve();
      return;
    }
    
    // Таймаут на случай медленного соединения
    const timeout = setTimeout(() => {
      console.log(`⏰ Таймаут загрузки изображений: ${loadedCount}/${totalImages} загружено, ${errorCount} ошибок`);
      resolve();
    }, 3000);
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        clearTimeout(timeout);
        console.log(`✅ Все ${totalImages} изображений обработаны: ${totalImages - errorCount} загружено, ${errorCount} ошибок`);
        resolve();
      }
    };
    
    CRITICAL_IMAGES.forEach((src) => {
      const img = new Image();
      
      img.onload = checkComplete;
      img.onerror = () => {
        errorCount++;
        console.warn(`❌ Не удалось загрузить: ${src}`);
        checkComplete(); // Продолжаем даже при ошибке
      };
      
      img.src = src;
    });
  });
};

const GlobalLoading: FC<GlobalLoadingProps> = ({ 
  children, 
  minimumLoadingTime = 1500 
}) => {
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  useEffect(() => {
    const loadImages = async () => {
      console.log('🚀 Начинаем предзагрузку изображений...');
      
      // Запускаем предзагрузку изображений и минимальное время параллельно
      // Добавляем максимальный таймаут, чтобы избежать бесконечной загрузки
      const [, ] = await Promise.all([
        Promise.race([
          forcePreloadImages(),
          new Promise(resolve => setTimeout(resolve, 5000)) // максимум 5 секунд
        ]),
        new Promise(resolve => setTimeout(resolve, minimumLoadingTime))
      ]);
      
      console.log('✅ Предзагрузка завершена, показываем приложение');
      setIsInitialLoading(false);
    };

    loadImages();
  }, [minimumLoadingTime]);

  return (
    <>
      <LoadingScreen isLoading={isInitialLoading} />
      {!isInitialLoading && children}
    </>
  );
};

export default GlobalLoading; 