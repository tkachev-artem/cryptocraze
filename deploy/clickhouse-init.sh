#!/bin/sh

# ============================================
# ClickHouse Initialization Script
# ============================================
# Автоматическое создание всех аналитических таблиц

set -e

CH_HOST="http://clickhouse:8123"
CH_AUTH="default:clickhouse123"

echo "🔄 Ожидание готовности ClickHouse..."
sleep 10

echo "📊 Инициализация ClickHouse аналитической базы данных..."

# Функция выполнения SQL команды
execute_sql() {
    local sql="$1"
    local description="$2"
    
    if curl -s -u "$CH_AUTH" "$CH_HOST" -d "$sql" > /dev/null 2>&1; then
        echo "✅ $description"
    else
        echo "⚠️ Ошибка: $description"
    fi
}

# Переключаемся на нашу базу данных
execute_sql "USE cryptocraze_analytics" "Переключение на базу cryptocraze_analytics"

# Создание основных таблиц
execute_sql "CREATE TABLE IF NOT EXISTS user_events (
    event_id String,
    user_id UInt64,
    event_type LowCardinality(String),
    event_data String,
    session_id String,
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    hour UInt8 MATERIALIZED toHour(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_type, user_id, timestamp)
TTL date + INTERVAL 2 YEAR" "Создание таблицы user_events"

execute_sql "CREATE TABLE IF NOT EXISTS deals_analytics (
    deal_id UInt64,
    user_id UInt64,
    symbol LowCardinality(String),
    direction LowCardinality(String),
    amount Decimal64(8),
    leverage UInt8,
    multiplier Decimal32(2),
    entry_price Decimal64(8),
    current_price Decimal64(8),
    pnl Decimal64(8),
    status LowCardinality(String),
    take_profit Nullable(Decimal64(8)),
    stop_loss Nullable(Decimal64(8)),
    commission Decimal64(8),
    created_at DateTime64(3),
    updated_at DateTime64(3),
    closed_at Nullable(DateTime64(3)),
    date Date MATERIALIZED toDate(created_at),
    hour UInt8 MATERIALIZED toHour(created_at),
    is_profitable UInt8 MATERIALIZED if(pnl > 0, 1, 0),
    duration_minutes Nullable(UInt64) MATERIALIZED if(closed_at IS NOT NULL, dateDiff('minute', created_at, closed_at), NULL)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, symbol, created_at)
TTL date + INTERVAL 5 YEAR" "Создание таблицы deals_analytics"

execute_sql "CREATE TABLE IF NOT EXISTS users_analytics (
    user_id UInt64,
    email String,
    name String,
    created_at DateTime64(3),
    last_login_at Nullable(DateTime64(3)),
    total_trades UInt64 DEFAULT 0,
    total_volume Decimal64(8) DEFAULT 0,
    total_pnl Decimal64(8) DEFAULT 0,
    is_premium UInt8 DEFAULT 0,
    premium_expires_at Nullable(DateTime64(3)),
    registration_date Date MATERIALIZED toDate(created_at),
    days_since_registration UInt64 MATERIALIZED dateDiff('day', created_at, now()),
    is_active_30d UInt8 DEFAULT 0,
    is_active_7d UInt8 DEFAULT 0
) ENGINE = ReplacingMergeTree(last_login_at)
PARTITION BY toYYYYMM(registration_date)
ORDER BY (registration_date, user_id)" "Создание таблицы users_analytics"

execute_sql "CREATE TABLE IF NOT EXISTS daily_user_stats (
    date Date,
    user_id UInt64,
    login_count UInt64,
    trades_opened UInt64,
    trades_closed UInt64,
    ads_watched UInt64,
    total_trade_volume Decimal64(8),
    sessions_count UInt64,
    session_duration_seconds UInt64
) ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id)
TTL date + INTERVAL 1 YEAR" "Создание таблицы daily_user_stats"

