# CryptoCraze - Развертывание в Yandex Cloud

## 🚀 Быстрый старт

### Предварительные требования

1. **Сервер Yandex Cloud** с Ubuntu/Debian
2. **Node.js 20+** установлен на сервере
3. **База данных PostgreSQL** (уже настроена в Yandex Cloud)
4. **Redis** (будет установлен автоматически)
5. **Доступ к серверу** по SSH

### 1. Подготовка сервера

```bash
# Подключиться к серверу Yandex Cloud
ssh username@your-server-ip

# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установить дополнительные зависимости
sudo apt install -y git curl wget nginx certbot

# Установить PM2 для управления процессами
sudo npm install -g pm2
```

### 2. Клонирование и настройка проекта

```bash
# Клонировать репозиторий
git clone <your-repository-url> cryptocraze
cd cryptocraze

# Установить зависимости
npm install

# Скопировать файл конфигурации
cp .env.production.example .env.production
```

### 3. Настройка окружения

Отредактируйте файл `.env.production`:

```bash
nano .env.production
```

Убедитесь, что указаны правильные настройки:

```env
# Production Configuration
NODE_ENV=production
PORT=3001

# Database - Yandex Cloud PostgreSQL
DATABASE_URL=postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@rc1b-2aagh30c96ig0pkn.mdb.yandexcloud.net:6432/crypto_db?sslmode=require
PGSSLMODE=require
NODE_TLS_REJECT_UNAUTHORIZED=0

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=super-secret-production-key

# Google OAuth
GOOGLE_CLIENT_ID=707632794493-qu5mlcsn6u4sog20icp6n6ubf4325for.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# URLs будут обновлены автоматически после создания туннеля
TUNNEL_URL=https://will-be-generated.trycloudflare.com
API_URL=https://will-be-generated.trycloudflare.com/api
FRONTEND_URL=https://will-be-generated.trycloudflare.com
GOOGLE_CALLBACK_URL=https://will-be-generated.trycloudflare.com/api/auth/google/callback
```

### 4. Развертывание

```bash
# Запустить скрипт развертывания
./deploy-yandex-cloud.sh
```

Скрипт автоматически:
- ✅ Собирает приложение (фронтенд и бэкенд)
- ✅ Устанавливает production зависимости
- ✅ Запускает миграции базы данных
- ✅ Устанавливает и настраивает Redis
- ✅ Устанавливает Cloudflare Tunnel
- ✅ Запускает приложение
- ✅ Создает публичный туннель
- ✅ Обновляет конфигурацию с новыми URL

### 5. Проверка развертывания

После успешного развертывания вы увидите:

```
🌍 Application deployed successfully!
🌐 Local URL: http://localhost:3001
🌍 Public URL: https://generated-url.trycloudflare.com
📊 Health check: https://generated-url.trycloudflare.com/health
```

## 📋 Управление

### Просмотр логов
```bash
# Логи приложения
tail -f app.log

# Логи туннеля
tail -f tunnel.log
```

### Остановка приложения
```bash
./stop-deployment.sh
```

### Перезапуск
```bash
./stop-deployment.sh
./deploy-yandex-cloud.sh
```

### Обновление приложения
```bash
# Получить последние изменения
git pull origin main

# Остановить текущую версию
./stop-deployment.sh

# Развернуть обновленную версию
./deploy-yandex-cloud.sh
```

## 🔧 Troubleshooting

### Если приложение не запускается

1. **Проверить логи:**
   ```bash
   tail -n 50 app.log
   ```

2. **Проверить подключение к БД:**
   ```bash
   node -e "const { Pool } = require('pg'); const pool = new Pool({connectionString: process.env.DATABASE_URL}); pool.query('SELECT NOW()', (err, res) => { console.log(err ? err : res.rows[0]); pool.end(); });"
   ```

3. **Проверить Redis:**
   ```bash
   redis-cli ping
   ```

### Если туннель не создается

1. **Проверить логи туннеля:**
   ```bash
   tail -n 20 tunnel.log
   ```

2. **Переустановить cloudflared:**
   ```bash
   sudo apt remove cloudflared
   wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
   chmod +x cloudflared-linux-amd64
   sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
   ```

## 🌐 Настройка доменного имени (опционально)

Если у вас есть собственный домен:

1. **Создать постоянный туннель Cloudflare:**
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create cryptocraze
   cloudflared tunnel route dns cryptocraze yourdomain.com
   ```

2. **Обновить конфигурацию в `.env.production`**

3. **Обновить настройки Google OAuth Console** с новым доменом

## 🔒 Безопасность

- ✅ Приложение использует HTTPS через Cloudflare Tunnel
- ✅ База данных защищена SSL подключением
- ✅ Session secrets зашифрованы
- ✅ CORS настроен только для разрешенных доменов
- ✅ Helmet middleware для дополнительной защиты

## 📞 Поддержка

При возникновении проблем:
1. Проверьте логи: `tail -f app.log`
2. Проверьте статус процессов: `ps aux | grep node`
3. Проверьте подключение к БД и Redis
4. Убедитесь, что все зависимости установлены

Рулетка теперь работает корректно! 🎰✨