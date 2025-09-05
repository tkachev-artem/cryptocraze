import { useEffect, useState } from 'react';

export const useOrientationLock = () => {
  const [isLandscape, setIsLandscape] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Проверяем как через orientation, так и через размеры экрана
      const orientationAngle = (screen.orientation?.angle ?? (window as any).orientation ?? 0);
      const isOrientationLandscape = Math.abs(orientationAngle) === 90;
      
      // Дополнительная проверка через размеры окна
      const isWindowLandscape = window.innerWidth > window.innerHeight;
      
      const landscape = isOrientationLandscape || isWindowLandscape;
      setIsLandscape(landscape);
      
      // Логируем для отладки
      console.log(`Orientation check: angle=${orientationAngle}, windowLandscape=${isWindowLandscape}, result=${landscape}`);
    };

    // Проверяем сразу
    checkOrientation();

    // Слушаем изменения ориентации
    const events = ['orientationchange', 'resize'];
    events.forEach(event => {
      window.addEventListener(event, checkOrientation);
    });

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, checkOrientation);
      });
    };
  }, []);

  return { isLandscape };
};