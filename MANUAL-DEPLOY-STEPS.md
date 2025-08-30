# CryptoCraze - Ручная инструкция деплоя в Yandex Cloud

## 📋 Данные для подключения
- **IP сервера:** 84.201.139.242
- **Пользователь:** ubuntu
- **Токен Yandex Cloud:** y0__xChkd6pCBjB3RMgq8D2lhQbzXneWVWnMk2HTYRC5tRT55IPrQ

## 🔑 Шаг 1: Подключение к серверу

### Вариант A: SSH с паролем (если настроен)
```bash
ssh ubuntu@84.201.139.242
```

### Вариант B: Через Yandex Cloud Console
1. Зайдите в Yandex Cloud Console
2. Найдите ваш сервер
3. Нажмите "Подключиться через браузер"

### Вариант C: Настройка SSH ключей
```bash
# Если у вас нет SSH ключей, создайте их:
ssh-keygen -t rsa -b 4096

# Скопируйте публичный ключ на сервер через Yandex Cloud Console
cat ~/.ssh/id_rsa.pub
```

## 🚀 Шаг 2: Подготовка сервера

Выполните на сервере:

```bash
# Обновить систему
sudo apt update && sudo apt upgrade -y

# Установить Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Установить дополнительные пакеты
sudo apt install -y git curl wget redis-server

# Проверить установку
node --version
npm --version
redis-cli ping
```

## 📦 Шаг 3: Загрузка проекта

### Вариант A: Загрузка архива
```bash
# На вашем локальном компьютере (создать архив):
cd /Users/artemtkacev/Desktop
tar -czf cryptocraze-deploy.tar.gz --exclude=cryptocraze/node_modules --exclude=cryptocraze/.git cryptocraze/

# Загрузить на сервер:
scp cryptocraze-deploy.tar.gz ubuntu@84.201.139.242:~/

# На сервере (распаковать):
tar -xzf cryptocraze-deploy.tar.gz
cd cryptocraze
```

### Вариант B: Через Git (если репозиторий доступен)
```bash
git clone <your-repo-url> cryptocraze
cd cryptocraze
```

## ⚙️ Шаг 4: Установка зависимостей

```bash
# Установить зависимости
npm install

# Проверить, что все файлы на месте
ls -la deploy-yandex-cloud.sh start-server.cjs .env.production
```

## 🔧 Шаг 5: Настройка конфигурации

Проверьте и отредактируйте `.env.production`:
```bash
nano .env.production
```

Убедитесь, что указана правильная база данных:
```env
DATABASE_URL=postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@rc1b-2aagh30c96ig0pkn.mdb.yandexcloud.net:6432/crypto_db?sslmode=require
```

## 🚀 Шаг 6: Запуск деплоя

```bash
# Сделать скрипт исполняемым
chmod +x deploy-yandex-cloud.sh

# Запустить деплой
./deploy-yandex-cloud.sh
```

## 📊 Ожидаемый результат

После успешного деплоя вы увидите:
```
🌍 Application deployed successfully!
🌐 Local URL: http://localhost:3001
🌍 Public URL: https://generated-url.trycloudflare.com
📊 Health check: https://generated-url.trycloudflare.com/health
```

## 🛠 Управление приложением

### Просмотр логов
```bash
tail -f app.log        # Логи приложения
tail -f tunnel.log     # Логи туннеля
```

### Остановка
```bash
./stop-deployment.sh
```

### Перезапуск
```bash
./stop-deployment.sh
./deploy-yandex-cloud.sh
```

## 🔍 Диагностика проблем

### Если Node.js не устанавливается
```bash
# Альтернативная установка через snap
sudo snap install node --classic
```

### Если база данных недоступна
```bash
# Проверить подключение к БД
node -e "
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: 'postgresql://crypto_user:zAlBIauWxJ7JM3huObuew7LYG@rc1b-2aagh30c96ig0pkn.mdb.yandexcloud.net:6432/crypto_db?sslmode=require'
});
pool.query('SELECT NOW()', (err, res) => {
  console.log(err ? 'Ошибка:', err : 'Успех:', res.rows[0]);
  pool.end();
});
"
```

### Если Redis недоступен
```bash
# Перезапустить Redis
sudo systemctl restart redis-server
sudo systemctl enable redis-server
```

## 📱 Проверка работы рулетки

После деплоя:
1. Откройте публичный URL
2. Зарегистрируйтесь через Google
3. Перейдите в раздел Rewards
4. Протестируйте рулетку

## 🎯 Готово!

Ваше приложение CryptoCraze с исправленной рулеткой развернуто в Yandex Cloud! 🎰✨

### Контакты для поддержки:
- Логи: `tail -f app.log`
- Статус: `curl http://localhost:3001/health`
- Процессы: `ps aux | grep node`