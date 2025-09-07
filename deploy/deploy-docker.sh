#!/bin/bash

# ============================================
# CryptoCraze Quick Docker Deployment
# ============================================
# Быстрое развертывание системы в Docker

set -e  # Выход при любой ошибке

echo "🚀 Быстрое развертывание CryptoCraze в Docker..."
echo "=================================================="

# Цвета для логов
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR: $1${NC}"
    exit 1
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING: $1${NC}"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO: $1${NC}"
}

# ============================================
# ПРОВЕРКА ГОТОВНОСТИ
# ============================================

log "📋 Проверка файлов..."

# Переходим в корневую директорию проекта
cd "$(dirname "$0")/.."

# Проверяем критичные файлы
if [ ! -f "docker-compose.yml" ]; then
    error "docker-compose.yml не найден!"
fi

if [ ! -f "deploy/init-database.sql" ]; then
    error "deploy/init-database.sql не найден!"
fi

if [ ! -f "deploy/clickhouse-init.sh" ]; then
    error "deploy/clickhouse-init.sh не найден!"
fi

if [ ! -f ".env.production" ]; then
    error ".env.production не найден!"
fi

# Проверяем Docker
if ! command -v docker &> /dev/null; then
    error "Docker не установлен!"
fi

if ! command -v docker compose &> /dev/null; then
    error "Docker Compose не установлен!"
fi

log "✅ Все файлы на месте"

# ============================================
# ОЧИСТКА И ЗАПУСК
# ============================================

log "🧹 Остановка старых контейнеров..."
docker compose down --remove-orphans || warn "Нет запущенных контейнеров"

log "🏗️ Сборка и запуск контейнеров..."
docker compose up --build -d

log "⏳ Ожидание готовности сервисов..."

# Функция ожидания сервиса
wait_for_service() {
    local service_name=$1
    local health_check=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if eval $health_check > /dev/null 2>&1; then
            log "✅ $service_name готов"
            return 0
        fi
        
        info "Попытка $attempt/$max_attempts: Ожидание $service_name..."
        sleep 3
        attempt=$((attempt + 1))
    done
    
    error "$service_name не готов после $max_attempts попыток"
}

# Ждем готовности всех сервисов
wait_for_service "PostgreSQL" "docker compose exec -T postgres pg_isready -U postgres -d crypto_analyzer"
wait_for_service "Redis" "docker compose exec -T redis redis-cli ping"
wait_for_service "ClickHouse" "curl -s http://localhost:8123/ping"
wait_for_service "Приложение" "curl -s http://localhost:1111/health"

# ============================================
# ФИНАЛЬНАЯ ПРОВЕРКА
# ============================================

log "🔍 Финальная проверка системы..."

echo
info "📊 Статус сервисов:"
docker compose ps

echo
info "🔗 Проверка подключений:"

# Проверяем количество таблиц в PostgreSQL
TABLES_COUNT=$(docker compose exec -T postgres psql -U postgres -d crypto_analyzer -t -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' ' || echo "0")

if [ "$TABLES_COUNT" -gt 20 ]; then
    echo "✅ PostgreSQL: $TABLES_COUNT таблиц создано"
else
    echo "⚠️ PostgreSQL: создано только $TABLES_COUNT таблиц (ожидается 27+)"
fi

# Проверяем ClickHouse
if curl -s http://localhost:8123 -d "SHOW TABLES FROM cryptocraze_analytics" | grep -q "user_events"; then
    echo "✅ ClickHouse: аналитические таблицы созданы"
else
    echo "⚠️ ClickHouse: таблицы могут отсутствовать"
fi

# Проверяем данные
echo
log "📈 Проверка начальных данных:"

# Premium планы
PREMIUM_PLANS=$(docker compose exec -T postgres psql -U postgres -d crypto_analyzer -t -c "SELECT count(*) FROM premium_plans WHERE is_active = true;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Premium планы: $PREMIUM_PLANS"

# Шаблоны заданий  
TASK_TEMPLATES=$(docker compose exec -T postgres psql -U postgres -d crypto_analyzer -t -c "SELECT count(*) FROM task_templates WHERE is_active = true;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Шаблоны заданий: $TASK_TEMPLATES"

# Типы коробок
BOX_TYPES=$(docker compose exec -T postgres psql -U postgres -d crypto_analyzer -t -c "SELECT count(*) FROM box_types WHERE is_active = true;" 2>/dev/null | tr -d ' ' || echo "0")
echo "Типы коробок: $BOX_TYPES"

# ============================================
# ЗАВЕРШЕНИЕ
# ============================================

echo
log "🎉 Развертывание завершено!"
echo "=================================================="
echo
info "🌟 Система готова:"
echo "   📱 Frontend: http://localhost:1111"
echo "   🗄️ PostgreSQL: localhost:5433"
echo "   🔄 Redis: localhost:6379"
echo "   📊 ClickHouse: http://localhost:8123"
echo
info "🛠️ Полезные команды:"
echo "   Логи: docker compose logs -f [service]"
echo "   Остановка: docker compose down"
echo "   Перезапуск: docker compose restart [service]"
echo
info "📊 Созданные функции:"
echo "   ✅ $PREMIUM_PLANS премиум плана"
echo "   ✅ $TASK_TEMPLATES шаблонов заданий"  
echo "   ✅ $BOX_TYPES типа коробок"
echo "   ✅ Рулетка (призы в коде)"
echo "   ✅ $TABLES_COUNT таблиц PostgreSQL"
echo

if [ "$TABLES_COUNT" -gt 20 ] && [ "$PREMIUM_PLANS" -gt 0 ] && [ "$TASK_TEMPLATES" -gt 10 ]; then
    log "🎯 Успешно! Все основные компоненты развернуты"
    echo
    echo "🔗 Откройте http://localhost:1111 в браузере"
else
    warn "⚠️ Некоторые компоненты могут работать неправильно"
    echo "Проверьте логи: docker compose logs"
fi

log "✨ Развертывание завершено!"