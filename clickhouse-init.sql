-- ============================================
-- ClickHouse Analytics Database Initialization
-- ============================================
-- Высокопроизводительная аналитическая база для CryptoCraze
-- Создание базы данных и всех необходимых таблиц

-- Создание базы данных
CREATE DATABASE IF NOT EXISTS cryptocraze_analytics;
USE cryptocraze_analytics;

-- ============================================
-- ОСНОВНЫЕ АНАЛИТИЧЕСКИЕ ТАБЛИЦЫ
-- ============================================

-- Таблица событий пользователей (основная таблица для всех событий)
CREATE TABLE IF NOT EXISTS user_events (
    event_id String,
    user_id UInt64,
    event_type LowCardinality(String),
    event_data String, -- JSON string
    session_id String,
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    hour UInt8 MATERIALIZED toHour(timestamp)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, event_type, user_id, timestamp)
TTL date + INTERVAL 2 YEAR; -- Хранить данные 2 года

-- Таблица сделок (копия из основной БД с аналитическими индексами)
CREATE TABLE IF NOT EXISTS deals_analytics (
    deal_id UInt64,
    user_id UInt64,
    symbol LowCardinality(String),
    direction LowCardinality(String), -- 'up' or 'down'
    amount Decimal64(8),
    leverage UInt8,
    multiplier Decimal32(2),
    entry_price Decimal64(8),
    current_price Decimal64(8),
    pnl Decimal64(8),
    status LowCardinality(String), -- 'open', 'closed', 'cancelled'
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
TTL date + INTERVAL 5 YEAR; -- Хранить данные о сделках 5 лет

-- Таблица пользователей (денормализованная для быстрых запросов)
CREATE TABLE IF NOT EXISTS users_analytics (
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
    is_active_30d UInt8 DEFAULT 0, -- Обновляется ETL процессом
    is_active_7d UInt8 DEFAULT 0    -- Обновляется ETL процессом
) ENGINE = ReplacingMergeTree(last_login_at)
PARTITION BY toYYYYMM(registration_date)
ORDER BY (registration_date, user_id);

-- Таблица для ежедневной аналитики пользователей
CREATE TABLE IF NOT EXISTS daily_user_stats (
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
TTL date + INTERVAL 1 YEAR;

-- Агрегированная таблица ежедневных метрик
CREATE TABLE IF NOT EXISTS daily_metrics (
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
TTL date + INTERVAL 5 YEAR;

-- ============================================
-- МОНЕТИЗАЦИЯ И ДОХОДЫ
-- ============================================

-- Таблица событий доходов
CREATE TABLE IF NOT EXISTS revenue_events (
    event_id String,
    user_id UInt64,
    revenue_type LowCardinality(String), -- 'premium', 'ad', 'subscription', 'purchase'
    amount Decimal64(8),
    revenue Decimal64(8), -- Конвертированная сумма в USD
    currency LowCardinality(String),
    payment_method Nullable(String),
    subscription_id Nullable(String),
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    month UInt32 MATERIALIZED toYYYYMM(date)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, revenue_type, timestamp)
TTL date + INTERVAL 3 YEAR;

-- Таблица для рекламных событий
CREATE TABLE IF NOT EXISTS ad_events (
    event_id String,
    user_id UInt64,
    ad_type LowCardinality(String),
    ad_placement LowCardinality(String),
    event_type LowCardinality(String), -- 'impression', 'click', 'completion', 'reward'
    reward_amount Nullable(Decimal64(8)),
    timestamp DateTime64(3),
    date Date MATERIALIZED toDate(timestamp),
    session_id String,
    ip_hash String, -- Хешированный IP для анти-фрод
    user_agent_hash String -- Хешированный User-Agent для анти-фрод
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, user_id, ad_type, timestamp)
TTL date + INTERVAL 1 YEAR;

-- ============================================
-- МАТЕРИАЛИЗОВАННЫЕ ПРЕДСТАВЛЕНИЯ
-- ============================================

-- Материализованное представление для ежедневной аналитики пользователей
CREATE MATERIALIZED VIEW IF NOT EXISTS daily_user_stats_mv TO daily_user_stats AS
SELECT 
    toDate(timestamp) as date,
    user_id,
    countIf(event_type = 'login') as login_count,
    countIf(event_type = 'trade_open') as trades_opened,
    countIf(event_type = 'trade_close') as trades_closed,
    countIf(event_type = 'ad_watch') as ads_watched,
    sumIf(JSONExtractFloat(event_data, 'amount'), event_type = 'trade_open') as total_trade_volume,
    uniq(session_id) as sessions_count,
    max(timestamp) - min(timestamp) as session_duration_seconds
FROM user_events
WHERE date = today()
GROUP BY date, user_id;

-- ============================================
-- ПРЕДСТАВЛЕНИЯ ДЛЯ БЫСТРЫХ ЗАПРОСОВ
-- ============================================

-- Представление активных пользователей за 7 дней
CREATE VIEW IF NOT EXISTS active_users_7d AS
SELECT 
    date,
    uniqExact(user_id) as active_users
FROM user_events
WHERE date >= today() - INTERVAL 7 DAY
GROUP BY date
ORDER BY date;

-- Представление торговых метрик по дням
CREATE VIEW IF NOT EXISTS trading_metrics_daily AS
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
ORDER BY date;

-- Представление для расчета когорт пользователей
CREATE VIEW IF NOT EXISTS user_cohorts AS
SELECT 
    toYYYYMM(registration_date) as cohort_month,
    dateDiff('day', registration_date, date) as days_since_registration,
    count(DISTINCT user_id) as users,
    countIf(login_count > 0) / count(DISTINCT user_id) * 100 as retention_rate
FROM users_analytics ua
LEFT JOIN daily_user_stats dus ON ua.user_id = dus.user_id
WHERE registration_date >= today() - INTERVAL 12 MONTH
GROUP BY cohort_month, days_since_registration
ORDER BY cohort_month, days_since_registration;

-- Представление для быстрого получения KPI
CREATE VIEW IF NOT EXISTS kpi_dashboard AS
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
ORDER BY date DESC;

-- ============================================
-- ИНДЕКСЫ ДЛЯ ОПТИМИЗАЦИИ
-- ============================================

-- Индексы для оптимизации запросов
CREATE INDEX IF NOT EXISTS idx_user_events_type ON user_events (event_type) TYPE set(100) GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_deals_status ON deals_analytics (status) TYPE set(10) GRANULARITY 1;
CREATE INDEX IF NOT EXISTS idx_deals_symbol ON deals_analytics (symbol) TYPE set(100) GRANULARITY 1;

-- ============================================
-- НАСТРОЙКИ ОПТИМИЗАЦИИ
-- ============================================

-- Настройки для оптимизации производительности
-- Эти настройки применяются к текущей сессии
SET max_memory_usage = 10000000000; -- 10GB
SET use_uncompressed_cache = 1;
SET compile_expressions = 1;

-- ============================================
-- КОММЕНТАРИИ ДЛЯ ДОКУМЕНТАЦИИ
-- ============================================

-- Добавляем комментарии к таблицам для документации
-- (В ClickHouse COMMENT ON TABLE может не поддерживаться в некоторых версиях)

-- ============================================
-- ПРОВЕРКА СОЗДАНИЯ
-- ============================================

-- Показываем созданные таблицы
SHOW TABLES;

-- Показываем созданные представления  
SHOW TABLES LIKE '%_view' OR LIKE '%_mv';

-- Получаем базовую статистику
SELECT 
    'ClickHouse analytics database initialized successfully!' as message,
    formatDateTime(now(), '%Y-%m-%d %H:%M:%S') as timestamp;

SELECT 
    'Total tables: ' || toString(count()) as info
FROM system.tables 
WHERE database = 'cryptocraze_analytics' AND engine LIKE '%MergeTree%';

SELECT 
    'Total views: ' || toString(count()) as info  
FROM system.tables 
WHERE database = 'cryptocraze_analytics' AND engine = 'View';