# 🧪 ПОЛНОЕ РУЧНОЕ ТЕСТИРОВАНИЕ ВСЕХ МЕТРИК АДМИНКИ

## 🎯 ПОДГОТОВКА К ТЕСТИРОВАНИЮ

### Шаг 0: Начальная проверка
1. Откройте `http://localhost:5173/admin/dashboard`
2. Убедитесь что страница загрузилась  
3. Сделайте скриншот начального состояния метрик
4. Запишите начальные значения:

```
📊 НАЧАЛЬНЫЕ ЗНАЧЕНИЯ (запишите свои):
- Total Users: ___
- Tutorial Skip Rate: ___%  
- Screens Opened: ___
- Active Deals: ___
- Total Revenue: $___
- Ad Impressions: ___
- Retention D1: ___%
```

---

## 1️⃣ USER METRICS - Пользовательские метрики

### 1.1 Total Users & Daily Active Users

**ЧТО ТЕСТИРУЕМ:** Увеличение количества пользователей при новых логинах

**ДЕЙСТВИЯ:**
1. Запишите текущие значения:
   - Total Users: ___
   - Daily Active Users: ___

2. Откройте **приватное окно** браузера (Ctrl+Shift+N)

3. Перейдите на `http://localhost:5173`

4. **Войдите через Google OAuth** как новый пользователь

5. Вернитесь в обычное окно с админкой

6. **Нажмите F5** для обновления

7. **ПРОВЕРЬТЕ:**
   - Total Users увеличился на +1? ✅/❌
   - Daily Active Users увеличился на +1? ✅/❌

### 1.2 Weekly & Monthly Active Users

**ЧТО ТЕСТИРУЕМ:** Подсчет активных пользователей за период

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Weekly Active Users: ___
   - Monthly Active Users: ___

2. **Повторите вход** еще 2-3 раза в разных приватных окнах

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Weekly Active Users увеличился? ✅/❌
   - Monthly Active Users увеличился? ✅/❌

### 1.3 Retention Metrics (D1, D3, D7, D30)

**ЧТО ТЕСТИРУЕМ:** Показатели удержания пользователей

**ДЕЙСТВИЯ:**
1. Запишите текущие retention метрики:
   - Day 1 Retention: ___%
   - Day 7 Retention: ___%
   - Day 30 Retention: ___%

2. **API тест** - создайте события удержания:
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "retention_test_1", "eventType": "user_register", "eventData": {"registrationMethod": "manual_test"}}'
   ```

3. Подождите 5 секунд и обновите админку

4. **ПРОВЕРЬТЕ:**
   - Retention метрики > 0%? ✅/❌

---

## 2️⃣ TUTORIAL METRICS - Метрики туториала

### 2.1 Tutorial Completion Rate

**ЧТО ТЕСТИРУЕМ:** Процент пользователей завершивших туториал

**ДЕЙСТВИЯ:**
1. Запишите текущее значение:
   - Tutorial Completion Rate: ___%

2. Откройте новую вкладку: `http://localhost:5173/tutorial`

3. **ПРОЙДИТЕ ВЕСЬ ТУТОРИАЛ:**
   - Нажимайте "Next" на каждом шаге
   - Дойдите до последнего шага
   - Нажмите **"Finish"**

4. Вернитесь в админку, нажмите **F5**

5. **ПРОВЕРЬТЕ:**
   - Tutorial Completion Rate увеличился? ✅/❌

### 2.2 Tutorial Skip Rate

**ЧТО ТЕСТИРУЕМ:** Процент пользователей пропустивших туториал

**ДЕЙСТВИЯ:**
1. Запишите текущее значение:
   - Tutorial Skip Rate: ___%

2. Откройте новую вкладку: `http://localhost:5173/tutorial`

3. Найдите кнопку **"Skip Tutorial"** в правом верхнем углу

4. **Нажмите "Skip Tutorial"**

5. Вернитесь в админку, нажмите **F5**

6. **ПРОВЕРЬТЕ:**
   - Tutorial Skip Rate увеличился? ✅/❌

---

## 3️⃣ TRADING METRICS - Торговые метрики

### 3.1 Active Deals & Total Trades

**ЧТО ТЕСТИРУЕМ:** Подсчет активных и общих сделок

**ДЕЙСТВИЯ:**
1. Запишите текущие значения:
   - Active Deals: ___
   - Total Trades: ___

2. Перейдите на главную: `http://localhost:5173/`

3. **Откройте сделку:**
   - Выберите **BTC/USDT**
   - Установите сумму **$100**
   - Выберите направление **UP**
   - Нажмите кнопку открытия сделки

4. **Откройте еще 2-3 сделки** с разными параметрами

5. Вернитесь в админку, нажмите **F5**

