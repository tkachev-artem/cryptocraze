import { useState, useEffect } from 'react';

const CRITICAL_IMAGES = [
  // Основные изображения
  '/panda.webp',
  '/avatar.webp',
  '/crown.webp',
  '/logo/logo.svg',
  '/vault.webp',
  '/accept.webp',
  
  // Навигация
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
  
  // Dashboard иконки
  '/dashboard/energy.svg',
  '/dashboard/diamond.svg', 
  '/dashboard/up.svg',
  '/dashboard/down.svg',
  
  // Торговые иконки
  '/trade/bitcoin.svg',
  '/trade/chart.svg',
  '/trade/wallet.svg',
  '/trade/money.svg',
  '/deal/up.svg',
  '/deal/down.svg',
  
  // Статистика
  '/statistics/coin.svg',
  '/statistics/money.svg',
  '/statistics/reward.svg',
  
  // Рейтинг фоны
  '/rating/rating-bg.webp',
  '/rating/top-bg.webp'
];

// Проверяет, загружено ли изображение и кэшировано ли оно
const checkImageCache = (src: string): Promise<boolean> => {
  return new Promise((resolve) => {
    const img = new Image();
    
    // Тайм-аут для проверки
    const timeout = setTimeout(() => {
      resolve(false);
    }, 3000);
    
    img.onload = () => {
      clearTimeout(timeout);
      resolve(true);
    };
    
    img.onerror = () => {
      clearTimeout(timeout);
      resolve(false);
    };
    
    img.src = src;
  });
};

export const useImageCache = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [loadedCount, setLoadedCount] = useState(0);
  const [totalCount] = useState(CRITICAL_IMAGES.length);
  const [failedImages, setFailedImages] = useState<string[]>([]);

  useEffect(() => {
    const checkAllImages = async () => {
      setIsLoading(true);
      setLoadedCount(0);
      setFailedImages([]);
      
      const results = await Promise.all(
        CRITICAL_IMAGES.map(async (src, index) => {
          const isLoaded = await checkImageCache(src);
          if (isLoaded) {
            setLoadedCount(prev => prev + 1);
          } else {
            setFailedImages(prev => [...prev, src]);
          }
          return { src, isLoaded, index };
        })
      );
      
      // Докачиваем failed изображения
      const failed = results.filter(r => !r.isLoaded);
      if (failed.length > 0) {
        console.log(`Докачиваем ${failed.length} изображений...`);
        
        // Принудительно загружаем failed изображения
        await Promise.all(
          failed.map(async ({ src }) => {
            const isLoaded = await checkImageCache(src);
            if (isLoaded) {
              setLoadedCount(prev => prev + 1);
              setFailedImages(prev => prev.filter(f => f !== src));
            }
          })
        );
      }
      
      setIsLoading(false);
      
      // Логируем результаты
      const loaded = results.filter(r => r.isLoaded).length;
      console.log(`Image cache check: ${loaded}/${CRITICAL_IMAGES.length} loaded`);
      if (failed.length > 0) {
        console.log('Attempted to reload failed images:', failed.map(f => f.src));
      }
    };

    checkAllImages();
  }, []);

  const progress = Math.round((loadedCount / totalCount) * 100);
  const isComplete = loadedCount === totalCount;
  
  return {
    isLoading,
    loadedCount,
    totalCount,
    progress,
    isComplete,
    failedImages
  };
};