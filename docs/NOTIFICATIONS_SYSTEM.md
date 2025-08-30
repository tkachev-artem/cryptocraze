# Система уведомлений CryptoCraze

## Обзор

Система уведомлений предоставляет пользователям актуальную информацию о важных событиях в приложении, таких как закрытие сделок, получение наград, достижения и системные уведомления.

## Архитектура

### Frontend компоненты

1. **NotificationWidget** (`src/components/NotificationWidget.tsx`)
   - Попап с уведомлениями
   - Отображается в TopMenu
   - Показывает последние 5 уведомлений
   - Счетчик непрочитанных уведомлений

2. **Notifications Page** (`src/pages/Home/Notifications.tsx`)
   - Полная страница со всеми уведомлениями
   - Возможность отметить все как прочитанные
   - Удаление уведомлений

3. **BottomNavigation** (`src/components/ui/BottomNavigation.tsx`)
   - Счетчик непрочитанных уведомлений на иконке Home

### Redux Store

**userSlice.ts** содержит:
- Состояние уведомлений (`notifications`, `unreadCount`)
- Async thunks для API вызовов
- Селекторы для доступа к данным

### Хуки

**useNotifications** (`src/hooks/useNotifications.ts`)
- Централизованная логика работы с уведомлениями
- Автоматическое обновление каждые 30 секунд
- Методы для управления уведомлениями

### Сервисы

**NotificationService** (`src/services/notificationService.ts`)
- API методы для работы с уведомлениями
- Специализированные методы для создания разных типов уведомлений

## API Endpoints

```typescript
// Получить уведомления
GET /api/notifications

// Количество непрочитанных
GET /api/notifications/unread-count

// Отметить как прочитанное
PATCH /api/notifications/{id}/read

// Отметить все как прочитанные
PATCH /api/notifications/read-all

// Удалить уведомление
DELETE /api/notifications/{id}

// Создать уведомление (для бэкенда)
POST /api/notifications
```

## Типы уведомлений

```typescript
type NotificationType = 
  | 'daily_reward'      // Ежедневная награда
  | 'trade_closed'      // Сделка закрыта
  | 'trade_opened'      // Сделка открыта
  | 'achievement_unlocked' // Достижение разблокировано
  | 'system_alert';     // Системное уведомление
```

## Структура уведомления

```typescript
interface Notification {
  id: number;
  type: NotificationType;
  title: string;
  message?: string;
  is_active: boolean;
  is_read: boolean;
  created_at: string;
}
```

## Использование

### В компонентах

```typescript
import { useNotifications } from '../hooks/useNotifications';

const MyComponent = () => {
  const {
    activeNotifications,
    unreadCount,
    handleMarkAsRead,
    handleDeleteNotification,
    handleMarkAllAsRead,
  } = useNotifications();

  // Использование...
};
```

### Создание уведомлений на бэкенде

```typescript
import { NotificationService } from '../services/notificationService';

// Ежедневная награда
await NotificationService.createDailyRewardNotification(userId, 100);

// Закрытие сделки
await NotificationService.createTradeClosedNotification(
  userId, 
  tradeId, 
  'BTC/USDT', 
  150.50
);

// Достижение
await NotificationService.createAchievementNotification(
  userId,
  'Первая сделка',
  'Вы совершили свою первую сделку!'
);
```

## Автоматическое обновление

Система автоматически обновляет уведомления каждые 30 секунд при активном использовании компонентов с уведомлениями.

## Стилизация

Уведомления используют следующие цвета из дизайн-системы:
- Основной синий: `#0C54EA`
- Красный для счетчика: `#F6465D`
- Фон уведомлений: `#F1F7FF`

## Доступность

Все компоненты уведомлений включают:
- ARIA-атрибуты
- Поддержку клавиатурной навигации
- Семантическую разметку
- Альтернативный текст для изображений

## Тестирование

Для тестирования системы уведомлений можно использовать:

1. **Статические данные** - временные уведомления для разработки
2. **API моки** - для тестирования без бэкенда
3. **Redux DevTools** - для отладки состояния

## Планы развития

- [ ] Push-уведомления
- [ ] Email-уведомления
- [ ] Настройки уведомлений
- [ ] Группировка уведомлений
- [ ] Поиск по уведомлениям
- [ ] Экспорт уведомлений 