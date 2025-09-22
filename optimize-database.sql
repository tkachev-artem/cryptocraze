-- Оптимизация производительности базы данных
-- PostgreSQL индексы

-- Индексы для таблицы users
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_is_premium ON users(is_premium);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_users_id_premium ON users(id, is_premium); -- Composite index

-- Индексы для таблицы analytics
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_id_timestamp ON analytics(user_id, timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_country ON analytics(country);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_country ON analytics(user_id, country); -- Composite index

-- ClickHouse индексы и оптимизации
-- Эти команды нужно выполнить в ClickHouse

/*
-- Оптимизация таблицы user_events в ClickHouse
ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_user_date (user_id, date) TYPE minmax GRANULARITY 1;

ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_date (date) TYPE minmax GRANULARITY 1;

ALTER TABLE cryptocraze_analytics.user_events 
ADD INDEX idx_user_id (user_id) TYPE bloom_filter(0.01) GRANULARITY 1;

-- Принудительная оптимизация партиций
OPTIMIZE TABLE cryptocraze_analytics.user_events FINAL;

-- Настройка сжатия для лучшей производительности
ALTER TABLE cryptocraze_analytics.user_events 
MODIFY COLUMN event_data Codec(ZSTD(1));

-- Создание материализованного представления для быстрого доступа к retention данным
CREATE MATERIALIZED VIEW IF NOT EXISTS cryptocraze_analytics.user_installs_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(install_date)
ORDER BY (user_id, install_date)
AS SELECT
    user_id,
    min(date) as install_date,
    count() as event_count
FROM cryptocraze_analytics.user_events
WHERE user_id != '999999999' AND length(user_id) > 10
GROUP BY user_id;

-- Создание материализованного представления для retention метрик
CREATE MATERIALIZED VIEW IF NOT EXISTS cryptocraze_analytics.retention_summary_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(install_date)
ORDER BY (install_date, retention_day)
AS SELECT
    ui.install_date,
    1 as retention_day,
    count(DISTINCT ui.user_id) as total_users,
    count(DISTINCT e.user_id) as retained_users
FROM (
    SELECT user_id, min(date) as install_date
    FROM cryptocraze_analytics.user_events
    WHERE user_id != '999999999' AND length(user_id) > 10
    GROUP BY user_id
) ui
LEFT JOIN cryptocraze_analytics.user_events e ON (
    ui.user_id = e.user_id AND
    e.date >= addDays(ui.install_date, 1) AND
    e.date < addDays(ui.install_date, 2)
)
GROUP BY ui.install_date;

*/

-- Статистика производительности PostgreSQL
ANALYZE users;
ANALYZE analytics;

-- Обновление статистики планировщика
UPDATE pg_stat_user_tables SET n_tup_ins = n_tup_ins WHERE schemaname = 'public';

VACUUM ANALYZE users;
VACUUM ANALYZE analytics;
