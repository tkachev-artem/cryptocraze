# 🧪 Руководство по тестированию ClickHouse аналитики

## 🎯 Обзор системы

ClickHouse аналитика автоматически отслеживает:
- **События пользователей** (логины, торги, просмотры страниц)
- **Доходы от рекламы** ($0.04-$0.12 за просмотр)
- **Доходы от премиум** (полная сумма подписки)
- **Торговую аналитику** (сделки, P&L, статистика)

## 🛣️ Основные маршруты

### Admin API (требует авторизации)
```
GET /api/admin/analytics/overview-v2  - Полная аналитика dashboard
GET /api/admin/analytics/overview     - Альтернативная версия
```

### Пользовательские действия (генерируют события)
```
# Авторизация
GET /auth/google                      - Начало OAuth
GET /auth/google/callback            - Завершение OAuth (логирует login)

# Торговля  
POST /api/deals/open                 - Открытие сделки (логирует trade_open)
POST /api/deals/close                - Закрытие сделки (логирует trade_close)
GET  /api/deals/user                 - Получение сделок пользователя

# Задания с рекламой
GET  /api/tasks/user                 - Получение заданий
POST /api/tasks/complete             - Завершение задания (логирует ad revenue)

# Премиум подписки
POST /api/premium/subscribe          - Подписка на премиум (логирует premium revenue)
GET  /api/premium/status            - Статус подписки
```

## 📋 Пошаговое тестирование

### 1. Базовая проверка системы

```bash
# Запуск автоматических тестов
npx tsx scripts/test-full-clickhouse-integration.ts

# Или используйте готовый скрипт
./test-analytics.sh
```

### 2. Мануальное тестирование в браузере

#### A. Подготовка
1. Откройте http://localhost:3000
2. Авторизуйтесь через Google OAuth
3. Откройте Developer Tools (F12) → Network tab

#### B. Тестирование событий пользователя

**Тест логина:**
1. Выйдите и войдите снова
2. Проверьте в Network tab запрос к `/auth/google/callback`
3. В логах сервера должно быть: `"✅ Successfully logged event: login"`

**Тест торговых операций:**
1. Перейдите в раздел торговли
2. Откройте сделку на любой символ
3. Закройте сделку
4. В логах: `"event: trade_open"` и `"event: trade_close"`

**Тест заданий с рекламой:**
1. Перейдите в раздел "Задания"
2. Выполните задание с рекламой
3. В логах: `"Logged revenue: ad $0.XX"`

#### C. Проверка Admin Dashboard

**Получение Cookie для API:**
1. В Developer Tools перейдите в Application → Cookies
2. Скопируйте значение `session` или `auth` cookie
3. Используйте для API запросов:

```bash
# Замените YOUR_COOKIE_VALUE на реальное значение
curl -H "Cookie: session=YOUR_COOKIE_VALUE" \
     http://localhost:5000/api/admin/analytics/overview-v2 | jq .
```

### 3. Тестирование API напрямую

#### Получение Bearer токена
```bash
# После авторизации в браузере найдите в Network tab заголовок Authorization
# Скопируйте токен и используйте:

curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:5000/api/admin/analytics/overview-v2
```

#### Проверка структуры ответа
```bash
# Должен вернуть JSON с разделами:
{
  "users": {
    "total_users": 1,
    "new_users_today": 0,
    "daily_active_users": 1,
    ...
  },
  "trading": {
    "totalTrades": 5,
    "activeDeals": 1,
    "profitableTrades": 2,
    ...
  },
  "revenue": {
    "totalRevenue": "25.50",
    "premiumRevenue": "19.99",
    "adRevenue": "5.51",
    ...
  },
  "engagement": {
    "totalEvents": 45,
    "activeUsers": 1,
    "totalSessions": 3,
    ...
  }
}
```

### 4. Проверка данных в ClickHouse

```bash
# Прямые запросы к ClickHouse (если установлен клиент)
clickhouse-client --query "SELECT count(*) FROM user_events"
clickhouse-client --query "SELECT sum(revenue) FROM revenue_events"
clickhouse-client --query "SELECT count(*) FROM deals_analytics"

# Или через HTTP
curl "http://localhost:8123/?query=SELECT count(*) FROM user_events"
```

## 🎯 Что должно работать

### ✅ Ожидаемые результаты

1. **События логируются автоматически:**
   - Вход в систему → событие `login`
   - Открытие сделки → событие `trade_open`
   - Просмотр рекламы → событие `ad_watch` + revenue

2. **Dashboard показывает данные:**
   - Users: количество пользователей растёт
   - Trading: сделки и P&L обновляются
   - Revenue: доходы от рекламы и премиум
   - Engagement: события и сессии

3. **Производительность:**
   - API отвечает за < 100ms
   - События логируются за < 200ms
   - ClickHouse запросы за < 1000ms

### ❌ Проблемные сигналы

1. **События не логируются:**
   - Нет сообщений в логах сервера
   - Счётчики в dashboard не растут
   - Ошибки подключения к ClickHouse

2. **Неточные данные:**
   - Дубликаты записей
   - Неправильные суммы revenue
   - Нулевые значения метрик

3. **Медленная работа:**
   - API отвечает > 5 секунд
   - Таймауты запросов
   - Высокая нагрузка на сервер

## 🚀 Автоматизированное тестирование

```bash
# Полная проверка системы
npm run test:analytics

# Проверка производительности
npm run test:performance

# Проверка интеграции
npm run test:clickhouse
```

## 📊 Мониторинг в продакшене

1. **Логи сервера** - следите за сообщениями ClickHouse
2. **Метрики ClickHouse** - количество записей в таблицах
3. **Performance** - время ответа admin API
4. **Health checks** - доступность ClickHouse

## 🛠️ Устранение проблем

### ClickHouse недоступен
```bash
# Проверьте статус
docker ps | grep clickhouse
# или
brew services list | grep clickhouse

# Перезапуск
docker restart clickhouse-server
# или  
brew services restart clickhouse
```

### API возвращает 500
- Проверьте логи сервера
- Убедитесь что ClickHouse запущен
- Проверьте схему базы данных

### Медленные запросы
- Проверьте индексы в ClickHouse
- Оптимизируйте временные диапазоны
- Рассмотрите партиционирование

---

**Система готова к продакшену при успешном прохождении всех тестов! 🎉**