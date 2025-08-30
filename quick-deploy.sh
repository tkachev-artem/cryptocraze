#!/bin/bash

# Быстрый деплой без полной остановки сервисов
echo "⚡ Quick deployment (hot reload)..."

PROJECT_DIR="/home/tkachevartem/cryptocraze"
cd "$PROJECT_DIR" || exit 1

# Функция логирования
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# 1. Обновление кода
log "Pulling latest code..."
git pull origin main

# 2. Установка зависимостей (только при изменении package.json)
if git diff HEAD~1 HEAD --name-only | grep -q "package\.json"; then
    log "Package.json changed, updating dependencies..."
    npm ci --production
fi

# 3. Сборка
log "Building application..."
npm run build
npm run build:server

# 4. Перезапуск backend через PM2 (graceful reload)
log "Reloading backend..."
pm2 reload cryptocraze-backend

# 5. Перезагрузка Nginx (для новых статических файлов)
log "Reloading Nginx..."
sudo nginx -t && sudo nginx -s reload

log "✅ Quick deployment completed!"