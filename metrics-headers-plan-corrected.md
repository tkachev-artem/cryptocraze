# План исправления шапок метрик - СРЕДНЕЕ ЗА ПЕРИОД

## 🎯 **КЛЮЧЕВОЕ ТРЕБОВАНИЕ:**
**ВСЕ метрики должны показывать СРЕДНЕЕ ЗА ВЫБРАННЫЙ ПЕРИОД В ФИЛЬТРЕ, а НЕ последний день!**

## 📊 **Метрики с "Avg." в шапке (ПЕРЕПИСАТЬ):**

1. **Sessions** - `avgSessionsPerUser` = среднее количество сессий на пользователя ЗА ПЕРИОД + описание: "Avg sessions per user"
2. **Screens Opened** - `avgScreensPerUser` = среднее количество экранов на пользователя ЗА ПЕРИОД + описание: "Avg screens opened per user"
3. **Session Duration** - `avgSessionDuration` = средняя длительность сессии ЗА ПЕРИОД + описание: "Avg session duration in seconds"
4. **Trading Frequency** - `avgTradingFrequency` = среднее количество сделок на пользователя ЗА ПЕРИОД + описание: "Avg trades per user"
5. **Avg Virtual Balance** - `avgBalance` = средний виртуальный баланс ЗА ПЕРИОД + описание: "Avg virtual balance"
6. **Trades/User** - `avgTradesPerUser` = среднее количество сделок на пользователя ЗА ПЕРИОД + описание: "Avg trades per user"
7. **Order Open** - `avgOrderOpen` = среднее количество открытых ордеров на пользователя ЗА ПЕРИОД + описание: "Avg orders opened per user"
8. **Order Close** - `avgOrderClose` = среднее количество закрытых ордеров на пользователя ЗА ПЕРИОД + описание: "Avg orders closed per user"
9. **Average Profit/Loss** - `avgProfitLoss` = средний профит/лосс ЗА ПЕРИОД + описание: "Avg profit/loss per trade"
10. **Average Holding Time** - `avgHoldingTime` = среднее время удержания ЗА ПЕРИОД + описание: "Avg holding time in minutes"
11. **Page Visits** - `avgPageVisits` = среднее количество посещений страниц на пользователя ЗА ПЕРИОД + описание: "Avg page visits per user"
12. **Daily Active Traders** - `avgDailyActiveTraders` = среднее количество активных трейдеров в день ЗА ПЕРИОД + описание: "Avg daily active traders"

## 📈 **Метрики с "Max." в шапке (ПЕРЕПИСАТЬ):**
13. **Max Profit Trade** - `maxProfit` = максимальный профит ЗА ПЕРИОД + описание: "Max profit from single trade"
14. **Max Loss Trade** - `maxLoss` = максимальный лосс ЗА ПЕРИОД + описание: "Max loss from single trade"

## ✅ **Метрики БЕЗ изменений (оставить как есть):**
- Win Rate, Signup Rate, Tutorial Start, Tutorial Complete, Pro Tutorial Start, Pro Tutorial Complete
- D1, D3, D7, D30, Churn Rate

## 🎯 **Что нужно сделать:**

### 1. **В `loadMetricTotal()` добавить/переписать методы для всех 14 метрик выше**
- **ВАЖНО:** Каждый метод должен считать среднее/максимум ЗА ВЕСЬ ПЕРИОД (от startDate до endDate)
- **НЕ брать только последний день!**
- Использовать агрегатные функции: `AVG()`, `MAX()`, `SUM() / COUNT(DISTINCT user_id)`

### 2. **Обновить список в `dashboardRoute.ts`:**
- Добавить все 14 метрик в массив для `getMetricTotal()`

### 3. **В `MetricsProps.tsx` обновить описания:**
- Сделать описания короче и понятнее для всех 14 метрик (использовать "Avg" вместо "Average")

### 4. **НЕ ТРОГАТЬ:**
- Существующие методы загрузки данных (`loadMetricTrend`)
- ClickHouse/PostgreSQL запросы
- Логику расчета трендов
- Метрики с процентами и retention

## 📝 **Примеры SQL для средних значений ЗА ПЕРИОД:**

```sql
-- Sessions: среднее количество сессий на пользователя за период
SELECT AVG(sessions_per_user) FROM (
  SELECT user_id, COUNT(DISTINCT session_id) as sessions_per_user
  FROM user_events 
  WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
  GROUP BY user_id
) t

-- Screens: среднее количество экранов на пользователя за период  
SELECT AVG(screens_per_user) FROM (
  SELECT user_id, COUNT(*) as screens_per_user
  FROM user_events 
  WHERE event_type = 'screen_view' AND timestamp BETWEEN '${startDate}' AND '${endDate}'
  GROUP BY user_id
) t

-- Session Duration: средняя длительность сессии за период
SELECT AVG(session_duration) FROM (
  SELECT session_id, 
    MAX(timestamp) - MIN(timestamp) as session_duration
  FROM user_events 
  WHERE timestamp BETWEEN '${startDate}' AND '${endDate}'
  GROUP BY session_id
) t

-- Max Profit: максимальный профит за период
SELECT MAX(profit) FROM deals 
WHERE closed_at BETWEEN '${startDate}' AND '${endDate}' 
  AND profit > 0
```
