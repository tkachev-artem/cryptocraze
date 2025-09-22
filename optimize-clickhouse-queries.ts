// Оптимизированные ClickHouse запросы для retention
export const optimizedRetentionQueries = {
  
  // Оптимизированный запрос для retention table с CTE
  getRetentionTable: (startDate: string, endDate: string, days: number, size: number, offset: number) => `
    WITH 
      -- Сначала найдем всех пользователей с датой установки
      user_installs AS (
        SELECT user_id, min(date) AS install_date
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${startDate}'
          AND date <= '${endDate}'
          AND user_id != '999999999'
          AND length(user_id) > 5
        GROUP BY user_id
      ),
      -- Затем найдем кто вернулся в нужный день
      user_returns AS (
        SELECT DISTINCT 
          ui.user_id,
          ui.install_date,
          min(e.date) as returned_date
        FROM user_installs ui
        JOIN cryptocraze_analytics.user_events e ON ui.user_id = e.user_id
        WHERE e.date >= addDays(ui.install_date, ${days})
          AND e.date < addDays(ui.install_date, ${days + 1})
        GROUP BY ui.user_id, ui.install_date
      )
    SELECT 
      user_id,
      install_date, 
      returned_date
    FROM user_returns
    ORDER BY install_date DESC
    LIMIT ${size} OFFSET ${offset}
  `,

  // Оптимизированный count запрос
  getRetentionCount: (startDate: string, endDate: string, days: number) => `
    WITH 
      user_installs AS (
        SELECT user_id, min(date) AS install_date
        FROM cryptocraze_analytics.user_events
        WHERE date >= '${startDate}'
          AND date <= '${endDate}'
          AND user_id != '999999999'
          AND length(user_id) > 5
        GROUP BY user_id
      ),
      user_returns AS (
        SELECT DISTINCT ui.user_id
        FROM user_installs ui
        JOIN cryptocraze_analytics.user_events e ON ui.user_id = e.user_id
        WHERE e.date >= addDays(ui.install_date, ${days})
          AND e.date < addDays(ui.install_date, ${days + 1})
      )
    SELECT count() as total FROM user_returns
  `,

  // Оптимизированный trend запрос
  getRetentionTrend: (startDate: string, endDate: string, retentionDays: number, userIdFilter = '') => `
    WITH 
      user_installs AS (
        SELECT user_id, min(date) AS install_date
        FROM cryptocraze_analytics.user_events
        WHERE user_id != '999999999'
          AND length(user_id) > 5 ${userIdFilter}
        GROUP BY user_id
      ),
      retention_achievements AS (
        SELECT DISTINCT 
          ui.user_id,
          ui.install_date,
          addDays(ui.install_date, ${retentionDays}) as achievement_date
        FROM user_installs ui
        JOIN cryptocraze_analytics.user_events e ON ui.user_id = e.user_id
        WHERE e.date >= addDays(ui.install_date, 1)
          AND e.date < addDays(ui.install_date, ${retentionDays + 1})
          AND e.user_id != '999999999' ${userIdFilter}
        GROUP BY ui.user_id, ui.install_date
        HAVING count(DISTINCT e.date) >= ${retentionDays}
      )
    SELECT 
      achievement_date as date,
      count(DISTINCT user_id) as value
    FROM retention_achievements
    WHERE achievement_date >= '${startDate}'
      AND achievement_date <= '${endDate}'
    GROUP BY achievement_date
    ORDER BY achievement_date
  `,

  // Быстрый запрос для overview данных
  getQuickOverview: () => `
    SELECT 
      count(DISTINCT user_id) as total_users,
      count(DISTINCT CASE WHEN date = today() THEN user_id END) as new_users_today,
      count(DISTINCT CASE WHEN date >= today() - 1 THEN user_id END) as daily_active_users,
      count(DISTINCT CASE WHEN date >= today() - 7 THEN user_id END) as weekly_active_users,
      count(DISTINCT CASE WHEN date >= today() - 30 THEN user_id END) as monthly_active_users
    FROM cryptocraze_analytics.user_events
    WHERE user_id != '999999999'
      AND date >= today() - 30
  `,

  // Оптимизированный запрос для активных пользователей
  getActiveUsers: (startDate: string, endDate: string, size: number, offset: number) => `
    SELECT 
      user_id,
      min(date) as first_seen,
      max(date) as last_seen,
      count() as total_events,
      count(DISTINCT date) as active_days
    FROM cryptocraze_analytics.user_events
    WHERE date >= '${startDate}'
      AND date <= '${endDate}'
      AND user_id != '999999999'
      AND length(user_id) > 5
    GROUP BY user_id
    ORDER BY last_seen DESC
    LIMIT ${size} OFFSET ${offset}
  `
};

// Функция для создания материализованных представлений (выполнить один раз)
export const createMaterializedViews = () => [
  // Материализованное представление для быстрого доступа к установкам
  `CREATE MATERIALIZED VIEW IF NOT EXISTS cryptocraze_analytics.user_installs_mv
   ENGINE = ReplacingMergeTree()
   PARTITION BY toYYYYMM(install_date)
   ORDER BY (user_id, install_date)
   AS SELECT
       user_id,
       min(date) as install_date,
       count() as total_events
   FROM cryptocraze_analytics.user_events
   WHERE user_id != '999999999' AND length(user_id) > 5
   GROUP BY user_id`,

  // Материализованное представление для retention метрик
  `CREATE MATERIALIZED VIEW IF NOT EXISTS cryptocraze_analytics.daily_retention_mv
   ENGINE = SummingMergeTree()
   PARTITION BY toYYYYMM(date)
   ORDER BY (date, retention_day)
   AS SELECT
       toDate(timestamp) as date,
       1 as retention_day,
       user_id,
       1 as events_count
   FROM cryptocraze_analytics.user_events
   WHERE user_id != '999999999'`,

  // Индексы для ускорения
  `ALTER TABLE cryptocraze_analytics.user_events 
   ADD INDEX IF NOT EXISTS idx_user_date (user_id, date) TYPE minmax GRANULARITY 1`,
   
  `ALTER TABLE cryptocraze_analytics.user_events 
   ADD INDEX IF NOT EXISTS idx_date_range (date) TYPE minmax GRANULARITY 1`,

  `ALTER TABLE cryptocraze_analytics.user_events 
   ADD INDEX IF NOT EXISTS idx_user_bloom (user_id) TYPE bloom_filter(0.01) GRANULARITY 1`
];

export default optimizedRetentionQueries;
