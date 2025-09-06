#!/bin/bash

# CryptoCraze Data Backup Script
# Полный бэкап всех данных: пользователи, сделки, награды, аналитика
# Использование: ./backup.sh [restore] [backup_path]

set -e

echo "💾 CryptoCraze Data Backup Script"
echo "=================================="

# Цвета
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Создание полного бэкапа
create_backup() {
    local backup_name="${1:-$(date +%Y%m%d_%H%M%S)}"
    local backup_dir="backups/$backup_name"
    
    log "Создание полного бэкапа в $backup_dir..."
    mkdir -p "$backup_dir"
    
    # Проверка что контейнеры запущены
    if ! docker-compose ps | grep -q "Up"; then
        error "Контейнеры не запущены. Запустите их командой: docker-compose up -d"
    fi
    
    # Бэкап PostgreSQL (основные данные пользователей)
    log "Бэкап PostgreSQL (пользователи, сессии, награды)..."
    docker-compose exec -T postgres pg_dump -U postgres --clean --create crypto_analyzer > "$backup_dir/postgres_full.sql" || error "Ошибка бэкапа PostgreSQL"
    
    # Бэкап отдельных таблиц PostgreSQL для удобства
    log "Экспорт таблиц PostgreSQL..."
    
    # Пользователи
    docker-compose exec -T postgres psql -U postgres -d crypto_analyzer -c "COPY users TO STDOUT WITH CSV HEADER;" > "$backup_dir/users.csv" || warn "Не удалось экспортировать таблицу users"
    
    # Сделки
    docker-compose exec -T postgres psql -U postgres -d crypto_analyzer -c "COPY deals TO STDOUT WITH CSV HEADER;" > "$backup_dir/deals.csv" || warn "Не удалось экспортировать таблицу deals"
    
    # Награды пользователей
    docker-compose exec -T postgres psql -U postgres -d crypto_analyzer -c "COPY user_rewards TO STDOUT WITH CSV HEADER;" > "$backup_dir/user_rewards.csv" || warn "Не удалось экспортировать таблицу user_rewards"
    
    # Задания
    docker-compose exec -T postgres psql -U postgres -d crypto_analyzer -c "COPY tasks TO STDOUT WITH CSV HEADER;" > "$backup_dir/tasks.csv" || warn "Не удалось экспортировать таблицу tasks"
    
    # Выполненные задания
    docker-compose exec -T postgres psql -U postgres -d crypto_analyzer -c "COPY user_tasks TO STDOUT WITH CSV HEADER;" > "$backup_dir/user_tasks.csv" || warn "Не удалось экспортировать таблицу user_tasks"
    
    # Сессии
    docker-compose exec -T postgres psql -U postgres -d crypto_analyzer -c "COPY sessions TO STDOUT WITH CSV HEADER;" > "$backup_dir/sessions.csv" || warn "Не удалось экспортировать таблицу sessions"
    
    # Бэкап ClickHouse (аналитика)
    log "Бэкап ClickHouse (аналитика и события)..."
    
    # Создание списка таблиц
    docker-compose exec -T clickhouse clickhouse-client --query "SHOW TABLES FROM cryptocraze_analytics" > "$backup_dir/clickhouse_tables.txt" || warn "Не удалось получить список таблиц ClickHouse"
    
    # Экспорт всех аналитических данных
    tables=("user_events" "ad_events" "trade_events" "screen_views" "user_actions")
    
    for table in "${tables[@]}"; do
        log "Экспорт таблицы ClickHouse: $table..."
        docker-compose exec -T clickhouse clickhouse-client --query "SELECT * FROM cryptocraze_analytics.$table FORMAT CSVWithNames" > "$backup_dir/clickhouse_${table}.csv" 2>/dev/null || warn "Таблица $table не найдена или пуста"
        
        # Также создаем структуру таблицы
        docker-compose exec -T clickhouse clickhouse-client --query "SHOW CREATE TABLE cryptocraze_analytics.$table" > "$backup_dir/clickhouse_${table}_structure.sql" 2>/dev/null || warn "Не удалось получить структуру таблицы $table"
    done
    
    # Бэкап Redis (кэш и сессии)
    log "Бэкап Redis (кэш и временные данные)..."
    docker-compose exec -T redis redis-cli --rdb - > "$backup_dir/redis_backup.rdb" || warn "Не удалось создать бэкап Redis"
    
    # Также экспорт ключей Redis в читаемом виде
    docker-compose exec -T redis redis-cli --scan > "$backup_dir/redis_keys.txt" || warn "Не удалось получить список ключей Redis"
    
    # Бэкап файлов пользователей
    log "Бэкап файлов пользователей (аватары, загрузки)..."
    if [ -d "./uploads" ]; then
        cp -r ./uploads "$backup_dir/" || warn "Не удалось скопировать папку uploads"
    fi
    
    # Бэкап конфигурации
    log "Бэкап конфигурации..."
    cp .env* "$backup_dir/" 2>/dev/null || warn "Не удалось скопировать файлы конфигурации"
    cp docker-compose.yml "$backup_dir/" || warn "Не удалось скопировать docker-compose.yml"
    cp package.json "$backup_dir/" || warn "Не удалось скопировать package.json"
    
    # Создание метаданных бэкапа
    cat > "$backup_dir/backup_info.json" << EOF
{
  "timestamp": "$(date -Iseconds)",
  "version": "$(git rev-parse HEAD 2>/dev/null || echo 'unknown')",
  "environment": "$(grep NODE_ENV .env.production 2>/dev/null || echo 'unknown')",
  "domain": "$(grep NGROK_DOMAIN .env.production 2>/dev/null || echo 'unknown')",
  "backup_type": "full",
  "components": [
    "postgresql_data",
    "clickhouse_analytics", 
    "redis_cache",
    "user_files",
    "configuration"
  ]
}
EOF
    
    # Создание архива
    log "Создание архива бэкапа..."
    tar -czf "$backup_dir.tar.gz" -C "$(dirname "$backup_dir")" "$(basename "$backup_dir")" || error "Не удалось создать архив"
    
    # Вычисление размера
    local backup_size=$(du -sh "$backup_dir.tar.gz" | cut -f1)
    
    log "✅ Полный бэкап создан:"
    info "   📁 Папка: $backup_dir"
    info "   📦 Архив: $backup_dir.tar.gz ($backup_size)"
    info "   🗓️  Время: $(date)"
    
    echo
    log "📋 Содержимое бэкапа:"
    ls -la "$backup_dir/"
}

