#!/bin/bash

echo "🔄 Перезапуск CryptoCraze сервера..."

# Найти и убить процесс tsx
echo "🛑 Останавливаем старый сервер..."
pkill -f "tsx server/index.ts" || echo "Сервер уже остановлен"

# Подождать немного
sleep 2

# Запустить новый сервер в фоне
echo "🚀 Запускаем новый сервер..."
export TUNNEL_URL=https://du-marvel-composition-northern.trycloudflare.com
export NODE_ENV=production
nohup npm run dev:server > server.log 2>&1 &

# Подождать запуска
sleep 5

echo "✅ Сервер перезапущен!"
echo "📊 Проверяем статус..."

# Проверить что сервер работает
curl -s http://localhost:3001/health | head -5

echo ""
echo "🌐 Тунель: https://du-marvel-composition-northern.trycloudflare.com"
echo "🏥 Health: https://du-marvel-composition-northern.trycloudflare.com/health"
echo "📚 API Docs: https://du-marvel-composition-northern.trycloudflare.com/api-docs"