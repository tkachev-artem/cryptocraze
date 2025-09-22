#!/bin/bash

# ==============================================
# Автоматический деплой с Cloudflare туннелем
# ==============================================

set -e

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_DIR="$(pwd)"
ENV_FILE="$PROJECT_DIR/.env.production"
TUNNEL_LOG="$PROJECT_DIR/tunnel.log"

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

main() {
    log "🚀 Автоматический деплой с Cloudflare туннелем"
    echo "============================================="
    
    cd "$PROJECT_DIR"
    
    # 1. Проверка файлов
    log "📋 Проверка готовности..."
    
    if [ ! -f "$ENV_FILE" ]; then
        error "Файл .env.production не найден: $ENV_FILE"
    fi
    
    if [ ! -f "docker-compose.yml" ]; then
        error "Файл docker-compose.yml не найден"
    fi
    
    if ! command -v cloudflared &> /dev/null; then
        error "cloudflared не установлен"
    fi
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен"
    fi
    
    # 2. Остановить старый туннель
    log "🛑 Останавливаем старые процессы..."
     pkill -f cloudflared || true
    sleep 1
    
    # 2.1 Сброс возможных переменных окружения Cloudflare (во избежание error getting credentials)
    unset CF_TUNNEL_TOKEN CLOUDFLARE_ACCOUNT_TAG CLOUDFLARE_API_TOKEN TUNNEL_TOKEN || true
    
    # 2.2 Изолируем домашний каталог для cloudflared, чтобы он не подхватывал named-credentials
    export CF_CLEAN_HOME="$(mktemp -d)"
    
    # 3. Запустить новый туннель в фоне (QUICK tunnel, без автообновлений)
    log "🌐 Запускаем Cloudflare туннель (quick) с изолированным HOME..."
    rm -f "$TUNNEL_LOG"
    
    # Запускаем туннель в фоне и сохраняем PID
    HOME="$CF_CLEAN_HOME" cloudflared tunnel --url http://localhost:1111 --no-autoupdate > "$TUNNEL_LOG" 2>&1 &
    TUNNEL_PID=$!
    
    info "Туннель запущен с PID: $TUNNEL_PID"
    
    # 4. Ждем получения URL
    log "⏳ Ожидаем URL туннеля (максимум 60 секунд)..."
    tunnel_url=""
    
    for i in {1..60}; do
        if [ -f "$TUNNEL_LOG" ] && [ -s "$TUNNEL_LOG" ]; then
            # Ищем URL в логах
            tunnel_url=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' "$TUNNEL_LOG" | head -1 2>/dev/null || true)
            
            if [ ! -z "$tunnel_url" ]; then
                echo ""
                log "✅ Получен URL туннеля: $tunnel_url"
                break
            fi
        fi
        
        printf "\r${BLUE}[$(date +'%H:%M:%S')] Попытка $i/60...${NC}"
        sleep 1
    done
    
    if [ -z "$tunnel_url" ]; then
        echo ""
        error "Не удалось получить URL туннеля за 60 секунд. Проверьте логи: cat $TUNNEL_LOG"
    fi
    
    echo ""
    
    # 5. Обновить .env.production
    log "📝 Обновляем .env.production..."
    
    # Создаем backup
    cp "$ENV_FILE" "$ENV_FILE.backup.$(date +%Y%m%d_%H%M%S)"
    
    # Показываем старое содержимое
    info "Старое содержимое .env.production:"
    cat "$ENV_FILE"
    
    # Обновляем все URL переменные
    log "🔧 Обновляем все URL переменные..."
    
    # API_URL
    if grep -q "^API_URL=" "$ENV_FILE"; then
        sed -i.bak "s|^API_URL=.*|API_URL=$tunnel_url/api|" "$ENV_FILE"
    else
        echo "API_URL=$tunnel_url/api" >> "$ENV_FILE"
    fi
    
    # FRONTEND_URL
    if grep -q "^FRONTEND_URL=" "$ENV_FILE"; then
        sed -i.bak "s|^FRONTEND_URL=.*|FRONTEND_URL=$tunnel_url|" "$ENV_FILE"
    else
        echo "FRONTEND_URL=$tunnel_url" >> "$ENV_FILE"
    fi
    
    # CORS_ORIGIN
    if grep -q "^CORS_ORIGIN=" "$ENV_FILE"; then
        sed -i.bak "s|^CORS_ORIGIN=.*|CORS_ORIGIN=$tunnel_url|" "$ENV_FILE"
    else
        echo "CORS_ORIGIN=$tunnel_url" >> "$ENV_FILE"
    fi
    
    # ALLOWED_ORIGINS
    if grep -q "^ALLOWED_ORIGINS=" "$ENV_FILE"; then
        sed -i.bak "s|^ALLOWED_ORIGINS=.*|ALLOWED_ORIGINS=$tunnel_url,http://localhost:1111|" "$ENV_FILE"
    else
        echo "ALLOWED_ORIGINS=$tunnel_url,http://localhost:1111" >> "$ENV_FILE"
    fi
    
    # GOOGLE_CALLBACK_URL
    if grep -q "^GOOGLE_CALLBACK_URL=" "$ENV_FILE"; then
        sed -i.bak "s|^GOOGLE_CALLBACK_URL=.*|GOOGLE_CALLBACK_URL=$tunnel_url/api/auth/google/callback|" "$ENV_FILE"
    else
        echo "GOOGLE_CALLBACK_URL=$tunnel_url/api/auth/google/callback" >> "$ENV_FILE"
    fi
    
    log "✅ Все URL переменные обновлены для домена: $tunnel_url"
    
    # Показываем новое содержимое
    info "Новое содержимое .env.production:"
    cat "$ENV_FILE"
    
    # 6. Перезапустить контейнеры
    log "🔄 Перезапускаем Docker контейнеры..."
    
    # Останавливаем контейнеры
     docker compose down || warn "Контейнеры уже остановлены"
    
    # Пересобираем и запускаем
     docker compose up --build -d
    
    # 7. Ждем готовности
    log "⏳ Ожидаем готовности приложения..."
    for i in {1..30}; do
        if docker compose ps app | grep -q "Up.*healthy" 2>/dev/null; then
            echo ""
            log "✅ Приложение готово"
            break
        elif docker compose ps app | grep -q "Up" 2>/dev/null; then
            echo ""
            log "✅ Приложение запущено (healthcheck может быть еще не готов)"
            break
        fi
        
        printf "\r${BLUE}[$(date +'%H:%M:%S')] Проверка готовности $i/30...${NC}"
        sleep 2
    done
    
    echo ""
    
    # 8. Финальная проверка
    log "🔍 Финальная проверка системы..."
    
    info "📊 Статус Docker контейнеров:"
     docker compose ps
    
    echo ""
    info "🔗 Проверка доступности туннеля:"
    if curl -s --max-time 10 "$tunnel_url" > /dev/null 2>&1; then
        log "✅ Туннель работает и доступен"
    else
        warn "⚠️  Туннель может быть еще не готов, попробуйте через несколько секунд"
    fi
    
    # 9. Показать результат
    echo ""
    log "🎉 ДЕПЛОЙ ЗАВЕРШЕН УСПЕШНО!"
    echo "============================================="
    echo ""
    info "🌟 Результат:"
    echo "   📱 Публичный URL: $tunnel_url"
    echo "   🗄️  Локальный порт: http://localhost:1111"
    echo "   📊 PID туннеля: $TUNNEL_PID"
    echo ""
    info "🛠️  Управление:"
    echo "   Остановить туннель: kill $TUNNEL_PID"
    echo "   Логи туннеля: tail -f $TUNNEL_LOG"
    echo "   Статус Docker: docker compose ps"
    echo "   Остановить все: docker compose down"
    echo ""
    
    # 10. Сохраняем информацию о туннеле
    cat > tunnel_info.txt << EOL
TUNNEL_URL=$tunnel_url
TUNNEL_PID=$TUNNEL_PID
STARTED_AT=$(date)
LOG_FILE=$TUNNEL_LOG
EOL
    
    log "📄 Информация сохранена в tunnel_info.txt"
    log "✨ Готово! Приложение доступно по адресу: $tunnel_url"
}

# Обработка сигналов для graceful shutdown
trap 'error "Скрипт прерван пользователем"' INT TERM

main "$@"