execute_sql "CREATE TABLE IF NOT EXISTS daily_metrics (
    date Date,
    total_users UInt64,
    new_users UInt64,
    active_users UInt64,
    daily_active_users UInt64,
    weekly_active_users UInt64,
    monthly_active_users UInt64,
    total_trades UInt64,
    total_volume Decimal64(8),
    total_pnl Decimal64(8),
    avg_session_duration_seconds UInt64,
    total_sessions UInt64,
    premium_users UInt64,
    new_premium_users UInt64,
    premium_revenue Decimal64(8),
    ad_revenue Decimal64(8),
    total_revenue Decimal64(8),
    arpu Decimal64(8),
    arppu Decimal64(8),
    conversion_rate Decimal32(4),
    retention_rate_1d Decimal32(4),
    retention_rate_7d Decimal32(4),
    retention_rate_30d Decimal32(4)
) ENGINE = ReplacingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY date
TTL date + INTERVAL 5 YEAR" "Создание таблицы daily_metrics"

execute_sql "CREATE TABLE IF NOT EXISTS revenue_events (
    event_id String,
    user_id UInt64,
    revenue_type LowCardinality(String),
    amount Decimal64(8),
    revenue Decimal64(8),
    currency LowCardinality(String),
    payment_method Nullable(String),
    subscription_id Nullable(String),
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    month UInt32 MATERIALIZED toYYYYMM(date)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, revenue_type, timestamp)
TTL date + INTERVAL 3 YEAR" "Создание таблицы revenue_events"

execute_sql "CREATE TABLE IF NOT EXISTS ad_events (
    event_id String,
    user_id UInt64,
    ad_type LowCardinality(String),
    ad_placement LowCardinality(String),
    event_type LowCardinality(String),
    reward_amount Nullable(Decimal64(8)),
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    session_id String,
    ip_hash String,
    user_agent_hash String
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, ad_type, timestamp)
TTL date + INTERVAL 1 YEAR" "Создание таблицы ad_events"

# Создание представлений
execute_sql "CREATE VIEW IF NOT EXISTS active_users_7d AS
SELECT 
    date,
    uniqExact(user_id) as active_users
FROM user_events
WHERE date >= today() - INTERVAL 7 DAY
GROUP BY date
ORDER BY date" "Создание представления active_users_7d"

execute_sql "CREATE VIEW IF NOT EXISTS trading_metrics_daily AS
SELECT 
    date,
    count() as total_trades,
    countIf(status = 'closed') as closed_trades,
    countIf(is_profitable = 1 AND status = 'closed') as profitable_trades,
    sum(amount) as total_volume,
    sum(pnl) as total_pnl,
    avg(pnl) as avg_pnl,
    uniqExact(user_id) as trading_users
FROM deals_analytics
WHERE date >= today() - INTERVAL 30 DAY
GROUP BY date
ORDER BY date" "Создание представления trading_metrics_daily"

execute_sql "CREATE VIEW IF NOT EXISTS kpi_dashboard AS
SELECT 
    date,
    total_users,
    new_users,
    active_users,
    total_trades,
    total_volume,
    total_revenue,
    arpu,
    arppu,
    conversion_rate
FROM daily_metrics
WHERE date >= today() - INTERVAL 90 DAY
ORDER BY date DESC" "Создание представления kpi_dashboard"

# Проверка созданных таблиц
TABLES_COUNT=$(curl -s -u "$CH_AUTH" "$CH_HOST" -d "SELECT count() FROM system.tables WHERE database = 'cryptocraze_analytics' AND engine LIKE '%MergeTree%'" | tr -d ' ')

if [ "$TABLES_COUNT" -gt 5 ]; then
    echo "✅ ClickHouse инициализирован успешно! Создано $TABLES_COUNT таблиц"
    echo "📊 ClickHouse готов для аналитики"
else
    echo "⚠️ Инициализация завершена, но некоторые таблицы могли не создаться"
fi

echo "🎉 Инициализация ClickHouse завершена!"