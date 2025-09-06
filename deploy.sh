#!/bin/bash

# CryptoCraze Production Deployment Script
# Автоматический деплой с ngrok интеграцией и полным сохранением данных
# Использование: ./deploy.sh

set -e  # Остановка при любой ошибке

echo "🚀 CryptoCraze Production Deployment Script"
echo "=========================================="

# Цвета для вывода
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Функция для логирования
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

# Проверка зависимостей
check_dependencies() {
    log "Проверка зависимостей..."
    
    if ! command -v docker &> /dev/null; then
        error "Docker не установлен. Установите Docker и попробуйте снова."
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        error "Docker Compose не установлен. Установите Docker Compose и попробуйте снова."
    fi
    
    log "✅ Все зависимости установлены"
}

# Создание бэкапа данных
backup_data() {
    log "Создание бэкапа данных..."
    
    BACKUP_DIR="backups/$(date +%Y%m%d_%H%M%S)"
    mkdir -p "$BACKUP_DIR"
    
    # Бэкап базы данных PostgreSQL
    if docker-compose ps postgres | grep -q "Up"; then
        log "Создание бэкапа PostgreSQL..."
        docker-compose exec -T postgres pg_dump -U postgres crypto_analyzer > "$BACKUP_DIR/postgres_backup.sql" || warn "Не удалось создать бэкап PostgreSQL"
    fi
    
    # Бэкап ClickHouse данных
    if docker-compose ps clickhouse | grep -q "Up"; then
        log "Создание бэкапа ClickHouse..."
        docker-compose exec -T clickhouse clickhouse-client --query "SHOW TABLES FROM cryptocraze_analytics" > "$BACKUP_DIR/clickhouse_tables.txt" || warn "Не удалось получить список таблиц ClickHouse"
        
        # Экспорт основных таблиц
        for table in user_events ad_events trade_events; do
            docker-compose exec -T clickhouse clickhouse-client --query "SELECT * FROM cryptocraze_analytics.$table FORMAT CSVWithNames" > "$BACKUP_DIR/clickhouse_${table}.csv" 2>/dev/null || warn "Таблица $table не найдена или пуста"
        done
    fi
    
    # Бэкап Redis данных
    if docker-compose ps redis | grep -q "Up"; then
        log "Создание бэкапа Redis..."
        docker-compose exec -T redis redis-cli --rdb - > "$BACKUP_DIR/redis_backup.rdb" || warn "Не удалось создать бэкап Redis"
    fi
    
    # Бэкап файлов пользователей
    if [ -d "./uploads" ]; then
        log "Создание бэкапа файлов пользователей..."
        cp -r ./uploads "$BACKUP_DIR/" || warn "Не удалось скопировать папку uploads"
    fi
    
    log "✅ Бэкап создан в $BACKUP_DIR"
}

# Проверка конфигурации
check_config() {
    log "Проверка конфигурации..."
    
    if [ ! -f ".env.production" ]; then
        error "Файл .env.production не найден!"
    fi
    
    # Проверка обязательных переменных
    source .env.production
    
    if [ -z "$NGROK_AUTHTOKEN" ]; then
        error "NGROK_AUTHTOKEN не установлен в .env.production"
    fi
    
    if [ -z "$NGROK_DOMAIN" ]; then
        error "NGROK_DOMAIN не установлен в .env.production"
    fi
    
    if [ -z "$GOOGLE_CLIENT_ID" ]; then
        error "GOOGLE_CLIENT_ID не установлен в .env.production"
    fi
    
    if [ -z "$GOOGLE_CLIENT_SECRET" ]; then
        error "GOOGLE_CLIENT_SECRET не установлен в .env.production"
    fi
    
    log "✅ Конфигурация валидна"
    info "Ngrok домен: $NGROK_DOMAIN"
}

# Остановка существующих контейнеров
stop_containers() {
    log "Остановка существующих контейнеров..."
    
    if docker-compose ps | grep -q "Up"; then
        docker-compose down || warn "Не удалось корректно остановить контейнеры"
    fi
    
    log "✅ Контейнеры остановлены"
}

# Сборка приложения
build_application() {
    log "Сборка приложения..."
    
    # Сборка с кэшем для ускорения
    docker-compose build --parallel || error "Ошибка при сборке приложения"
    
    log "✅ Приложение собрано"
}

# Запуск сервисов
start_services() {
    log "Запуск сервисов..."
    
    # Запуск в production режиме
    NODE_ENV=production docker-compose up -d || error "Ошибка при запуске сервисов"
    
    log "✅ Сервисы запущены"
}

# Ожидание готовности сервисов
wait_for_services() {
    log "Ожидание готовности сервисов..."
    
    # Ждем пока все сервисы станут healthy
    max_attempts=30
    attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if docker-compose ps | grep -q "healthy"; then
            if [ "$(docker-compose ps --filter "health=healthy" --quiet | wc -l)" -eq "$(docker-compose ps --quiet | wc -l)" ]; then
                break
            fi
        fi
        
        info "Ожидание готовности сервисов... ($attempt/$max_attempts)"
        sleep 10
        attempt=$((attempt + 1))
    done
    
    if [ $attempt -gt $max_attempts ]; then
        error "Превышено время ожидания готовности сервисов"
    fi
    
    log "✅ Все сервисы готовы"
}

# Проверка работоспособности
health_check() {
    log "Проверка работоспособности..."
    
    source .env.production
    
    # Проверка локального API
    if ! curl -s -f http://localhost:1111/health > /dev/null; then
        error "Локальный API недоступен"
    fi
    
    # Проверка ngrok домена
    if ! curl -s -f "https://$NGROK_DOMAIN/health" > /dev/null; then
        warn "Ngrok домен недоступен, но локальный API работает"
        info "Возможно у вас уже запущена другая ngrok сессия"
    else
        log "✅ Ngrok домен работает: https://$NGROK_DOMAIN"
    fi
    
    # Проверка Google OAuth
    oauth_response=$(curl -s -I "https://$NGROK_DOMAIN/api/auth/google" | head -n 1)
    if echo "$oauth_response" | grep -q "302\|Found"; then
        log "✅ Google OAuth настроен корректно"
    else
        warn "Google OAuth может работать некорректно"
    fi
    
    log "✅ Проверка работоспособности завершена"
}

# Показ статуса
show_status() {
    log "Статус развертывания:"
    echo
    echo "🌐 URLs:"
    echo "   • Локальный: http://localhost:1111"
    
    source .env.production
    echo "   • Публичный: https://$NGROK_DOMAIN"
    echo "   • Admin панель: https://$NGROK_DOMAIN/admin/dashboard"
    echo
    echo "📊 Сервисы:"
    docker-compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}"
    echo
    echo "📝 Логи: docker-compose logs -f"
    echo "🔄 Перезапуск: docker-compose restart"
    echo "⏹️  Остановка: docker-compose down"
    echo
}

# Основной процесс деплоя
main() {
    echo
    log "Начинаем деплой CryptoCraze..."
    echo
    
    check_dependencies
    backup_data
    check_config
    stop_containers
    build_application
    start_services
    wait_for_services
    health_check
    show_status
    
    echo
    log "🎉 Деплой успешно завершен!"
    echo
    source .env.production
    echo -e "${GREEN}🚀 Приложение доступно по адресу: https://$NGROK_DOMAIN${NC}"
    echo -e "${BLUE}📊 Админка: https://$NGROK_DOMAIN/admin/dashboard${NC}"
    echo
}

# Обработка сигналов для корректного завершения
trap 'error "Деплой прерван пользователем"' INT TERM

# Запуск основного процесса
main "$@"