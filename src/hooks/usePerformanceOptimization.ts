import { useEffect, useState } from 'react';

interface PerformanceMetrics {
  isLowEndDevice: boolean;
  connectionSpeed: 'slow' | 'fast' | 'unknown';
  shouldReduceAnimations: boolean;
}

export const usePerformanceOptimization = (): PerformanceMetrics => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    isLowEndDevice: false,
    connectionSpeed: 'unknown',
    shouldReduceAnimations: false
  });

  useEffect(() => {
    const detectPerformance = () => {
      // Определяем слабое устройство по количеству ядер и памяти
      const cores = navigator.hardwareConcurrency || 1;
      const memory = (navigator as any).deviceMemory || 1;
      const isLowEndDevice = cores <= 2 || memory <= 2;

      // Определяем скорость соединения
      const connection = (navigator as any).connection;
      let connectionSpeed: 'slow' | 'fast' | 'unknown' = 'unknown';
      
      if (connection) {
        const effectiveType = connection.effectiveType;
        connectionSpeed = ['slow-2g', '2g', '3g'].includes(effectiveType) ? 'slow' : 'fast';
      }

      // Проверяем предпочтения пользователя
      const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      const shouldReduceAnimations = isLowEndDevice || prefersReducedMotion || connectionSpeed === 'slow';

      setMetrics({
        isLowEndDevice,
        connectionSpeed,
        shouldReduceAnimations
      });
    };

    detectPerformance();

    // Слушаем изменения соединения
    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', detectPerformance);
      return () => connection.removeEventListener('change', detectPerformance);
    }
  }, []);

  return metrics;
};