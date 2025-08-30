#!/bin/bash

# Скрипт для поддержания туннеля всегда активным
LOG_FILE="tunnel-keeper.log"
TUNNEL_LOG="tunnel.log"
SERVER_LOG="app.log"

echo "🚀 Запуск системы автоперезапуска туннеля..." | tee -a "$LOG_FILE"

while true; do
    echo "[$(date)] Проверяем статус туннеля..." | tee -a "$LOG_FILE"
    
    # Проверяем, работает ли cloudflared
    if ! pgrep -f "cloudflared tunnel" > /dev/null; then
        echo "[$(date)] ⚠️ Туннель не работает. Перезапускаем..." | tee -a "$LOG_FILE"
        
        # Убиваем все старые процессы
        killall cloudflared 2>/dev/null
        sleep 2
        
        # Запускаем новый туннель
        nohup cloudflared tunnel --url http://localhost:3001 > "$TUNNEL_LOG" 2>&1 &
        TUNNEL_PID=$!
        
        # Ждем создания туннеля
        sleep 10
        
        # Извлекаем URL туннеля
        NEW_URL=$(grep -o 'https://[a-zA-Z0-9\-]*\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1)
        
        if [ -n "$NEW_URL" ]; then
            echo "[$(date)] ✅ Новый туннель создан: $NEW_URL" | tee -a "$LOG_FILE"
            
            # Проверяем, работает ли сервер
            if ! pgrep -f "node.*server-dist" > /dev/null; then
                echo "[$(date)] 🔄 Перезапускаем сервер с новым URL..." | tee -a "$LOG_FILE"
                
                # Убиваем старый сервер
                pkill -f "node.*server-dist" 2>/dev/null
                sleep 2
                
                # Запускаем сервер с новыми переменными
                TUNNEL_URL="$NEW_URL" \
                API_URL="$NEW_URL/api" \
                FRONTEND_URL="$NEW_URL" \
                CORS_ORIGIN="$NEW_URL" \
                GOOGLE_CALLBACK_URL="$NEW_URL/api/auth/google/callback" \
                nohup node server-dist/server/index.js > "$SERVER_LOG" 2>&1 &
                
                echo "[$(date)] ✅ Сервер перезапущен с URL: $NEW_URL" | tee -a "$LOG_FILE"
            else
                echo "[$(date)] ℹ️ Сервер уже работает" | tee -a "$LOG_FILE"
            fi
        else
            echo "[$(date)] ❌ Не удалось получить URL туннеля" | tee -a "$LOG_FILE"
        fi
    else
        echo "[$(date)] ✅ Туннель работает" | tee -a "$LOG_FILE"
    fi
    
    # Проверяем каждые 30 секунд
    sleep 30
done