import type React from 'react';
import { EnergySystem } from './EnergySystem';
import { useEnergy } from '@/hooks/useEnergy';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

/**
 * Пример использования энергетической системы
 */
export const EnergyExample: React.FC = () => {
  const { t } = useTranslation();
  const { addEnergy, progress, isCompleted } = useEnergy();

  const handleCompleteTask = async () => {
    // Симуляция выполнения задания
    const response = await addEnergy(30);
    if (response?.isCompleted) {
      alert(t('energy.example.taskCompleted', { count: String(response.completedTasks) }));
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">
        {t('energy.title')} - {t('energy.example.title')}
      </h2>
      
      {/* Основной компонент энергетической системы */}
      <EnergySystem />
      
      {/* Демонстрация API */}
      <div className="bg-gray-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3">{t('energy.example.demonstration')}</h3>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span>{t('energy.example.currentProgress')}</span>
            <span className="font-mono">{progress}/100</span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>{t('energy.example.status')}</span>
            <span className={isCompleted ? 'text-green-600' : 'text-blue-600'}>
              {isCompleted ? t('energy.completed') : t('energy.example.inProgress')}
            </span>
          </div>
        </div>
        
        <div className="mt-4 space-y-2">
          <Button
            onClick={() => void handleCompleteTask()}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          >
            {t('energy.example.taskComplete')}
          </Button>
          
          <Button
            onClick={() => void addEnergy(10)}
            variant="outline"
            className="w-full"
          >
            {t('energy.example.smallTask')}
          </Button>
        </div>
      </div>
      
      {/* Информация об API */}
      <div className="bg-blue-50 rounded-xl p-4">
        <h3 className="text-lg font-semibold mb-3 text-blue-900">
          {t('energy.example.endpoints')}
        </h3>
        
        <div className="space-y-2 text-sm text-blue-800">
          <div>
            <code className="bg-blue-100 px-2 py-1 rounded">GET /api/energy/progress</code>
            <span className="ml-2">- {t('energy.example.getProgress')}</span>
          </div>
          
          <div>
            <code className="bg-blue-100 px-2 py-1 rounded">POST /api/energy/add</code>
            <span className="ml-2">- {t('energy.example.addEnergy')}</span>
          </div>
          
          <div>
            <code className="bg-blue-100 px-2 py-1 rounded">POST /api/energy/reset</code>
            <span className="ml-2">- {t('energy.example.resetProgress')}</span>
          </div>
          
          <div>
            <code className="bg-blue-100 px-2 py-1 rounded">GET /api/user/stats</code>
            <span className="ml-2">- {t('energy.example.getUserStats')}</span>
          </div>
        </div>
      </div>
    </div>
  );
}; 