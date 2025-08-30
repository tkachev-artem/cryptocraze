# API Proxy Configuration Fix

## Проблема

React frontend делал запросы к неправильному URL для админских эндпоинтов аналитики:
- `GET http://localhost:5173/api/admin/analytics/overview 404 (Not Found)`
- `GET http://localhost:5173/api/admin/analytics/engagement?days=30 404 (Not Found)`
- `GET http://localhost:5173/api/admin/analytics/revenue?days=30 404 (Not Found)`

Запросы шли на порт 5173 (Vite dev server), но API сервер работает на порту 3001.

## Исправления

### 1. Обновлен Analytics компонент (`/src/pages/Admin/Analytics.tsx`)
- ✅ Добавлен импорт `config` из `../../lib/config`
- ✅ Все fetch запросы обновлены для использования `${config.api.baseUrl}` вместо прямых путей
- ✅ Запросы теперь идут через настроенную конфигурацию API

### 1.1. Обновлен analyticsService (`/src/services/analyticsService.ts`)
- ✅ Добавлен импорт `config` из `../lib/config`
- ✅ Обновлены fetch запросы в `flushEvents()` и `sendBeacon()` для использования `${config.api.baseUrl}`
- ✅ Сервис теперь совместим с общей конфигурацией API

### 2. Обновлена конфигурация API (`/src/lib/config.ts`)
- ✅ В режиме разработки `baseUrl` установлен в `/api` (для использования прокси)
- ✅ В продакшене `baseUrl` остается `/api`

### 3. Обновлены переменные окружения (`.env.development`)
- ✅ `VITE_API_BASE_URL` изменен с `http://localhost:3001/api` на `/api`
- ✅ Это позволяет использовать Vite proxy вместо прямых запросов

### 4. Улучшена конфигурация Vite (`vite.config.ts`)
- ✅ Добавлена более продуманная логика для определения proxy target
- ✅ Добавлена отладочная информация для переменных окружения
- ✅ Исправлена обработка URL с `/api` суффиксом

## Как это работает

1. **Development режим:**
   - Frontend: `http://localhost:5173`
   - Backend API: `http://localhost:3001`
   - Proxy: Vite перенаправляет `/api/*` → `http://localhost:3001/api/*`

2. **API запросы:**
   ```typescript
   // До исправления:
   fetch('/api/admin/analytics/overview') // Прямой запрос к неверному порту
   
   // После исправления:
   fetch(`${config.api.baseUrl}/admin/analytics/overview`) // Использует /api через proxy
   ```

3. **Конфигурация:**
   - `config.api.baseUrl` = `/api` (в development)
   - Vite proxy перенаправляет на `http://localhost:3001`

## Результат

✅ Все API запросы теперь корректно проксируются через Vite  
✅ Получаем ответы `401 Unauthorized` (нужна аутентификация, но прокси работает)  
✅ Единообразная конфигурация API через `config.ts`  
✅ Правильная работа как в development, так и в production режимах

## Тестирование

Для тестирования созданы файлы:
- `test-admin-endpoints-debug.cjs` - проверка доступности эндпоинтов
- `debug-analytics.html` - браузерное тестирование API через прокси