# API Эндпоинты Уведомлений

Документация для 5 новых POST эндпоинтов системы уведомлений.

## Базовый URL
```
http://localhost:8000/api
```

## Аутентификация
Все эндпоинты требуют аутентификации пользователя через cookies.

## 1. POST /api/notifications/create

Создание обычного уведомления.

### Запрос
```http
POST /api/notifications/create
Content-Type: application/json
```

### Тело запроса
```json
{
  "type": "daily_reward",
  "title": "Ежедневная награда",
  "message": "Получите 100 монет за ежедневный вход!"
}
```

### Параметры
- `type` (string, обязательный) - тип уведомления:
  - `daily_reward` - ежедневная награда
  - `trade_closed` - закрытие сделки
  - `trade_opened` - открытие сделки
  - `achievement_unlocked` - достижение
  - `system_alert` - системное уведомление
- `title` (string, обязательный) - заголовок уведомления
- `message` (string, обязательный) - текст уведомления

### Ответ
```json
{
  "id": 1,
  "type": "daily_reward",
  "title": "Ежедневная награда",
  "message": "Получите 100 монет за ежедневный вход!",
  "is_active": true,
  "is_read": false,
  "created_at": "2024-01-15T10:30:00Z"
}
```

## 2. POST /api/notifications/trade-closed

Создание уведомления о закрытии сделки.

### Запрос
```http
POST /api/notifications/trade-closed
Content-Type: application/json
```

### Тело запроса
```json
{
  "symbol": "BTC/USDT",
  "profit": 150.50,
  "tradeId": "trade_123"
}
```

### Параметры
- `symbol` (string, обязательный) - торговая пара
- `profit` (number, обязательный) - прибыль/убыток в USDT
- `tradeId` (string, опциональный) - ID сделки

### Ответ
```json
{
  "id": 2,
  "type": "trade_closed",
  "title": "Сделка закрыта с прибылью",
  "message": "Сделка BTC/USDT закрыта. Прибыль: +150.50 USDT",
  "is_active": true,
  "is_read": false,
  "created_at": "2024-01-15T10:35:00Z"
}
```

## 3. POST /api/notifications/daily-reward

Создание уведомления о ежедневной награде.

### Запрос
```http
POST /api/notifications/daily-reward
Content-Type: application/json
```

### Тело запроса
```json
{
  "rewardAmount": 200
}
```

### Параметры
- `rewardAmount` (number, обязательный) - количество монет для награды

### Ответ
```json
{
  "id": 3,
  "type": "daily_reward",
  "title": "Ежедневная награда",
  "message": "Получите 200 монет за ежедневный вход!",
  "is_active": true,
  "is_read": false,
  "created_at": "2024-01-15T10:40:00Z"
}
```

## 4. POST /api/notifications/achievement

Создание уведомления о достижении.

### Запрос
```http
POST /api/notifications/achievement
Content-Type: application/json
```

### Тело запроса
```json
{
  "achievementName": "Первая сделка",
  "description": "Вы совершили свою первую сделку!"
}
```

### Параметры
- `achievementName` (string, обязательный) - название достижения
- `description` (string, обязательный) - описание достижения

### Ответ
```json
{
  "id": 4,
  "type": "achievement_unlocked",
  "title": "Достижение разблокировано: Первая сделка",
  "message": "Вы совершили свою первую сделку!",
  "is_active": true,
  "is_read": false,
  "created_at": "2024-01-15T10:45:00Z"
}
```

## 5. POST /api/notifications/system

Создание системного уведомления.

### Запрос
```http
POST /api/notifications/system
Content-Type: application/json
```

### Тело запроса
```json
{
  "title": "Обновление системы",
  "message": "Система будет недоступна с 02:00 до 04:00 для технического обслуживания"
}
```

### Параметры
- `title` (string, обязательный) - заголовок системного уведомления
- `message` (string, обязательный) - текст системного уведомления

### Ответ
```json
{
  "id": 5,
  "type": "system_alert",
  "title": "Обновление системы",
  "message": "Система будет недоступна с 02:00 до 04:00 для технического обслуживания",
  "is_active": true,
  "is_read": false,
  "created_at": "2024-01-15T10:50:00Z"
}
```

## Коды ошибок

### 401 Unauthorized
Пользователь не аутентифицирован.

### 400 Bad Request
Некорректные данные в запросе.

### 422 Unprocessable Entity
Ошибка валидации данных.

### 500 Internal Server Error
Внутренняя ошибка сервера.

## Примеры использования

### JavaScript/TypeScript
```typescript
// Создание обычного уведомления
const createNotification = async () => {
  const response = await fetch('http://localhost:8000/api/notifications/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      type: 'daily_reward',
      title: 'Ежедневная награда',
      message: 'Получите 100 монет за ежедневный вход!'
    }),
  });
  return response.json();
};

// Создание уведомления о закрытии сделки
const createTradeClosedNotification = async () => {
  const response = await fetch('http://localhost:8000/api/notifications/trade-closed', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      symbol: 'BTC/USDT',
      profit: 150.50,
      tradeId: 'trade_123'
    }),
  });
  return response.json();
};
```

### cURL
```bash
# Создание обычного уведомления
curl -X POST http://localhost:8000/api/notifications/create \
  -H "Content-Type: application/json" \
  -d '{
    "type": "daily_reward",
    "title": "Ежедневная награда",
    "message": "Получите 100 монет за ежедневный вход!"
  }'

# Создание уведомления о закрытии сделки
curl -X POST http://localhost:8000/api/notifications/trade-closed \
  -H "Content-Type: application/json" \
  -d '{
    "symbol": "BTC/USDT",
    "profit": 150.50,
    "tradeId": "trade_123"
  }'
```

## Интеграция с React

Для использования в React приложении рекомендуется использовать хук `useTradingWithNotifications`:

```typescript
import { useTradingWithNotifications } from '../hooks/useTradingWithNotifications';

const MyComponent = () => {
  const {
    createNotificationViaAPI,
    createTradeClosedNotificationViaAPI,
    createDailyRewardNotificationViaAPI,
    createAchievementNotificationViaAPI,
    createSystemNotificationViaAPI,
  } = useTradingWithNotifications();

  const handleCreateNotification = async () => {
    try {
      await createNotificationViaAPI({
        type: 'daily_reward',
        title: 'Ежедневная награда',
        message: 'Получите 100 монет за ежедневный вход!'
      });
    } catch (error) {
      console.error('Ошибка создания уведомления:', error);
    }
  };

  return (
    <button onClick={handleCreateNotification}>
      Создать уведомление
    </button>
  );
};
``` 