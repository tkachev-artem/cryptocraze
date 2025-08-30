import { useState, useEffect, useCallback } from 'react';
import { checkApiHealth } from '@/lib/resilientApi';
import { checkSocketHealth, ensureSocketConnection } from '@/lib/resilientSocket';

export type ApiHealthStatus = {
  apiOnline: boolean;
  socketOnline: boolean;
  lastCheck: number;
  error?: string;
}

type UseApiHealthConfig = {
  checkInterval?: number; // ms
  autoCheck?: boolean;
}

const DEFAULT_CONFIG: UseApiHealthConfig = {
  checkInterval: 30000, // 30 секунд
  autoCheck: true,
};

export const useApiHealth = (config: UseApiHealthConfig = {}) => {
  const { checkInterval, autoCheck } = { ...DEFAULT_CONFIG, ...config };
  
  const [status, setStatus] = useState<ApiHealthStatus>({
    apiOnline: false,
    socketOnline: false,
    lastCheck: 0,
  });

  const [isChecking, setIsChecking] = useState(false);

  const checkHealth = useCallback(async () => {
    setIsChecking(true);
    
    try {
      // Проверяем API и Socket параллельно
      const [apiHealthy, socketHealthy] = await Promise.allSettled([
        checkApiHealth(),
        Promise.resolve(checkSocketHealth()),
      ]);

      const newStatus: ApiHealthStatus = {
        apiOnline: apiHealthy.status === 'fulfilled' ? apiHealthy.value : false,
        socketOnline: socketHealthy.status === 'fulfilled' ? socketHealthy.value : false,
        lastCheck: Date.now(),
      };

      // Если есть проблемы, добавляем сообщение об ошибке
      if (!newStatus.apiOnline || !newStatus.socketOnline) {
        const issues = [];
        if (!newStatus.apiOnline) issues.push('API недоступен');
        if (!newStatus.socketOnline) issues.push('WebSocket отключен');
        newStatus.error = issues.join(', ');
      }

      setStatus(newStatus);
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        apiOnline: false,
        socketOnline: false,
        lastCheck: Date.now(),
        error: error instanceof Error ? error.message : 'Ошибка проверки',
      }));
    } finally {
      setIsChecking(false);
    }
  }, []);

  // Попытка восстановления соединения
  const attemptReconnect = useCallback(async () => {
    console.log('🔄 Попытка восстановления соединений...');
    
    try {
      // Пытаемся переподключить Socket
      await ensureSocketConnection();
      console.log('✅ Socket переподключен');
      
      // Перепроверяем статус
      void checkHealth();
    } catch (error) {
      console.error('❌ Не удалось восстановить соединения:', error);
    }
  }, [checkHealth]);

  // Автоматическая проверка статуса
  useEffect(() => {
    if (!autoCheck) return;

    // Первоначальная проверка
    void checkHealth();

    // Периодическая проверка
    const interval = setInterval(() => void checkHealth(), checkInterval);

    return () => { clearInterval(interval); };
  }, [autoCheck, checkHealth, checkInterval]);

  return {
    status,
    isChecking,
    checkHealth,
    attemptReconnect,
    // Вспомогательные геттеры
    isHealthy: status.apiOnline && status.socketOnline,
    hasIssues: !status.apiOnline || !status.socketOnline,
    lastCheckAgo: status.lastCheck ? Date.now() - status.lastCheck : null,
  };
};