# Восстановление из бэкапа
restore_backup() {
    local backup_path="$1"
    
    if [ -z "$backup_path" ]; then
        error "Укажите путь к бэкапу для восстановления"
    fi
    
    if [ ! -f "$backup_path" ] && [ ! -d "$backup_path" ]; then
        error "Бэкап не найден: $backup_path"
    fi
    
    warn "⚠️  ВНИМАНИЕ: Восстановление перезапишет все текущие данные!"
    read -p "Продолжить? (yes/no): " -r confirm
    
    if [ "$confirm" != "yes" ]; then
        info "Восстановление отменено"
        exit 0
    fi
    
    log "Восстановление из бэкапа: $backup_path"
    
    # Если это архив - распаковываем
    if [[ "$backup_path" == *.tar.gz ]]; then
        log "Распаковка архива..."
        local extract_dir="temp_restore_$(date +%s)"
        mkdir -p "$extract_dir"
        tar -xzf "$backup_path" -C "$extract_dir" || error "Не удалось распаковать архив"
        backup_path="$extract_dir/$(ls $extract_dir | head -1)"
    fi
    
    # Остановка сервисов для безопасного восстановления
    log "Остановка сервисов..."
    docker-compose down || warn "Не удалось остановить контейнеры"
    
    # Запуск только баз данных
    log "Запуск баз данных..."
    docker-compose up -d postgres redis clickhouse || error "Не удалось запустить базы данных"
    
    # Ждем готовности
    sleep 10
    
    # Восстановление PostgreSQL
    if [ -f "$backup_path/postgres_full.sql" ]; then
        log "Восстановление PostgreSQL..."
        docker-compose exec -T postgres dropdb -U postgres --if-exists crypto_analyzer || true
        docker-compose exec -T postgres createdb -U postgres crypto_analyzer || true
        docker-compose exec -T postgres psql -U postgres -d crypto_analyzer < "$backup_path/postgres_full.sql" || error "Ошибка восстановления PostgreSQL"
    fi
    
    # Восстановление ClickHouse
    if [ -f "$backup_path/clickhouse_tables.txt" ]; then
        log "Восстановление ClickHouse..."
        # Пересоздание базы данных
        docker-compose exec -T clickhouse clickhouse-client --query "DROP DATABASE IF EXISTS cryptocraze_analytics"
        docker-compose exec -T clickhouse clickhouse-client --query "CREATE DATABASE cryptocraze_analytics"
        
        # Восстановление структур таблиц и данных
        for structure_file in "$backup_path"/clickhouse_*_structure.sql; do
            if [ -f "$structure_file" ]; then
                log "Восстановление структуры: $(basename "$structure_file")"
                docker-compose exec -T clickhouse clickhouse-client < "$structure_file" || warn "Не удалось восстановить структуру из $structure_file"
            fi
        done
    fi
    
    # Восстановление Redis
    if [ -f "$backup_path/redis_backup.rdb" ]; then
        log "Восстановление Redis..."
        docker-compose stop redis
        docker cp "$backup_path/redis_backup.rdb" $(docker-compose ps -q redis):/data/dump.rdb || warn "Не удалось восстановить Redis"
        docker-compose start redis
    fi
    
    # Восстановление файлов
    if [ -d "$backup_path/uploads" ]; then
        log "Восстановление файлов пользователей..."
        rm -rf ./uploads
        cp -r "$backup_path/uploads" ./ || warn "Не удалось восстановить файлы пользователей"
    fi
    
    # Запуск всех сервисов
    log "Запуск всех сервисов..."
    docker-compose up -d || error "Не удалось запустить сервисы"
    
    # Очистка временных файлов
    if [[ "$1" == *.tar.gz ]] && [ -d "$extract_dir" ]; then
        rm -rf "$extract_dir"
    fi
    
    log "✅ Восстановление завершено!"
    info "Проверьте работоспособность приложения"
}