6. **ПРОВЕРЬТЕ:**
   - Active Deals увеличился? ✅/❌
   - Total Trades увеличился? ✅/❌

### 3.2 Trading Users & Success Rate

**ЧТО ТЕСТИРУЕМ:** Количество торгующих пользователей и успешность

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Trading Users: ___
   - Success Rate: ___%

2. **Подождите** пока некоторые сделки закроются автоматически (2-3 минуты)

3. Или перейдите в портфолио и закройте сделки вручную

4. Обновите админку (F5)

5. **ПРОВЕРЬТЕ:**
   - Trading Users обновился? ✅/❌
   - Success Rate обновился? ✅/❌

### 3.3 Total Volume & PnL

**ЧТО ТЕСТИРУЕМ:** Общий объем торгов и прибыль/убыток

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Total Volume: $___
   - Total PnL: $___

2. **Откройте сделки на большие суммы:**
   - $500 на BTC UP
   - $300 на ETH DOWN
   - $200 на ADA UP

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Total Volume увеличился? ✅/❌
   - Total PnL изменился? ✅/❌

---

## 4️⃣ REVENUE METRICS - Доходные метрики

### 4.1 Total Revenue & Premium Revenue

**ЧТО ТЕСТИРУЕМ:** Общие доходы и доходы от премиум подписок

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Total Revenue: $___
   - Premium Revenue: $___

2. Перейдите на: `http://localhost:5173/premium`

3. **Попробуйте купить подписку** (если доступна тестовая покупка)

4. Или создайте тестовое событие:
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "revenue_test", "eventType": "premium_purchase", "eventData": {"amount": 9.99}}'
   ```

5. Обновите админку (F5)

6. **ПРОВЕРЬТЕ:**
   - Total Revenue увеличился? ✅/❌
   - Premium Revenue увеличился? ✅/❌

### 4.2 ARPU & ARPPU

**ЧТО ТЕСТИРУЕМ:** Средний доход на пользователя

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - ARPU: $___
   - ARPPU: $___

2. Добавьте больше пользователей (приватные окна + логин)

3. Добавьте больше покупок (API команды выше)

4. Обновите админку (F5)

5. **ПРОВЕРЬТЕ:**
   - ARPU пересчитался? ✅/❌
   - ARPPU пересчитался? ✅/❌

### 4.3 Paying Users & Conversion Rate

**ЧТО ТЕСТИРУЕМ:** Количество платящих пользователей и конверсия

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Paying Users: ___
   - Conversion Rate: ___%

2. Создайте еще покупки от разных пользователей:
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "paying_user_1", "eventType": "premium_purchase", "eventData": {"amount": 19.99}}'
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "paying_user_2", "eventType": "premium_purchase", "eventData": {"amount": 29.99}}'
   ```

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Paying Users увеличился? ✅/❌
   - Conversion Rate пересчитался? ✅/❌

---

## 5️⃣ ENGAGEMENT METRICS - Метрики вовлеченности

### 5.1 Screens Opened

**ЧТО ТЕСТИРУЕМ:** Количество открытых экранов/страниц

**ДЕЙСТВИЯ:**
1. Запишите значение:
   - Screens Opened: ___

2. **Переходите по страницам** (каждый переход = +1 screen):
   - `http://localhost:5173/` (главная)
   - `http://localhost:5173/pro` (про режим)
   - `http://localhost:5173/tutorial` (туториал)
   - `http://localhost:5173/admin/dashboard` (админка)
   - `http://localhost:5173/premium` (премиум)

3. После каждых 2-3 переходов обновляйте админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Screens Opened увеличивается с каждым переходом? ✅/❌

### 5.2 Total Sessions & Avg Sessions Per User

**ЧТО ТЕСТИРУЕМ:** Количество сессий и среднее на пользователя

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Total Sessions: ___
   - Avg Sessions Per User: ___

2. **Создайте новые сессии:**
   - Откройте несколько приватных окон
   - В каждом войдите как новый пользователь
   - Проведите активность на сайте

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Total Sessions увеличился? ✅/❌
   - Avg Sessions Per User пересчитался? ✅/❌

### 5.3 Avg Session Duration

**ЧТО ТЕСТИРУЕМ:** Среднее время сессии

**ДЕЙСТВИЯ:**
1. Запишите значение:
   - Avg Session Duration: ___ мин

2. **Проведите время на сайте:**
   - Оставьте вкладки открытыми на 5-10 минут
   - Переключайтесь между страницами
   - Взаимодействуйте с элементами

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Avg Session Duration изменился? ✅/❌

### 5.4 Logins

**ЧТО ТЕСТИРУЕМ:** Количество входов в систему

**ДЕЙСТВИЯ:**
1. Запишите значение:
   - Logins: ___

