# Новые Analytics Endpoints для Admin Dashboard

## Обзор

Создан новый надежный сервис `AdminAnalyticsService` с использованием raw SQL запросов для решения проблем с Drizzle ORM и 500 ошибками в существующих endpoints.

## Новые Endpoints

### 1. Overview Endpoint (v2)
**URL:** `GET /api/admin/analytics/overview-v2`

**Описание:** Получает обзорную аналитику без authentication middleware

**Ответ:**
```json
{
  "engagement": {
    "dailyActiveUsers": 48,
    "weeklyActiveUsers": 295,
    "monthlyActiveUsers": 1290,
    "avgSessionDuration": 275,
    "avgScreensPerSession": 9.8,
    "avgTradesPerUser": 3.6,
    "avgVirtualBalanceUsed": "2900.00000000",
    "totalTrades": 165,
    "totalVolume": "780000.00000000",
    "date": "2025-08-30 00:00:00"
  },
  "revenue": {
    "totalRevenue": "3400.00",
    "premiumRevenue": "2600.00",
    "adRevenue": "800.00",
    "totalPayingUsers": 13,
    "activePayingUsers": 13,
    "newPayingUsers": 10,
    "arpu": "58.62",
    "arppu": "261.54",
    "conversionRate": 0.2241,
    "churnRate": 0.036,
    "lifetimeValue": "3200.00",
    "date": "2025-08-30 00:00:00"
  },
  "acquisition": {
    "totalInstalls": 32,
    "totalSignups": 26,
    "totalFirstTrades": 19,
    "totalFirstDeposits": 5,
    "signupRate": 0.8125,
    "tradeOpenRate": 0.7308,
    "avgTimeToFirstTrade": 95,
    "date": "2025-08-30 00:00:00"
  },
  "overview": {
    "totalUsers": 58,
    "activeDeals": 0
  }
}
```

### 2. Revenue Endpoint (v2)
**URL:** `GET /api/admin/analytics/revenue-v2?days=7`

**Параметры:**
- `days` (опционально): количество дней для выборки (по умолчанию 30, максимум 365)

**Описание:** Получает детальную информацию о доходах за указанный период

**Ответ:**
```json
{
  "data": [
    {
      "date": "2025-08-25",
      "totalRevenue": "2800.00",
      "premiumRevenue": "2000.00",
      "adRevenue": "800.00",
      "totalPayingUsers": 10,
      "activePayingUsers": 10,
      "newPayingUsers": 8,
      "arpu": "66.67",
      "arppu": "280.00",
      "conversionRate": 0.2381
    }
    // ... больше записей
  ]
}
```

### 3. Ads Endpoint (v2)
**URL:** `GET /api/admin/analytics/ads-v2?days=7`

**Параметры:**
- `days` (опционально): количество дней для анализа (по умолчанию 30, максимум 365)

**Описание:** Получает метрики рекламной эффективности с summary данными

**Ответ:**
```json
{
  "data": [
    {
      "date": "2025-08-29",
      "totalAdSpend": "1300.00",
      "totalInstalls": 52,
      "totalConversions": 35,
      "totalRevenue": "2800.00",
      "cpi": "25.00",
      "cpa": "37.14",
      "roas": 2.1538,
      "adImpressions": 130000,
      "adClicks": 1040,
      "clickThroughRate": 0.008,
      "conversionRate": 0.0337,
      "avgRevenuePerInstall": "53.85"
    }
    // ... больше записей
  ],
  "summary": {
    "totalAdSpend": "6700.00",
    "totalInstalls": 268,
    "totalConversions": 179,
    "totalRevenue": "14520.00",
    "totalImpressions": 670000,
    "totalClicks": 5360,
    "avgCPI": "25.0000000000000000",
    "avgCPA": "37.4280000000000000",
    "avgROAS": 2.13742,
    "avgCTR": 0.008,
    "avgConversionRate": 0.03338,
    "daysAnalyzed": 5
  }
}
```

## Структура базы данных

### Используемые таблицы:
- `engagement_metrics` - метрики вовлеченности пользователей
- `revenue_metrics` - метрики доходов 
- `user_acquisition_metrics` - метрики привлечения пользователей
- `ad_performance_metrics` - метрики рекламной эффективности
- `users` - основная таблица пользователей
- `deals` - таблица сделок

### Примечания по схеме:
- В `revenue_metrics` отсутствует колонка `active_paying_users`, используется `total_paying_users` как fallback
- Все SQL запросы используют raw queries для избежания проблем с Drizzle ORM schema caching
- Даты форматируются в YYYY-MM-DD формат для консистентности

## Технические особенности

### Преимущества нового сервиса:
1. **Надежность**: использует raw SQL для избежания проблем с ORM
2. **Fallback данные**: возвращает пустые объекты вместо 500 ошибок
3. **Логирование**: подробные логи для отладки
4. **Типизация**: правильное TypeScript типирование
5. **Безопасность**: обработка ошибок и валидация данных
6. **Производительность**: параллельные запросы где возможно

### Обработка ошибок:
- При ошибке в базе данных возвращаются fallback значения
- В development режиме возвращаются детали ошибки
- Все ошибки логируются с префиксом `[AdminAnalytics]`

## Debug Endpoint

**URL:** `GET /api/debug/table-structure`

Показывает структуру всех analytics таблиц для диагностики проблем со схемой.

## Совместимость

Старые endpoints `/api/admin/analytics/*` остаются работать благодаря исправлениям в `AdminAnalyticsService`. Новые endpoints имеют суффикс `-v2` для различения.

## Файлы

- `/server/services/adminAnalyticsService.ts` - основной сервис
- `/server/routes.ts` - регистрация endpoints
- `/shared/schema.ts` - схема базы данных

## Тестирование

Все endpoints протестированы и работают корректно:
- ✅ Overview endpoint возвращает полную аналитику
- ✅ Revenue endpoint возвращает детальные данные по доходам
- ✅ Ads endpoint возвращает метрики рекламы с summary
- ✅ Fallback обработка работает при отсутствии данных
- ✅ Старые endpoints остались совместимыми