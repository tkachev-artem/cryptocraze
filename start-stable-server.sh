#!/bin/bash

# Стабильный запуск CryptoCraze с автоперезапуском туннеля

echo "🎰 CryptoCraze - Стабильный запуск с автоперезапуском"
echo "=================================================="

# Остановить все процессы
echo "🛑 Останавливаем все процессы..."
killall cloudflared node 2>/dev/null
sleep 3

# Запустить Redis если не работает
if ! pgrep redis-server > /dev/null; then
    echo "🔄 Запускаем Redis..."
    sudo systemctl start redis-server
fi

# Создать первый туннель
echo "🌐 Создаем туннель..."
cloudflared tunnel --url http://localhost:3001 > tunnel.log 2>&1 &
sleep 10

# Получить URL туннеля
TUNNEL_URL=$(grep -o 'https://[a-zA-Z0-9\-]*\.trycloudflare\.com' tunnel.log | tail -1)

if [ -n "$TUNNEL_URL" ]; then
    echo "✅ Туннель создан: $TUNNEL_URL"
    
    # Запустить сервер с правильным URL
    echo "🚀 Запускаем сервер..."
    TUNNEL_URL="$TUNNEL_URL" \
    API_URL="$TUNNEL_URL/api" \
    FRONTEND_URL="$TUNNEL_URL" \
    CORS_ORIGIN="$TUNNEL_URL" \
    GOOGLE_CALLBACK_URL="$TUNNEL_URL/api/auth/google/callback" \
    node server-dist/server/index.js > app.log 2>&1 &
    
    sleep 5
    
    # Проверить работу API
    if curl -s "$TUNNEL_URL/health" | grep -q "ok"; then
        echo "✅ API работает!"
        echo ""
        echo "🌐 РАБОЧИЕ АДРЕСА:"
        echo "📱 Основной сайт: $TUNNEL_URL"
        echo "🔧 API здоровья: $TUNNEL_URL/health"
        echo "📚 Документация: $TUNNEL_URL/api-docs"
        echo ""
        
        # Запустить автоперезапуск в фоне
        echo "🔄 Запускаем автоперезапуск туннеля..."
        nohup bash keep-tunnel-alive.sh > tunnel-keeper.log 2>&1 &
        echo "✅ Автоперезапуск активен!"
        
    else
        echo "❌ API не отвечает"
        exit 1
    fi
else
    echo "❌ Не удалось создать туннель"
    exit 1
fi