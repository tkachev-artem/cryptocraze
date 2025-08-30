# 📊 CryptoCraze Dashboard & BI Analytics - Setup Guide

## 🚀 Полная BI система готова к использованию!

### Что реализовано:

1. ✅ **5 новых таблиц BI аналитики** в БД
2. ✅ **Расширенный дашборд пользователя** с графиками
3. ✅ **Админская BI панель** с метриками
4. ✅ **Автоматическая аналитика** (batch отправка событий)
5. ✅ **API эндпоинты** для всех метрик
6. ✅ **React компоненты** в стиле проекта

---

## 🛠️ Как запустить:

### 1. Запустить миграцию БД:
```bash
# Если используете npm run db:migrate
npm run db:migrate

# Или выполните SQL файл напрямую
psql -d your_database -f drizzle/0010_add_bi_analytics_tables.sql
```

### 2. Проверить новые таблицы:
```sql
-- В PostgreSQL проверьте что таблицы созданы:
SELECT tablename FROM pg_tables WHERE schemaname = 'public' 
AND tablename LIKE '%analytics%' OR tablename LIKE '%metrics%';

-- Должно показать:
-- user_daily_stats
-- cohort_analysis  
-- user_acquisition_metrics
-- engagement_metrics
-- revenue_metrics
```

### 3. Обновить компоненты:

**Дашборд уже интегрирован в Profile.tsx:**
- Старый `ProfileDashboard` заменён на `EnhancedProfileDashboard`
- Новый дашборд показывает 6 метрик + график + топ сделки

**Админ панель доступна по адресу:**
```
/admin/analytics (требует isAdmin роль)
```

### 4. Аналитика работает автоматически:
- События отправляются пакетами по 20 штук или каждые 30 секунд
- Трекинг открытия/закрытия сделок уже добавлен
- Просмотры страниц отслеживаются автоматически

---

## 📱 Использование в коде:

### Пользовательский дашборд:
```typescript
import { useDashboard } from '../hooks/useDashboard';

const MyComponent = () => {
  const { stats, topDeals, isLoading, refreshDashboard } = useDashboard();
  
  // stats содержит все метрики пользователя
  // topDeals - лучшие 5 сделок
  // refreshDashboard() - обновить данные
};
```

### Админская аналитика:
```typescript
import { useAdminAnalytics } from '../hooks/useDashboard';

const AdminPanel = () => {
  const { 
    overview, 
    engagementData, 
    revenueData, 
    processDailyMetrics 
  } = useAdminAnalytics();
  
  // Обработать метрики за сегодня
  const handleProcessMetrics = () => processDailyMetrics();
};
```

### Отслеживание событий:
```typescript
import { analyticsService } from '../services/analyticsService';

// Автоматически трекается:
// - Открытие сделок
// - Закрытие сделок  
// - Просмотры страниц

// Дополнительное отслеживание:
analyticsService.trackFeatureUsage('pro_mode', 'activate');
analyticsService.trackEngagement('click', 'chart_button');
analyticsService.trackError(error, 'trade_component');
```

---

## 🎯 API Эндпоинты:

### Пользовательский дашборд:
```
GET /api/dashboard/stats          - Статистика пользователя
GET /api/dashboard/top-deals      - Топ 5 сделок
GET /api/dashboard/profit-chart   - Данные для графика прибыли
```

### BI аналитика (админ):
```
GET /api/admin/analytics/overview     - Обзор всех метрик
GET /api/admin/analytics/engagement   - Метрики вовлеченности  
GET /api/admin/analytics/retention    - Анализ удержания
GET /api/admin/analytics/revenue      - Метрики доходов
GET /api/admin/analytics/acquisition  - Привлечение пользователей

POST /api/admin/analytics/process-daily - Обработать метрики за день
```

### Аналитика событий:
```
POST /api/analytics/batch - Пакетная отправка событий
```

---

## 🎨 Компоненты:

### Основные:
- `EnhancedProfileDashboard` - Улучшенный дашборд пользователя
- `ProfitLossChart` - График прибыли/убытков  
- `TopDealsWidget` - Виджет лучших сделок
- `AdminAnalytics` - Админская BI панель

### Расположение:
```
src/components/dashboard/
├── EnhancedProfileDashboard.tsx
├── ProfitLossChart.tsx
└── TopDealsWidget.tsx

src/pages/Admin/
└── Analytics.tsx

src/services/
└── analyticsService.ts

src/hooks/
└── useDashboard.ts
```

---

## 📊 Метрики которые собираются:

### User Acquisition:
- Регистрации (signups)
- Первые сделки (first trades)
- Конверсия в торговлю (trade open rate)
- Время до первой сделки

### Engagement:
- DAU/WAU/MAU (активные пользователи)
- Средняя длительность сеанса
- Сделок на пользователя
- Общий объём торговли

### Retention:
- D1, D3, D7, D30 удержание
- Когорт анализ по неделям
- Churn rate (отток)

### Revenue:
- ARPU (доход на пользователя)
- ARPPU (доход на платящего пользователя)  
- Конверсия в платную подписку
- LTV (lifetime value)

---

## 🔧 Обслуживание:

### Обработка метрик:
Метрики рассчитываются автоматически, но можно запустить вручную:

**Из админ панели:** Нажать "Process Today's Metrics"

**Из PostgreSQL:**
```sql
-- Рассчитать метрики за сегодня
SELECT calculate_daily_metrics();

-- За конкретную дату  
SELECT calculate_daily_metrics('2025-01-30');
```

### Автоматические триггеры:
- При закрытии сделки автоматически обновляется `user_daily_stats`
- Функция `calculate_daily_metrics()` доступна для cron задач

### Мониторинг:
- Размер очереди аналитики: `analyticsService.getQueueSize()`
- Принудительная отправка: `analyticsService.flush()`

---

## 🎯 Результат:

### Для пользователей:
- ✅ Расширенный дашборд с 6 метриками
- ✅ Интерактивный график прибыли/убытков за 30 дней
- ✅ Топ-5 лучших сделок с доходностью
- ✅ ROI, энергия, монеты

### Для админов:
- ✅ Полная BI панель с живыми данными
- ✅ Метрики acquisition, engagement, retention, revenue
- ✅ Когорт анализ и тренды
- ✅ Обработка метрик одной кнопкой

### Техническая реализация:
- ✅ 5 новых таблиц BI с индексами и триггерами
- ✅ Batch аналитика с retry логикой
- ✅ Полная типизация TypeScript
- ✅ Следует стилю проекта CryptoCraze
- ✅ Production-ready код

**Система готова к использованию! 🎉**

---

## 🆘 Troubleshooting:

### Проблема: Миграция не применяется
**Решение:** 
```bash
# Проверить статус миграций
npm run db:studio
# Или выполнить SQL напрямую в PostgreSQL
```

### Проблема: Админ панель не открывается  
**Решение:** Проверить что пользователь имеет роль `isAdmin = true`

### Проблема: Метрики не обновляются
**Решение:** Нажать "Process Today's Metrics" в админ панели

### Проблема: График не показывает данные
**Решение:** Нужно закрыть несколько сделок для появления данных

Система полностью готова! 🚀