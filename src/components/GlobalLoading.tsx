import type { FC } from 'react';
import { useState, useEffect } from 'react';
import LoadingScreen from './LoadingScreen';

type GlobalLoadingProps = {
  children: React.ReactNode;
  minimumLoadingTime?: number;
}

// Полный список критичных изображений для предзагрузки
const CRITICAL_IMAGES = [
  '/panda.webp',
  '/avatar.webp', 
  '/crown.webp',
  '/logo/logo.svg',
  '/vault.webp',
  '/accept.webp',
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
  '/dashboard/energy.svg',
  '/dashboard/diamond.svg',
  '/dashboard/up.svg',
  '/dashboard/down.svg',
  '/trade/bitcoin.svg',
  '/trade/chart.svg',
  '/trade/wallet.svg',
  '/trade/money.svg',
  '/deal/up.svg',
  '/deal/down.svg',
  '/statistics/coin.svg',
  '/statistics/money.svg',
  '/statistics/reward.svg',
  '/rating/rating-bg.webp',
  '/rating/top-bg.webp'
];

// Принудительная предзагрузка с Promise
const forcePreloadImages = (): Promise<void> => {
  return new Promise((resolve) => {
    let loadedCount = 0;
    const totalImages = CRITICAL_IMAGES.length;
    
    if (totalImages === 0) {
      resolve();
      return;
    }
    
    const checkComplete = () => {
      loadedCount++;
      if (loadedCount >= totalImages) {
        console.log(`✅ Все ${totalImages} изображений загружены в кэш`);
        resolve();
      }
    };
    
    CRITICAL_IMAGES.forEach((src) => {
      const img = new Image();
      
      img.onload = checkComplete;
      img.onerror = () => {
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
      const [, ] = await Promise.all([
        forcePreloadImages(),
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