2. **Выполните несколько логинов:**
   - Выйдите из аккаунта (если есть кнопка выхода)
   - Войдите снова
   - Или откройте приватные окна и войдите там

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Logins увеличился? ✅/❌

---

## 6️⃣ AD METRICS - Рекламные метрики

### 6.1 Total Impressions

**ЧТО ТЕСТИРУЕМ:** Количество показов рекламы

**ДЕЙСТВИЯ:**
1. Запишите значение:
   - Total Impressions: ___

2. **API тест** (имитация показа рекламы):
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "ad_test_1", "eventType": "ad_impression", "eventData": {"adType": "banner", "placement": "header"}}'
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "ad_test_2", "eventType": "ad_impression", "eventData": {"adType": "video", "placement": "sidebar"}}'
   ```

3. Подождите 3 секунды, обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Total Impressions увеличился на 2? ✅/❌

### 6.2 Total Clicks & CTR

**ЧТО ТЕСТИРУЕМ:** Клики по рекламе и click-through rate

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Total Clicks: ___
   - Avg CTR: ___%

2. **API тест** (имитация кликов):
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "ad_test_1", "eventType": "ad_click", "eventData": {"adType": "banner"}}'
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "ad_test_3", "eventType": "ad_click", "eventData": {"adType": "video"}}'
   ```

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Total Clicks увеличился на 2? ✅/❌
   - Avg CTR пересчитался? ✅/❌

### 6.3 Total Installs & Click-to-Install Rate

**ЧТО ТЕСТИРУЕМ:** Конверсия кликов в установки

**ДЕЙСТВИЯ:**
1. Запишите значения:
   - Total Installs: ___
   - Click-to-Install Rate: ___%

2. **API тест** (имитация установок):
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "install_test_1", "eventType": "app_install", "eventData": {"platform": "web"}}'
   ```

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Total Installs увеличился? ✅/❌
   - Click-to-Install Rate пересчитался? ✅/❌

### 6.4 Ad Engagement Rate

**ЧТО ТЕСТИРУЕМ:** Уровень вовлеченности в рекламу

**ДЕЙСТВИЯ:**
1. Запишите значение:
   - Ad Engagement Rate: ___%

2. **API тест**:
   ```bash
   curl -X POST http://localhost:3001/api/test/analytics -H "Content-Type: application/json" -d '{"userId": "engagement_test", "eventType": "ad_engagement", "eventData": {"action": "video_complete", "duration": 30}}'
   ```

3. Обновите админку (F5)

4. **ПРОВЕРЬТЕ:**
   - Ad Engagement Rate пересчитался? ✅/❌

---

## 🎯 ФИНАЛЬНАЯ ПРОВЕРКА ВСЕХ МЕТРИК

### Итоговый чек-лист:

**USER METRICS:**
- [ ] Total Users работает
- [ ] Daily Active Users работает
- [ ] Weekly/Monthly Active работает
- [ ] Retention D1/D7/D30 работает

**TUTORIAL METRICS:**
- [ ] Tutorial Completion Rate работает
- [ ] Tutorial Skip Rate работает

**TRADING METRICS:**
- [ ] Active Deals работает
- [ ] Total Trades работает
- [ ] Success Rate работает
- [ ] Total Volume работает
- [ ] Total PnL работает

**REVENUE METRICS:**
- [ ] Total Revenue работает
- [ ] Premium Revenue работает
- [ ] ARPU/ARPPU работает
- [ ] Paying Users работает
- [ ] Conversion Rate работает

**ENGAGEMENT METRICS:**
- [ ] Screens Opened работает
- [ ] Total Sessions работает
- [ ] Avg Session Duration работает
- [ ] Logins работает

**AD METRICS:**
- [ ] Total Impressions работает
- [ ] Total Clicks работает
- [ ] CTR работает
- [ ] Total Installs работает
- [ ] Click-to-Install Rate работает
- [ ] Ad Engagement Rate работает

---

## 🚨 ПРОБЛЕМЫ И ИХ РЕШЕНИЯ

### Если метрики не обновляются:
1. Подождите 10-20 секунд и обновите (F5)
2. Проверьте консоль браузера (F12) на ошибки
3. Проверьте Network tab на запросы к `/api/analytics/batch`

### Если страница не загружается:
1. Проверьте что сервер запущен: `http://localhost:3001/health`
2. Проверьте логи сервера в терминале

### Если API команды не работают:
1. Убедитесь что используете правильный порт (3001)
2. Проверьте что ClickHouse работает

---

## ✅ ПОЗДРАВЛЯЕМ! 

Вы протестировали **ВСЕ 22 МЕТРИКИ** админ панели вручную! 

**Система аналитики полностью функциональна!** 🎉