# Показать список бэкапов
list_backups() {
    log "Список доступных бэкапов:"
    echo
    
    if [ ! -d "backups" ]; then
        warn "Папка backups не найдена"
        return
    fi
    
    local count=0
    for backup in backups/*; do
        if [ -d "$backup" ] || [[ "$backup" == *.tar.gz ]]; then
            local size
            if [ -f "$backup.tar.gz" ]; then
                size=$(du -sh "$backup.tar.gz" | cut -f1)
                echo "📦 $backup.tar.gz ($size)"
            elif [ -d "$backup" ]; then
                size=$(du -sh "$backup" | cut -f1)
                echo "📁 $backup ($size)"
            fi
            
            # Показать информацию о бэкапе если есть
            if [ -f "$backup/backup_info.json" ]; then
                local timestamp=$(grep '"timestamp"' "$backup/backup_info.json" | cut -d'"' -f4)
                local version=$(grep '"version"' "$backup/backup_info.json" | cut -d'"' -f4)
                echo "   📅 $timestamp (version: ${version:0:8})"
            fi
            echo
            count=$((count + 1))
        fi
    done
    
    if [ $count -eq 0 ]; then
        warn "Бэкапы не найдены"
    else
        info "Найдено бэкапов: $count"
    fi
}

# Главная функция
main() {
    case "${1:-backup}" in
        "backup")
            create_backup "$2"
            ;;
        "restore")
            restore_backup "$2"
            ;;
        "list")
            list_backups
            ;;
        *)
            echo "Использование: $0 [backup|restore|list] [параметры]"
            echo
            echo "Команды:"
            echo "  backup [name]     - Создать полный бэкап (по умолчанию с текущей датой)"
            echo "  restore <path>    - Восстановить из бэкапа"
            echo "  list             - Показать список бэкапов"
            echo
            echo "Примеры:"
            echo "  $0 backup"
            echo "  $0 backup production_stable"
            echo "  $0 restore backups/20241205_143022"
            echo "  $0 restore backups/20241205_143022.tar.gz"
            echo "  $0 list"
            ;;
    esac
}

main "$@"