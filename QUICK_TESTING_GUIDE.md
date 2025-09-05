# 🚀 Быстрая Схема Проверки Admin Dashboard

## ⚡ Автотесты (2 минуты)
```bash
# 1. Запустить автотесты
node tests/admin-dashboard.test.js

# 2. Проверить ключевые метрики через API  
curl -s "http://localhost:3001/api/admin/analytics/overview-v2" | jq '{users: .users.total_users, tutorial: .engagement.tutorialSkipRate, retention: .users.retention_d1, ads: .adMetrics.totalImpressions}'
```

---

## 🖱️ Пошаговая Схема Ручной Проверки

### Шаг 1: Открыть Admin Dashboard
```
1. Браузер → http://localhost:5173
2. Логин через Google OAuth  
3. Перейти → http://localhost:5173/admin/dashboard
4. ✅ Проверить: страница загрузилась, метрики отображаются
```

### Шаг 2: Tutorial Metrics 
```
1. Новая вкладка → http://localhost:5173/tutorial
2. Нажать "Skip Tutorial" (правый верх)
3. Вернуться в админку → F5 обновить
4. ✅ Проверить: "Tutorial Skip Rate" увеличился
```

### Шаг 3: Screen Views
```
1. Кликать по разным страницам:
   - http://localhost:5173/ (главная)
   - http://localhost:5173/pro (про режим)
   - http://localhost:5173/tutorial (туториал)
2. Админка → F5 обновить
3. ✅ Проверить: "Screens Opened" увеличилось
```

### Шаг 4: Trading Metrics
```
1. Главная страница → http://localhost:5173/
2. Выбрать BTC → сумма $100 → направление UP
3. Нажать кнопку торговли
4. Админка → F5 обновить  
5. ✅ Проверить: "Active Deals" и "Total Trades" увеличились
```

### Шаг 5: User Metrics
```
1. Новое приватное окно браузера
2. Войти как новый пользователь
3. Админка → F5 обновить
4. ✅ Проверить: "Total Users" и "Daily Active Users" +1
```

---

## 📊 Контрольные Точки (что должно работать)

| Метрика | Где смотреть | Как тестировать | Ожидаемый результат |
|---------|--------------|----------------|-------------------|
| **Tutorial Skip Rate** | Tutorial Metrics блок | Пропустить туториал | Увеличивается % |
| **Tutorial Completion** | Tutorial Metrics блок | Пройти туториал полностью | Увеличивается % |
| **Total Users** | Главная карточка | Новый логин | +1 пользователь |
| **Active Deals** | Главная карточка | Открыть сделку | +1 сделка |
| **Screens Opened** | Engagement блок | Переходы по страницам | +1 за переход |
| **Retention D1** | User Retention блок | Активность на следующий день | % > 0 |
| **Ad Impressions** | Ad Performance блок | API команда | +1 показ |
| **Session Duration** | Engagement блок | Провести время на сайте | Среднее время |

---

## 🎯 API Команды для Быстрого Тестирования

### Создать тестовые события:
```bash
# Tutorial skip
curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "test1", "eventType": "tutorial_progress", "eventData": {"action": "skip"}}'

# Ad impression  
curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "test2", "eventType": "ad_impression", "eventData": {"adType": "banner"}}'

# Screen view
curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "test3", "eventType": "screen_view", "eventData": {"screen": "/test"}}'
```

### Проверить результаты:
```bash  
# Все метрики
curl -s "http://localhost:3001/api/admin/analytics/overview-v2" | jq .

# Только важные
curl -s "http://localhost:3001/api/admin/analytics/overview-v2" | jq '{tutorial: .engagement.tutorialSkipRate, screens: .engagement.screensOpened, ads: .adMetrics.totalImpressions}'
```

---

## ⚡ 30-секундная Проверка

1. **Автотест**: `node tests/admin-dashboard.test.js`
2. **API проверка**: `curl -s "http://localhost:3001/api/admin/analytics/overview-v2" | jq '.engagement.tutorialSkipRate'`
3. **UI проверка**: открыть `http://localhost:5173/admin/dashboard`

Если все 3 пункта работают - система полностью функциональна! ✅

---

## 🔍 Диагностика проблем

### Если метрики не обновляются:
1. Проверить логи сервера на `[Analytics Batch]` сообщения
2. Открыть DevTools → Network → искать запросы к `/api/analytics/batch`
3. Проверить ClickHouse: `curl -s "http://localhost:3001/api/admin/clickhouse/health"`

### Если страница не загружается:
1. Проверить что сервер запущен: `http://localhost:3001/health`
2. Проверить что фронтенд запущен: `http://localhost:5173`
3. Проверить логин через Google OAuth

### Если медленно работает:
1. Подождать 10-20 секунд (ClickHouse обрабатывает данные)
2. Проверить размер базы данных
3. Очистить тестовые данные если их много