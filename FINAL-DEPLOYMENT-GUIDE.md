# 🎰 CryptoCraze - Финальная инструкция деплоя в Yandex Cloud

## 📦 Готовые файлы

Архив для загрузки создан: **`../cryptocraze-deploy.tar.gz`** (6.9MB)

## 🔑 Подключение к серверу

**IP:** 84.201.139.242  
**Пользователь:** ubuntu  
**Токен:** y0__xChkd6pCBjB3RMgq8D2lhQbzXneWVWnMk2HTYRC5tRT55IPrQ

### Способы подключения:

#### 1. Через Yandex Cloud Console (Рекомендуется)
1. Зайдите в [Yandex Cloud Console](https://console.cloud.yandex.ru/)
2. Найдите ваш сервер в разделе Compute Cloud
3. Нажмите "Подключиться" → "Подключиться через браузер"

#### 2. Настройка SSH ключей
```bash
# Создать SSH ключи (если нет)
ssh-keygen -t rsa -b 4096

# Скопировать публичный ключ
cat ~/.ssh/id_rsa.pub

# Добавить ключ в Yandex Cloud Console:
# Compute Cloud → Ваш сервер → SSH ключи → Добавить ключ
```

#### 3. Через пароль (если настроен)
```bash
ssh ubuntu@84.201.139.242
```

## 🚀 Пошаговый деплой

### Шаг 1: Подготовка сервера
```bash
# Обновление системы
sudo apt update && sudo apt upgrade -y

# Установка Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установка дополнительных пакетов
sudo apt install -y git curl wget redis-server unzip

# Проверка
node --version    # должен быть v20.x.x
npm --version     # должен быть 10.x.x
redis-cli ping    # должен ответить PONG
```

### Шаг 2: Загрузка проекта

#### Вариант A: Загрузка через браузер/scp
```bash
# Если у вас настроен SSH, загрузите архив:
scp /Users/artemtkacev/Desktop/cryptocraze-deploy.tar.gz ubuntu@84.201.139.242:~/

# На сервере:
tar -xzf cryptocraze-deploy.tar.gz
cd cryptocraze
```

#### Вариант B: Прямое создание файлов
Если у вас проблемы с загрузкой, создайте файлы вручную на сервере:

```bash
mkdir -p ~/cryptocraze
cd ~/cryptocraze

# Создать основные файлы (см. содержимое ниже)
nano .env.production
nano start-server.cjs
nano deploy-yandex-cloud.sh
nano stop-deployment.sh
```

### Шаг 3: Настройка файлов

#### `.env.production`
```env
NODE_ENV=production
PORT=3001

# Database - Yandex Cloud PostgreSQL
DATABASE_URL=postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@rc1b-2aagh30c96ig0pkn.mdb.yandexcloud.net:6432/crypto_db?sslmode=require
PGSSLMODE=require
NODE_TLS_REJECT_UNAUTHORIZED=0

# Redis
REDIS_URL=redis://localhost:6379

# Security
SESSION_SECRET=super-secret-production-key

# Google OAuth
GOOGLE_CLIENT_ID=707632794493-qu5mlcsn6u4sog20icp6n6ubf4325for.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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

# URLs (будут обновлены автоматически)
TUNNEL_URL=https://taste-adventures-locate-posted.trycloudflare.com
API_URL=https://taste-adventures-locate-posted.trycloudflare.com/api
FRONTEND_URL=https://taste-adventures-locate-posted.trycloudflare.com
GOOGLE_CALLBACK_URL=https://taste-adventures-locate-posted.trycloudflare.com/api/auth/google/callback

# Features
ENABLE_REDIS_SCALING=true
ENABLE_RATE_LIMITING=true
ENABLE_SWAGGER=true
LOG_LEVEL=info
SKIP_MIGRATIONS=false
```

### Шаг 4: Установка зависимостей
```bash
# В директории cryptocraze
npm install

# Проверить, что все файлы на месте
chmod +x deploy-yandex-cloud.sh stop-deployment.sh
ls -la deploy-yandex-cloud.sh start-server.cjs .env.production
```

### Шаг 5: Запуск деплоя
```bash
# Запустить автоматический деплой
./deploy-yandex-cloud.sh
```

## 🎯 Ожидаемый результат

После успешного деплоя:
```
🌍 Application deployed successfully!
🌐 Local URL: http://localhost:3001
🌍 Public URL: https://your-tunnel-url.trycloudflare.com
📊 Health check: https://your-tunnel-url.trycloudflare.com/health
```

## 📊 Проверка работы рулетки

1. Откройте публичный URL
2. Зарегистрируйтесь через Google OAuth
3. Зайдите в раздел "Rewards"
4. Нажмите кнопку "Spin Wheel"
5. Рулетка должна крутиться и выдавать награды! 🎰

## 🛠 Управление

### Просмотр логов
```bash
tail -f app.log        # Логи приложения
tail -f tunnel.log     # Логи туннеля
```

### Остановка приложения
```bash
./stop-deployment.sh
```

### Перезапуск
```bash
./stop-deployment.sh
sleep 2
./deploy-yandex-cloud.sh
```

### Обновление приложения
```bash
# Получить новую версию (если через git)
git pull origin main

# Или загрузить новый архив и распаковать

# Перезапустить
./stop-deployment.sh
./deploy-yandex-cloud.sh
```

## 🔧 Решение проблем

### Если приложение не запускается
```bash
# Проверить логи
tail -n 50 app.log

# Проверить процессы
ps aux | grep node

# Проверить порты
netstat -tlnp | grep 3001
```

### Если база данных недоступна
```bash
# Тест подключения к БД
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@rc1b-2aagh30c96ig0pkn.mdb.yandexcloud.net:6432/crypto_db?sslmode=require'
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'Ошибка БД:' : 'БД работает:', err || res.rows[0]);
  pool.end();
});
"
```

### Если Redis недоступен
```bash
# Перезапуск Redis
sudo systemctl restart redis-server
sudo systemctl status redis-server
redis-cli ping
```

### Если туннель не создается
```bash
# Переустановка cloudflared
sudo apt remove cloudflared -y
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64
chmod +x cloudflared-linux-amd64
sudo mv cloudflared-linux-amd64 /usr/local/bin/cloudflared
cloudflared version
```

## ✅ Что исправлено

- ✅ **Рулетка крутится** - исправлена анимация CSS
- ✅ **API рулетки работает** - исправлена ошибка 500 
- ✅ **Выплаты работают** - баланс обновляется корректно
- ✅ **ES модули** - решена проблема совместимости
- ✅ **Production сборка** - оптимизирована для деплоя
- ✅ **БД Yandex Cloud** - настроено SSL подключение
- ✅ **Автоматический туннель** - публичный доступ через Cloudflare

## 🎉 Готово!

После успешного деплоя ваше приложение CryptoCraze с рабочей рулеткой будет доступно по публичному URL!

**Рулетка теперь работает корректно!** 🎰✨

### 📞 Если нужна помощь:
- Проверьте логи: `tail -f app.log`
- Статус здоровья: `curl http://localhost:3001/health`
- Перезапуск: `./stop-deployment.sh && ./deploy-yandex-cloud.sh`