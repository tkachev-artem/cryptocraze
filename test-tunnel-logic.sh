#!/bin/bash

# Тестовый скрипт для проверки логики обновления .env.production

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Тестирование обновления .env файла
test_env_update() {
    local test_url="https://test-domain-123.trycloudflare.com"
    local env_file=".env.production"
    
    log "🧪 Тестируем обновление .env.production..."
    
    # Создаем backup
    cp "$env_file" "$env_file.test.backup"
    
    info "Текущий API_URL:"
    grep "^API_URL=" "$env_file" || echo "API_URL не найден"
    
    # Обновляем API_URL
    if grep -q "^API_URL=" "$env_file"; then
        log "Заменяем существующий API_URL..."
        sed -i.test "s|^API_URL=.*|API_URL=$test_url/api|" "$env_file"
    else
        log "Добавляем новый API_URL..."
        echo "API_URL=$test_url/api" >> "$env_file"
    fi
    
    info "Новый API_URL:"
    grep "^API_URL=" "$env_file"
    
    # Проверяем результат
    if grep -q "^API_URL=$test_url/api$" "$env_file"; then
        log "✅ Обновление прошло успешно!"
    else
        error "❌ Обновление не удалось!"
    fi
    
    # Восстанавливаем файл
    mv "$env_file.test.backup" "$env_file"
    log "✅ Файл восстановлен из backup"
}

# Тестирование парсинга URL из лога
test_url_parsing() {
    log "🧪 Тестируем парсинг URL из лога..."
    
    # Создаем тестовый лог файл
    cat > test_tunnel.log << EOF
2025-09-07T19:00:59Z INF +--------------------------------------------------------------------------------------------+
2025-09-07T19:00:59Z INF |  Your quick Tunnel has been created! Visit it at (it may take some time to be reachable):  |
2025-09-07T19:00:59Z INF |  https://parents-drilling-seeds-defined.trycloudflare.com                                  |
2025-09-07T19:00:59Z INF +--------------------------------------------------------------------------------------------+
2025-09-07T19:00:59Z INF Cannot determine default configuration path...
EOF

    info "Содержимое тестового лога:"
    cat test_tunnel.log
    
    # Парсим URL
    tunnel_url=$(grep -o 'https://[^[:space:]]*\.trycloudflare\.com' test_tunnel.log | head -1)
    
    if [ ! -z "$tunnel_url" ]; then
        log "✅ URL успешно извлечен: $tunnel_url"
    else
        error "❌ Не удалось извлечь URL из лога"
    fi
    
    # Удаляем тестовый файл
    rm -f test_tunnel.log
}

# Тестирование проверки зависимостей
test_dependencies() {
    log "🧪 Тестируем проверку зависимостей..."
    
    info "Проверка cloudflared:"
    if command -v cloudflared &> /dev/null; then
        log "✅ cloudflared установлен: $(cloudflared --version 2>&1 | head -1)"
    else
        log "❌ cloudflared не установлен"
    fi
    
    info "Проверка docker:"
    if command -v docker &> /dev/null; then
        log "✅ docker установлен: $(docker --version)"
    else
        log "❌ docker не установлен"
    fi
    
    info "Проверка docker compose:"
    if command -v docker compose &> /dev/null || command -v docker-compose &> /dev/null; then
        log "✅ docker compose доступен"
    else
        log "❌ docker compose не доступен"
    fi
    
    info "Проверка файлов:"
    if [ -f ".env.production" ]; then
        log "✅ .env.production найден"
    else
        log "❌ .env.production не найден"
    fi
    
    if [ -f "docker-compose.yml" ]; then
        log "✅ docker-compose.yml найден"
    else
        log "❌ docker-compose.yml не найден"
    fi
}

# Запуск всех тестов
main() {
    log "🚀 Запуск тестов логики деплоя"
    echo "================================"
    
    test_dependencies
    echo ""
    
    test_url_parsing
    echo ""
    
    test_env_update
    echo ""
    
    log "🎉 Все тесты завершены!"
}

main "$@"