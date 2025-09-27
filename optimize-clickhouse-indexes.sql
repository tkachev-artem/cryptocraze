-- Оптимизация индексов для ClickHouse для улучшения производительности метрик

-- 1. Индекс для событий по timestamp и user_id (основной индекс)
ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_timestamp_user_id (timestamp, user_id) TYPE minmax GRANULARITY 3;

-- 2. Индекс для фильтрации по типу события
ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_event_type (event_type) TYPE set(0) GRANULARITY 1;

-- 3. Индекс для JSON свойств пользователя (premium, country)
ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_event_data (event_data) TYPE bloom_filter GRANULARITY 1;

-- 4. Индекс для session_id для группировки сессий
ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_session_id (session_id) TYPE set(0) GRANULARITY 1;

-- 5. Индекс для user_retention таблицы
ALTER TABLE cryptocraze_analytics.user_retention 
ADD INDEX idx_install_date (install_date) TYPE minmax GRANULARITY 3;

-- 6. Индекс для user_retention по user_id
ALTER TABLE cryptocraze_analytics.user_retention 
ADD INDEX idx_user_id (user_id) TYPE set(0) GRANULARITY 1;

-- 7. Индекс для user_retention по стране
ALTER TABLE cryptocraze_analytics.user_retention 
ADD INDEX idx_country (country) TYPE set(0) GRANULARITY 1;

-- 8. Индекс для user_retention по premium статусу
ALTER TABLE cryptocraze_analytics.user_retention 
ADD INDEX idx_is_premium (is_premium) TYPE set(0) GRANULARITY 1;

-- Оптимизация настроек для лучшей производительности
ALTER TABLE cryptocraze_analytics.user_events 
MODIFY SETTING 
    index_granularity = 8192,
    merge_with_ttl_timeout = 3600,
    merge_tree_min_rows_for_concurrent_read = 16384,
    merge_tree_min_bytes_for_concurrent_read = 25165824;

-- Создание таблицы для агрегированных дневных метрик
CREATE TABLE IF NOT EXISTS cryptocraze_analytics.daily_metrics (
    date Date,
    user_id String,
    sessions_count UInt32,
    screens_count UInt32,
    page_views_count UInt32,
    last_activity DateTime
) ENGINE = SummingMergeTree()
ORDER BY (date, user_id)
SETTINGS index_granularity = 8192;

CREATE MATERIALIZED VIEW cryptocraze_analytics.daily_metrics_mv
TO cryptocraze_analytics.daily_metrics
AS SELECT
    toDate(timestamp) as date,
    user_id,
    countIf(event_type = 'session_start') as sessions_count,
    countIf(event_type = 'screen_view') as screens_count,
    countIf(event_type = 'page_view') as page_views_count,
    maxIf(timestamp, event_type = 'session_end') as last_activity
FROM cryptocraze_analytics.user_events
WHERE user_id != '999999999' AND length(user_id) > 5
GROUP BY date, user_id;

-- Создание материализованного представления для торговых метрик
CREATE MATERIALIZED VIEW cryptocraze_analytics.trading_metrics_mv
TO cryptocraze_analytics.trading_metrics
AS SELECT
    toDate(closed_at) as date,
    user_id,
    count() as trades_count,
    sumIf(profit, profit > 0) as total_profit,
    sumIf(profit, profit < 0) as total_loss,
    maxIf(profit, profit > 0) as max_profit,
    minIf(profit, profit < 0) as max_loss,
    avgIf(EXTRACT(EPOCH FROM (closed_at - opened_at))/60.0, 
          closed_at IS NOT NULL AND opened_at IS NOT NULL) as avg_holding_time_minutes
FROM deals
WHERE status = 'closed' AND closed_at IS NOT NULL
GROUP BY date, user_id;

-- Создание таблицы для агрегированных торговых метрик
CREATE TABLE IF NOT EXISTS cryptocraze_analytics.trading_metrics (
    date Date,
    user_id String,
    trades_count UInt32,
    total_profit Float64,
    total_loss Float64,
    max_profit Float64,
    max_loss Float64,
    avg_holding_time_minutes Float64
) ENGINE = SummingMergeTree()
ORDER BY (date, user_id)
SETTINGS index_granularity = 8192;

-- Создание индексов для новых таблиц
ALTER TABLE cryptocraze_analytics.daily_metrics 
ADD INDEX idx_date (date) TYPE minmax GRANULARITY 3;

ALTER TABLE cryptocraze_analytics.daily_metrics 
ADD INDEX idx_user_id (user_id) TYPE set(0) GRANULARITY 1;

ALTER TABLE cryptocraze_analytics.trading_metrics 
ADD INDEX idx_date (date) TYPE minmax GRANULARITY 3;

ALTER TABLE cryptocraze_analytics.trading_metrics 
ADD INDEX idx_user_id (user_id) TYPE set(0) GRANULARITY 1;

-- Оптимизация настроек ClickHouse для кеширования
ALTER SYSTEM SET 
    max_memory_usage = 10000000000,
    max_threads = 16,
    max_execution_time = 300,
    max_bytes_before_external_group_by = 20000000000,
    max_bytes_before_external_sort = 20000000000;

-- Создание настроек для кеширования результатов
CREATE TABLE IF NOT EXISTS cryptocraze_analytics.query_cache (
    query_hash String,
    result String,
    created_at DateTime DEFAULT now(),
    expires_at DateTime
) ENGINE = MergeTree()
ORDER BY (query_hash, created_at)
TTL expires_at
SETTINGS index_granularity = 8192;
