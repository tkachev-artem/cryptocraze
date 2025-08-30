# 🔋 Энергетическая система

## Обзор

Энергетическая система позволяет пользователям накапливать энергию, выполняя различные задания в приложении. Система работает по принципу прогресс-бара от 0 до 100, где при достижении 100 энергии задание считается выполненным.

## 🏗️ Архитектура

### Серверная часть
- **Эндпоинты**: `/api/energy/*`
- **Логика**: Обработка прогресса энергии, подсчет выполненных заданий
- **Хранение**: Данные пользователя в базе данных

### Клиентская часть
- **Сервис**: `EnergyService` - взаимодействие с API
- **Хук**: `useEnergy` - управление состоянием
- **Компонент**: `EnergySystem` - UI интерфейс

## 📡 API Эндпоинты

### 1. Получить прогресс энергии
```http
GET /api/energy/progress
```

**Ответ:**
```json
{
  "progress": 45
}
```

### 2. Добавить энергию
```http
POST /api/energy/add
Content-Type: application/json

{
  "amount": 25
}
```

**Ответ:**
```json
{
  "newProgress": 70,
  "isCompleted": false,
  "completedTasks": 0
}
```

### 3. Сбросить прогресс
```http
POST /api/energy/reset
```

**Ответ:**
```json
{
  "success": true
}
```

### 4. Статистика пользователя
```http
GET /api/user/stats
```

**Ответ:**
```json
{
  "balance": 10000.00,
  "freeBalance": 3000.00,
  "energyTasksBonus": 45,
  "tradesCount": 15,
  "isPremium": false
}
```

## 🎯 Использование в React

### Базовое использование

```tsx
import { useEnergy } from '@/hooks/useEnergy';

const MyComponent = () => {
  const { 
    progress, 
    addEnergy, 
    isLoading, 
    error 
  } = useEnergy();

  const handleTaskComplete = async () => {
    const response = await addEnergy(30);
    if (response?.isCompleted) {
      console.log(`Задание выполнено! Выполнено заданий: ${response.completedTasks}`);
    }
  };

  return (
    <div>
      <p>Прогресс: {progress}/100</p>
      <button onClick={handleTaskComplete}>
        Выполнить задание
      </button>
    </div>
  );
};
```

### Использование компонента

```tsx
import { EnergySystem } from '@/components/EnergySystem';

const App = () => {
  return (
    <div>
      <EnergySystem />
    </div>
  );
};
```

## 🔧 Настройка

### Типы данных

```typescript
// src/types/energy.ts
export type EnergyProgress = {
  progress: number;
};

export type EnergyAddRequest = {
  amount: number;
};

export type EnergyAddResponse = {
  newProgress: number;
  isCompleted: boolean;
  completedTasks: number;
};
```

### Сервис

```typescript
// src/services/energyService.ts
export class EnergyService {
  static async getProgress(): Promise<EnergyProgress> {
    // Реализация
  }
  
  static async addEnergy(amount: number): Promise<EnergyAddResponse> {
    // Реализация
  }
}
```

### Хук

```typescript
// src/hooks/useEnergy.ts
export const useEnergy = () => {
  // Состояние и методы
  return {
    progress,
    addEnergy,
    isLoading,
    error,
    // ... другие свойства
  };
};
```

## 🌐 Локализация

### Ключи локализации

```json
{
  "energy": {
    "title": "Энергетическая система",
    "progress": "Прогресс",
    "completed": "Завершено",
    "bonus": "Бонус заданий",
    "trades": "Сделок",
    "energy": "энергии",
    "reset": "Сбросить",
    "error": "Ошибка энергетической системы",
    "confirmReset": "Вы уверены, что хотите сбросить прогресс энергии?",
    "completedMessage": "Задание выполнено! Прогресс будет сброшен.",
    "remainingMessage": "Осталось энергии: {{remaining}}"
  }
}
```

## 🎨 UI Компоненты

### EnergySystem

Основной компонент для отображения энергетической системы:

- **Прогресс бар** - визуальное отображение прогресса
- **Кнопки действий** - добавление энергии, сброс
- **Статистика** - информация о бонусах и сделках
- **Состояния загрузки** - индикаторы загрузки и ошибок

### Особенности

- **Адаптивный дизайн** - работает на всех устройствах
- **Анимации** - плавные переходы прогресс-бара
- **Обработка ошибок** - пользовательские уведомления
- **Многоязычность** - поддержка всех языков приложения

## 🔄 Логика работы

### Алгоритм добавления энергии

1. **Получение текущего прогресса** из API
2. **Добавление энергии** к текущему значению
3. **Проверка превышения 100**:
   - Если `новый_прогресс >= 100`: задание выполнено
   - Подсчет количества выполненных заданий
   - Сброс прогресса до остатка
4. **Обновление UI** с новыми данными

### Примеры

**Добавление 30 энергии к прогрессу 20:**
- Результат: `50/100` (не завершено)

**Добавление 30 энергии к прогрессу 80:**
- Результат: `10/100` (1 задание выполнено)

**Добавление 150 энергии к прогрессу 50:**
- Результат: `0/100` (2 задания выполнено)

## 🚀 Интеграция

### Добавление в существующие компоненты

```tsx
// В компоненте Home
import { EnergySystem } from '@/components/EnergySystem';

export const Home = () => {
  return (
    <div>
      {/* Существующий контент */}
      <EnergySystem />
    </div>
  );
};
```

### Использование в заданиях

```tsx
// В компоненте задания
import { useEnergy } from '@/hooks/useEnergy';

const TaskComponent = () => {
  const { addEnergy } = useEnergy();

  const completeTask = async () => {
    // Логика выполнения задания
    await addEnergy(25); // Награда за задание
  };
};
```

## 🧪 Тестирование

### Тестирование API

```bash
# Получить прогресс
curl -X GET /api/energy/progress

# Добавить энергию
curl -X POST /api/energy/add \
  -H "Content-Type: application/json" \
  -d '{"amount": 30}'

# Сбросить прогресс
curl -X POST /api/energy/reset
```

### Тестирование компонентов

```tsx
// Тест хука
import { renderHook, act } from '@testing-library/react';
import { useEnergy } from '@/hooks/useEnergy';

test('useEnergy hook', async () => {
  const { result } = renderHook(() => useEnergy());
  
  await act(async () => {
    await result.current.addEnergy(25);
  });
  
  expect(result.current.progress).toBe(25);
});
```

## 📝 Примечания

- **Безопасность**: Все эндпоинты требуют аутентификации
- **Производительность**: Кэширование данных на клиенте
- **Масштабируемость**: Поддержка множественных пользователей
- **Мониторинг**: Логирование всех операций с энергией 