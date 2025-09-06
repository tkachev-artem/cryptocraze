# 🚀 CryptoCraze - Руководство по развертыванию

## 📋 Быстрый старт

### 1. Автоматический деплой (рекомендуется)
```bash
./deploy.sh
```

### 2. Бэкап данных
```bash
# Создать полный бэкап
./backup.sh

# Восстановить из бэкапа  
./backup.sh restore backups/20241205_143022.tar.gz

# Показать список бэкапов
./backup.sh list
```

### 3. Локальная разработка
```bash
# Только для разработки на localhost
./start-unified.sh
```

## 🌐 Production URLs (Ngrok)

### Публичные адреса:
- **Frontend**: https://relieved-magpie-pleasing.ngrok-free.app
- **API**: https://relieved-magpie-pleasing.ngrok-free.app/api
- **Admin панель**: https://relieved-magpie-pleasing.ngrok-free.app/admin/dashboard

### Локальные адреса:
- **Frontend**: http://localhost:1111
- **API**: http://localhost:1111/api
- **Admin панель**: http://localhost:1111/admin/dashboard

### Google OAuth настройка:
```
Authorized JavaScript origins:
https://relieved-magpie-pleasing.ngrok-free.app
http://localhost:1111

Authorized redirect URIs:
https://relieved-magpie-pleasing.ngrok-free.app/api/auth/google/callback
http://localhost:1111/api/auth/google/callback
```

---

## ✅ Что включено в деплой

### 🌍 Полная интеграция с Ngrok
- Фиксированный домен: `relieved-magpie-pleasing.ngrok-free.app`
- Автоматическое переключение OAuth callback URLs
- Graceful fallback при недоступности ngrok

### 🗄️ Все сервисы
- **PostgreSQL** - основная база данных (пользователи, сделки, награды)
- **ClickHouse** - высокопроизводительная аналитика 
- **Redis** - кэш и сессии
- **Nginx** - reverse proxy
- **Node.js App** - основное приложение

### 💾 Полное сохранение данных
- Пользователи и профили
- Все торговые сделки
- Система наград и достижений  
- Задания и их выполнение
- Аналитические данные
- Загруженные файлы (аватары)

---

## 🔧 Services & Ports

| Service     | Port | Production URL                        | Local URL |
|-------------|------|---------------------------------------|----------|
| **App**     | 1111 | https://relieved-magpie-pleasing.ngrok-free.app | http://localhost:1111 |
| PostgreSQL  | 5433 | postgresql://postgres:password@postgres:5432/crypto_analyzer | postgresql://postgres:password@localhost:5433/crypto_analyzer |
| Redis       | 6379 | redis://redis:6379 | redis://localhost:6379 |
| ClickHouse  | 8123 | http://clickhouse:8123 | http://localhost:8123 |

---

## 🐳 Docker Commands

### Автоматический деплой:
```bash
./deploy.sh
```

### Ручное управление:
```bash
# Запуск всех сервисов в production режиме
NODE_ENV=production docker-compose up -d

# Просмотр логов
docker-compose logs -f app

# Остановка всех сервисов
docker-compose down

# Пересборка и запуск
docker-compose up -d --build

# Полный сброс данных
docker-compose down -v  # Удаляет volumes тоже
```

---

## 💾 Управление данными

### Создание бэкапа
```bash
# Автоматический бэкап с текущей датой
./backup.sh

# Именованный бэкап
./backup.sh backup production_stable

# Что сохраняется:
# ✅ Все пользователи и профили
# ✅ История торговых сделок  
# ✅ Награды и достижения
# ✅ Выполненные задания
# ✅ Аналитические данные
# ✅ Загруженные файлы
# ✅ Конфигурация
```

### Восстановление данных
```bash
# Из папки
./backup.sh restore backups/20241205_143022

# Из архива
./backup.sh restore backups/20241205_143022.tar.gz
```

### Просмотр бэкапов
```bash
./backup.sh list
```

---

## 🔍 Troubleshooting

### Проблема: Ngrok не работает
```bash
# Проверить активные ngrok сессии
# Убедиться что нет других запущенных ngrok процессов
killall ngrok

# Перезапустить приложение
docker-compose restart app
```

### Проблема: База данных недоступна
```bash
# Проверить статус контейнеров
docker-compose ps

# Перезапустить базу данных
docker-compose restart postgres

# Проверить логи
docker-compose logs postgres
```

### Проблема: ClickHouse аналитика не работает
```bash
# Проверить подключение
docker-compose exec app wget -qO- http://clickhouse:8123/ping

# Перезапустить ClickHouse
docker-compose restart clickhouse

# Проверить переменные окружения
docker-compose exec app env | grep CLICKHOUSE
```

### Проблема: OAuth не работает
```bash
# Проверить что ngrok домен доступен
curl -I https://relieved-magpie-pleasing.ngrok-free.app/health

# Проверить OAuth endpoints
curl -I https://relieved-magpie-pleasing.ngrok-free.app/api/auth/google
```

---

## 🎯 Production Checklist

- [ ] Все сервисы запускаются успешно
- [ ] Frontend загружается на ngrok домене
- [ ] API отвечает на /health endpoint
- [ ] Admin dashboard доступен
- [ ] Google OAuth работает с ngrok доменом
- [ ] Миграции базы данных выполнены
- [ ] ClickHouse аналитика функционирует
- [ ] Redis кэширование работает
- [ ] Бэкап данных настроен

---

## 📱 Тестирование деплоя

1. Откройте https://relieved-magpie-pleasing.ngrok-free.app в браузере
2. Протестируйте Google OAuth авторизацию
3. Проверьте все основные функции
4. Протестируйте admin панель: https://relieved-magpie-pleasing.ngrok-free.app/admin/dashboard
5. Создайте тестовый бэкап: `./backup.sh backup test`

**🎉 Готово к production использованию! Приложение доступно по всему миру через ngrok.**