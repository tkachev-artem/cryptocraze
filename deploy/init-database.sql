-- ============================================
-- CryptoCraze Database Initialization Script
-- ============================================
-- Полная инициализация PostgreSQL базы данных
-- Включает все таблицы, ENUMs, индексы и начальные данные

-- Создание ENUMs
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
        CREATE TYPE notification_type AS ENUM (
          'auto_close_trade',
          'daily_reward', 
          'personal_messages',
          'maintenance',
          'trade_opened',
          'trade_closed',
          'achievement_unlocked',
          'system_alert'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_type') THEN
        CREATE TYPE ad_type AS ENUM (
          'rewarded_video',
          'interstitial',
          'banner',
          'native'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_placement') THEN
        CREATE TYPE ad_placement AS ENUM (
          'task_completion',
          'wheel_spin',
          'box_opening',
          'trading_bonus',
          'screen_transition'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_provider') THEN
        CREATE TYPE ad_provider AS ENUM (
          'google_admob',
          'google_adsense',
          'simulation'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ad_reward_type') THEN
        CREATE TYPE ad_reward_type AS ENUM (
          'money',
          'coins',
          'energy',
          'trading_bonus'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'box_type') THEN
        CREATE TYPE box_type AS ENUM (
          'red',
          'green',
          'x'
        );
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prize_type') THEN
        CREATE TYPE prize_type AS ENUM (
          'money',
          'pro'
        );
    END IF;
END $$;

-- ============================================
-- ОСНОВНЫЕ ТАБЛИЦЫ
-- ============================================

-- Session storage table for Replit Auth
CREATE TABLE IF NOT EXISTS sessions (
  sid VARCHAR PRIMARY KEY,
  sess JSONB NOT NULL,
  expire TIMESTAMP NOT NULL
);
CREATE INDEX IF NOT EXISTS IDX_session_expire ON sessions (expire);

-- User storage table
CREATE TABLE IF NOT EXISTS users (
  -- Основная информация
  id VARCHAR PRIMARY KEY NOT NULL,
  email VARCHAR UNIQUE,
  first_name VARCHAR,
  last_name VARCHAR,
  profile_image_url VARCHAR,
  phone VARCHAR,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Финансы
  balance DECIMAL(15,2) DEFAULT 10000.00, -- Деньги
  coins INTEGER DEFAULT 0, -- Монеты
  free_balance DECIMAL(18,8) DEFAULT 0, -- Свободные средства для сделок
  
  -- Рейтинг и статистика
  rating_score INTEGER DEFAULT 0, -- Рейтинг в баллах
  rating_rank_30_days INTEGER, -- Номер в рейтинге за 30 дней
  
  -- Торговля
  trades_count INTEGER DEFAULT 0, -- Количество сделок
  total_trades_volume DECIMAL(15,2) DEFAULT 0.00, -- Сумма сделок в деньгах
  successful_trades_percentage DECIMAL(5,2) DEFAULT 0.00, -- Процент успешных сделок
  max_profit DECIMAL(15,2) DEFAULT 0.00, -- Максимальный профит
  max_loss DECIMAL(15,2) DEFAULT 0.00, -- Максимальный убыток
  average_trade_amount DECIMAL(15,2) DEFAULT 0.00, -- Средняя сумма сделки
  
  -- Награды
  rewards_count INTEGER DEFAULT 0, -- Количество наград
  
  -- Энергетические задания
  energy_tasks_bonus INTEGER DEFAULT 0, -- Прогресс энергетических заданий (0-100), при 100 обнуляется и считается выполненным
  
  -- Premium
  is_premium BOOLEAN DEFAULT false,
  premium_expires_at TIMESTAMP,
  
  -- Роли
  role VARCHAR(20) DEFAULT 'user' -- 'user', 'admin', 'moderator'
);

-- Таблица уведомлений пользователей
CREATE TABLE IF NOT EXISTS user_notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_active BOOLEAN DEFAULT true,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- АНАЛИТИКА И СЕССИИ
-- ============================================

CREATE TABLE IF NOT EXISTS analytics (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id),
  event_type VARCHAR(50) NOT NULL,
  event_data JSONB,
  timestamp TIMESTAMP DEFAULT NOW(),
  session_id VARCHAR,
  user_agent TEXT,
  ip_address VARCHAR(45)
);
CREATE INDEX IF NOT EXISTS idx_analytics_user_id ON analytics (user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics (event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_timestamp ON analytics (timestamp);
CREATE INDEX IF NOT EXISTS idx_analytics_session_id ON analytics (session_id);

-- User sessions tracking for engagement metrics
CREATE TABLE IF NOT EXISTS user_sessions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255) NOT NULL,
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  duration INTEGER, -- in seconds
  screens_opened INTEGER DEFAULT 0,
  trades_opened INTEGER DEFAULT 0,
  ads_watched INTEGER DEFAULT 0,
  virtual_balance_used DECIMAL(18,8) DEFAULT 0,
  device_info JSONB, -- device type, OS, app version
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions (start_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions (session_id);

-- ============================================
-- СИСТЕМА РЕКЛАМЫ
-- ============================================

-- Ad sessions tracking table
CREATE TABLE IF NOT EXISTS ad_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ad_id VARCHAR(100) NOT NULL,
  ad_type ad_type NOT NULL,
  placement ad_placement NOT NULL,
  provider ad_provider NOT NULL DEFAULT 'simulation',
  start_time TIMESTAMP NOT NULL DEFAULT NOW(),
  end_time TIMESTAMP,
  watch_time INTEGER, -- Duration in milliseconds
  completed BOOLEAN DEFAULT false,
  reward_claimed BOOLEAN DEFAULT false,
  fraud_detected BOOLEAN DEFAULT false,
  fraud_reason TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  device_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_user_id ON ad_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_ad_id ON ad_sessions (ad_id);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_placement ON ad_sessions (placement);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_start_time ON ad_sessions (start_time);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_completed ON ad_sessions (completed);
CREATE INDEX IF NOT EXISTS idx_ad_sessions_fraud_detected ON ad_sessions (fraud_detected);

-- Ad rewards tracking table
CREATE TABLE IF NOT EXISTS ad_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES ad_sessions(id) ON DELETE CASCADE,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reward_type ad_reward_type NOT NULL,
  amount DECIMAL(18,8) NOT NULL,
  multiplier DECIMAL(5,2) DEFAULT 1.00,
  bonus_percentage INTEGER,
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_session_id ON ad_rewards (session_id);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_user_id ON ad_rewards (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_processed ON ad_rewards (processed);
CREATE INDEX IF NOT EXISTS idx_ad_rewards_created_at ON ad_rewards (created_at);

-- Ad performance metrics table
CREATE TABLE IF NOT EXISTS ad_performance_metrics (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL DEFAULT NOW(),
  ad_type ad_type NOT NULL,
  placement ad_placement NOT NULL,
  provider ad_provider NOT NULL,
  impressions INTEGER DEFAULT 0,
  completions INTEGER DEFAULT 0,
  rewards INTEGER DEFAULT 0,
  fraud_attempts INTEGER DEFAULT 0,
  total_watch_time BIGINT DEFAULT 0, -- Total watch time in milliseconds
  total_reward_amount DECIMAL(18,8) DEFAULT 0,
  revenue DECIMAL(18,8) DEFAULT 0, -- Estimated ad revenue
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_ad_performance_date ON ad_performance_metrics (date);
CREATE INDEX IF NOT EXISTS idx_ad_performance_type_placement ON ad_performance_metrics (ad_type, placement);

-- ============================================
-- ПОЛЬЗОВАТЕЛИ И МАРКЕТИНГ
-- ============================================

CREATE TABLE IF NOT EXISTS user_acquisition (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  install_date TIMESTAMP NOT NULL DEFAULT NOW(),
  first_open_date TIMESTAMP,
  signup_date TIMESTAMP,
  first_trade_date TIMESTAMP,
  acquisition_source VARCHAR(100), -- organic, google_ads, facebook_ads, etc.
  campaign_id VARCHAR(100),
  ad_group_id VARCHAR(100),
  creative_id VARCHAR(100),
  utm_source VARCHAR(100),
  utm_medium VARCHAR(100),
  utm_campaign VARCHAR(100),
  referral_code VARCHAR(50),
  created_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_user_acquisition_install_date ON user_acquisition (install_date);
CREATE INDEX IF NOT EXISTS idx_user_acquisition_source ON user_acquisition (acquisition_source);
CREATE INDEX IF NOT EXISTS idx_user_acquisition_first_trade ON user_acquisition (first_trade_date);

-- Ad performance tracking
CREATE TABLE IF NOT EXISTS ad_events (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES users(id) ON DELETE CASCADE,
  session_id VARCHAR(255),
  ad_type VARCHAR(30) NOT NULL, -- rewarded_video, interstitial, banner
  ad_network VARCHAR(50), -- admob, facebook, unity
  ad_unit_id VARCHAR(100),
  event_type VARCHAR(30) NOT NULL, -- impression, click, reward, close
  reward_amount DECIMAL(18,8),
  reward_type VARCHAR(20), -- money, coins, energy, pro_days
  revenue DECIMAL(10,6), -- estimated revenue in USD
  timestamp TIMESTAMP DEFAULT NOW(),
  metadata JSONB -- additional ad network specific data
);
CREATE INDEX IF NOT EXISTS idx_ad_events_user_id ON ad_events (user_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_timestamp ON ad_events (timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON ad_events (ad_type, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_session_id ON ad_events (session_id);

-- ============================================
-- МЕТРИКИ И BI
-- ============================================

-- Daily aggregated metrics for faster BI queries
CREATE TABLE IF NOT EXISTS daily_metrics (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL, -- date at 00:00 UTC
  
  -- User Acquisition Metrics
  new_installs INTEGER DEFAULT 0,
  new_signups INTEGER DEFAULT 0,
  new_first_trades INTEGER DEFAULT 0,
  
  -- Engagement Metrics
  daily_active_users INTEGER DEFAULT 0,
  total_sessions INTEGER DEFAULT 0,
  avg_session_duration DECIMAL(10,2), -- in minutes
  total_trades_opened INTEGER DEFAULT 0,
  total_screens_opened INTEGER DEFAULT 0,
  avg_virtual_balance_used DECIMAL(18,8),
  
  -- Retention Metrics (calculated for this day's cohort)
  retention_d1 DECIMAL(5,2), -- percentage
  retention_d3 DECIMAL(5,2),
  retention_d7 DECIMAL(5,2),
  retention_d30 DECIMAL(5,2),
  
  -- Monetization Metrics
  total_revenue DECIMAL(15,2) DEFAULT 0,
  premium_subscriptions INTEGER DEFAULT 0,
  arpu DECIMAL(10,2), -- Average Revenue Per User
  arppu DECIMAL(10,2), -- Average Revenue Per Paying User
  
  -- Ad Performance Metrics
  ad_impressions INTEGER DEFAULT 0,
  ad_clicks INTEGER DEFAULT 0,
  ad_rewards INTEGER DEFAULT 0,
  ad_revenue DECIMAL(15,2) DEFAULT 0,
  ctr DECIMAL(5,2), -- Click Through Rate
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics (date);

-- User cohorts for retention analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  cohort_date TIMESTAMP NOT NULL, -- install date truncated to day
  days_since_install INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT false, -- was user active on this day
  trades_count INTEGER DEFAULT 0,
  session_duration INTEGER DEFAULT 0, -- in seconds
  virtual_balance_used DECIMAL(18,8) DEFAULT 0,
  record_date TIMESTAMP NOT NULL -- the actual date being recorded
);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_date ON user_cohorts (cohort_date);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_user_id ON user_cohorts (user_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_record_date ON user_cohorts (record_date);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_days_since ON user_cohorts (days_since_install);

-- ============================================
-- PREMIUM СИСТЕМА
-- ============================================

-- Premium подписки
CREATE TABLE IF NOT EXISTS premium_subscriptions (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  telegram_id VARCHAR(50),
  payment_id VARCHAR(100) NOT NULL UNIQUE,
  plan_type VARCHAR(20) NOT NULL, -- 'month', 'year'
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'succeeded', 'canceled', 'failed'
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP,
  is_active BOOLEAN DEFAULT false
);

-- Premium планы
CREATE TABLE IF NOT EXISTS premium_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  plan_type VARCHAR(20) NOT NULL, -- 'month', 'year'
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  features JSONB, -- Список функций
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- СИСТЕМА НАГРАД И ЗАДАНИЙ
-- ============================================

-- Таблица уровней наград (tiers)
CREATE TABLE IF NOT EXISTS reward_tiers (
  id SERIAL PRIMARY KEY,
  level INTEGER NOT NULL UNIQUE, -- Требуемое значение rewards_count
  account_money INTEGER NOT NULL, -- Порог денег на аккаунте
  reward INTEGER NOT NULL, -- Размер награды
  pro_days INTEGER, -- Дополнительные дни PRO
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица заданий пользователей
CREATE TABLE IF NOT EXISTS user_tasks (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  task_type VARCHAR(50) NOT NULL, -- 'video_bonus', 'trade_bonus', etc.
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_type VARCHAR(20) NOT NULL, -- 'money', 'coins', 'energy', 'mixed', 'wheel'
  reward_amount VARCHAR(50) NOT NULL, -- '1K', '100', etc.
  progress_current INTEGER DEFAULT 0,
  progress_total INTEGER NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active', -- 'active', 'completed', 'expired'
  icon VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  expires_at TIMESTAMP
);

-- Таблица шаблонов заданий (для админов)
CREATE TABLE IF NOT EXISTS task_templates (
  id SERIAL PRIMARY KEY,
  template_id VARCHAR(100) NOT NULL UNIQUE, -- Уникальный ID шаблона
  task_type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  reward_type VARCHAR(20) NOT NULL, -- 'money', 'coins', 'energy', 'mixed', 'wheel'
  reward_amount VARCHAR(50) NOT NULL,
  progress_total INTEGER NOT NULL,
  icon VARCHAR(255),
  category VARCHAR(20) NOT NULL, -- 'daily', 'video', 'trade', 'social', 'premium', 'crypto', 'energy'
  rarity VARCHAR(20) NOT NULL, -- 'common', 'rare', 'epic', 'legendary'
  expires_in_hours INTEGER NOT NULL DEFAULT 24,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(255) REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- ТОРГОВЛЯ
-- ============================================

CREATE TABLE IF NOT EXISTS deals (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(32) NOT NULL,
  symbol VARCHAR(16) NOT NULL,
  direction VARCHAR(8) NOT NULL,
  amount NUMERIC(18,8) NOT NULL,
  multiplier INTEGER NOT NULL,
  open_price NUMERIC(18,8) NOT NULL,
  take_profit NUMERIC(18,8),
  stop_loss NUMERIC(18,8),
  opened_at TIMESTAMP NOT NULL DEFAULT NOW(),
  status VARCHAR(16) NOT NULL DEFAULT 'open',
  closed_at TIMESTAMP,
  close_price NUMERIC(18,8),
  profit NUMERIC(18,8)
);

-- ============================================
-- СИСТЕМА КОРОБОК
-- ============================================

-- Таблица типов коробок
CREATE TABLE IF NOT EXISTS box_types (
  id SERIAL PRIMARY KEY,
  type box_type NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  required_energy INTEGER NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица призов
CREATE TABLE IF NOT EXISTS prizes (
  id SERIAL PRIMARY KEY,
  box_type_id INTEGER NOT NULL REFERENCES box_types(id) ON DELETE CASCADE,
  prize_type prize_type NOT NULL,
  amount DECIMAL(15,2), -- Для денежных призов
  pro_days INTEGER, -- Для PRO призов
  chance DECIMAL(5,2) NOT NULL, -- Шанс выпадения в процентах
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Таблица истории открытий коробок
CREATE TABLE IF NOT EXISTS box_openings (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  box_type_id INTEGER NOT NULL REFERENCES box_types(id),
  prize_id INTEGER NOT NULL REFERENCES prizes(id),
  prize_type prize_type NOT NULL,
  amount DECIMAL(15,2), -- Полученная сумма
  pro_days INTEGER, -- Полученные дни PRO
  energy_spent INTEGER NOT NULL, -- Потраченная энергия
  opened_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- BI АНАЛИТИКА
-- ============================================

-- BI Analytics Tables
CREATE TABLE IF NOT EXISTS user_daily_stats (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date TIMESTAMP NOT NULL,
  trades_count INTEGER DEFAULT 0,
  trades_volume DECIMAL(18,8) DEFAULT 0,
  total_profit DECIMAL(18,8) DEFAULT 0,
  session_duration INTEGER DEFAULT 0, -- in minutes
  screens_viewed INTEGER DEFAULT 0,
  energy_used INTEGER DEFAULT 0,
  coins_earned INTEGER DEFAULT 0,
  premium_active BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_user_daily_stats_user_date ON user_daily_stats (user_id, date);
CREATE INDEX IF NOT EXISTS idx_user_daily_stats_date ON user_daily_stats (date);

CREATE TABLE IF NOT EXISTS cohort_analysis (
  id SERIAL PRIMARY KEY,
  cohort_week TIMESTAMP NOT NULL, -- Week when user registered
  period_number INTEGER NOT NULL, -- Weeks since registration (0, 1, 2, 3...)
  users_count INTEGER NOT NULL,
  retention_rate DECIMAL(5,4), -- 0.0000 to 1.0000
  total_revenue DECIMAL(18,2) DEFAULT 0,
  avg_revenue_per_user DECIMAL(18,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_cohort_week_period ON cohort_analysis (cohort_week, period_number);

CREATE TABLE IF NOT EXISTS user_acquisition_metrics (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  total_installs INTEGER DEFAULT 0,
  total_signups INTEGER DEFAULT 0,
  total_first_trades INTEGER DEFAULT 0,
  total_first_deposits INTEGER DEFAULT 0,
  signup_rate DECIMAL(5,4), -- signup/install
  trade_open_rate DECIMAL(5,4), -- first_trade/signup
  avg_time_to_first_trade INTEGER -- in minutes
);
CREATE INDEX IF NOT EXISTS idx_acquisition_date ON user_acquisition_metrics (date);

CREATE TABLE IF NOT EXISTS engagement_metrics (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  daily_active_users INTEGER DEFAULT 0,
  weekly_active_users INTEGER DEFAULT 0,
  monthly_active_users INTEGER DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0, -- in minutes
  avg_screens_per_session DECIMAL(5,2),
  avg_trades_per_user DECIMAL(8,4),
  avg_virtual_balance_used DECIMAL(18,8),
  total_trades INTEGER DEFAULT 0,
  total_volume DECIMAL(20,8) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_engagement_date ON engagement_metrics (date);

CREATE TABLE IF NOT EXISTS revenue_metrics (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  total_revenue DECIMAL(18,2) DEFAULT 0,
  premium_revenue DECIMAL(18,2) DEFAULT 0,
  ad_revenue DECIMAL(18,2) DEFAULT 0,
  total_paying_users INTEGER DEFAULT 0,
  active_paying_users INTEGER DEFAULT 0,
  new_paying_users INTEGER DEFAULT 0,
  arpu DECIMAL(18,2) DEFAULT 0, -- Average Revenue Per User
  arppu DECIMAL(18,2) DEFAULT 0, -- Average Revenue Per Paying User
  conversion_rate DECIMAL(5,4), -- paying_users/total_users
  churn_rate DECIMAL(5,4),
  lifetime_value DECIMAL(18,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_revenue_date ON revenue_metrics (date);

-- Ad Performance Analytics Table (BI)
CREATE TABLE IF NOT EXISTS ad_performance_analytics (
  id SERIAL PRIMARY KEY,
  date TIMESTAMP NOT NULL,
  total_ad_spend DECIMAL(18,2) DEFAULT 0,
  total_installs INTEGER DEFAULT 0,
  total_conversions INTEGER DEFAULT 0,
  total_revenue DECIMAL(18,2) DEFAULT 0,
  cpi DECIMAL(8,2) DEFAULT 0, -- Cost Per Install
  cpa DECIMAL(8,2) DEFAULT 0, -- Cost Per Action
  roas DECIMAL(8,4) DEFAULT 0, -- Return On Ad Spend
  ad_impressions BIGINT DEFAULT 0,
  ad_clicks INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5,4) DEFAULT 0,
  conversion_rate DECIMAL(5,4) DEFAULT 0,
  avg_revenue_per_install DECIMAL(8,2) DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_ad_performance_analytics_date ON ad_performance_analytics (date);

-- ============================================
-- НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================

-- Премиум планы
INSERT INTO premium_plans (name, description, plan_type, price, currency, features, is_active) 
SELECT 'Premium Месяц', 'Premium подписка на 1 месяц', 'month', 6.99, 'USD', 
       '["Расширенная аналитика", "Приоритетная поддержка", "Эксклюзивные индикаторы", "Без рекламы", "Увеличенный лимит сделок"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE name = 'Premium Месяц');

INSERT INTO premium_plans (name, description, plan_type, price, currency, features, is_active)
SELECT 'Premium Год', 'Premium подписка на 1 год (экономия 20%)', 'year', 64.99, 'USD', 
       '["Все функции месячного плана", "Экономия 20%", "Приоритетный доступ к новым функциям", "Персональный менеджер", "Эксклюзивные вебинары"]'::jsonb, true
WHERE NOT EXISTS (SELECT 1 FROM premium_plans WHERE name = 'Premium Год');

-- Шаблоны заданий
INSERT INTO task_templates (template_id, task_type, title, description, reward_type, reward_amount, progress_total, icon, category, rarity, expires_in_hours, is_active) VALUES
-- Видео задания
('video_wheel', 'video_wheel', 'tasks.videoWheel.title', 'tasks.videoWheel.description', 'wheel', 'random', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_money', 'video_money', 'tasks.videoMoney.title', 'tasks.videoMoney.description', 'money', '1000', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_coins', 'video_coins', 'tasks.videoCoins.title', 'tasks.videoCoins.description', 'coins', '30', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_energy', 'video_energy', 'tasks.videoEnergy.title', 'tasks.videoEnergy.description', 'energy', '18', 1, '/trials/video.svg', 'video', 'common', 12, true),
('video_mega', 'video_mega', 'tasks.videoMega.title', 'tasks.videoMega.description', 'mixed', '12_energy_1500_money', 1, '/trials/video.svg', 'video', 'rare', 12, true),

-- Ежедневные задания
('daily_bonus', 'daily_bonus', 'tasks.dailyBonus.title', 'tasks.dailyBonus.description', 'money', '750', 1, '/trials/energy.svg', 'daily', 'common', 24, true),
('daily_trader', 'daily_trader', 'tasks.dailyTrader.title', 'tasks.dailyTrader.description', 'coins', '40', 1, '/trials/trade.svg', 'daily', 'common', 24, true),

-- Торговые задания
('trade_first_profit', 'trade_first_profit', 'tasks.tradeFirstProfit.title', 'tasks.tradeFirstProfit.description', 'coins', '25', 100, '/trials/trade.svg', 'trade', 'common', 24, true),
('trade_lucky', 'trade_lucky', 'tasks.tradeLucky.title', 'tasks.tradeLucky.description', 'mixed', '8_energy_800_money', 500, '/trials/trade.svg', 'trade', 'rare', 24, true),
('trade_close', 'trade_close', 'tasks.tradeClose.title', 'tasks.tradeClose.description', 'money', '600', 1, '/trials/trade.svg', 'trade', 'common', 24, true),
('trade_master', 'trade_master', 'tasks.tradeMaster.title', 'tasks.tradeMaster.description', 'mixed', '15_energy_2000_money', 1000, '/trials/trade.svg', 'trade', 'epic', 24, true),

-- Premium задания
('premium_login', 'premium_login', 'tasks.premiumLogin.title', 'tasks.premiumLogin.description', 'coins', '35', 1, '/trials/premium.svg', 'premium', 'rare', 24, true),
('premium_vip', 'premium_vip', 'tasks.premiumVip.title', 'tasks.premiumVip.description', 'mixed', '5_energy_20_coins', 1, '/trials/premium.svg', 'premium', 'rare', 24, true)
;

-- Типы коробок
INSERT INTO box_types (type, name, required_energy, description, is_active) 
SELECT 'red', 'Красная коробка', 10, 'Обычная красная коробка с базовыми призами', true
WHERE NOT EXISTS (SELECT 1 FROM box_types WHERE type = 'red');

INSERT INTO box_types (type, name, required_energy, description, is_active)
SELECT 'green', 'Зеленая коробка', 25, 'Улучшенная зеленая коробка с лучшими призами', true
WHERE NOT EXISTS (SELECT 1 FROM box_types WHERE type = 'green');

INSERT INTO box_types (type, name, required_energy, description, is_active)
SELECT 'x', 'X коробка', 50, 'Премиальная X коробка с эксклюзивными призами', true
WHERE NOT EXISTS (SELECT 1 FROM box_types WHERE type = 'x');

-- Призы для коробок
INSERT INTO prizes (box_type_id, prize_type, amount, pro_days, chance) 
SELECT 
  bt.id, 
  CASE 
    WHEN bt.type = 'red' THEN 'money'::prize_type
    WHEN bt.type = 'green' THEN 'money'::prize_type
    ELSE 'pro'::prize_type
  END,
  CASE 
    WHEN bt.type = 'red' THEN 100.00
    WHEN bt.type = 'green' THEN 500.00
    ELSE NULL
  END,
  CASE 
    WHEN bt.type = 'x' THEN 7
    ELSE NULL
  END,
  CASE 
    WHEN bt.type = 'red' THEN 70.00
    WHEN bt.type = 'green' THEN 60.00
    ELSE 30.00
  END
FROM box_types bt
;

-- Полная система наград (50 уровней)
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active) 
SELECT 1, 5000, 500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 1);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 2, 10000, 1000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 2);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 3, 15000, 1500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 3);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 4, 20000, 2000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 4);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 5, 25000, 2500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 5);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 6, 30000, 3000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 6);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 7, 35000, 3500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 7);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 8, 40000, 4000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 8);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 9, 45000, 4500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 9);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 10, 50000, 5000, 3, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 10);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 11, 60000, 6000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 11);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 12, 70000, 7000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 12);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 13, 80000, 8000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 13);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 14, 90000, 9000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 14);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 15, 100000, 10000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 15);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 16, 110000, 11000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 16);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 17, 120000, 12000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 17);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 18, 130000, 13000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 18);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 19, 140000, 14000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 19);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 20, 150000, 15000, 5, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 20);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 21, 160000, 16000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 21);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 22, 170000, 17000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 22);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 23, 180000, 18000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 23);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 24, 190000, 19000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 24);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 25, 200000, 20000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 25);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 26, 210000, 21000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 26);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 27, 220000, 22000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 27);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 28, 230000, 23000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 28);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 29, 240000, 24000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 29);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 30, 250000, 25000, 5, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 30);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 31, 260000, 26000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 31);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 32, 270000, 27000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 32);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 33, 280000, 28000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 33);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 34, 290000, 29000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 34);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 35, 300000, 30000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 35);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 36, 310000, 31000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 36);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 37, 320000, 32000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 37);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 38, 330000, 33000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 38);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 39, 340000, 34000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 39);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 40, 350000, 35000, 7, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 40);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 41, 400000, 40000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 41);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 42, 450000, 45000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 42);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 43, 475000, 47500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 43);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 44, 490000, 49000, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 44);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 45, 495000, 49500, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 45);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 46, 498000, 49800, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 46);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 47, 498500, 49850, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 47);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 48, 499000, 49900, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 48);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 49, 499500, 49950, NULL, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 49);
INSERT INTO reward_tiers (level, account_money, reward, pro_days, is_active)
SELECT 50, 500000, 50000, 10, true WHERE NOT EXISTS (SELECT 1 FROM reward_tiers WHERE level = 50);

-- ============================================
-- ЗАВЕРШЕНИЕ
-- ============================================

-- Обновляем статистику для оптимизатора
ANALYZE;

-- Выводим информацию о созданных объектах
SELECT 'Database initialization completed!' as message;
SELECT 'Total tables created: ' || count(*) as tables_info FROM information_schema.tables WHERE table_schema = 'public';
SELECT 'Premium plans: ' || count(*) as premium_plans FROM premium_plans WHERE is_active = true;
SELECT 'Task templates: ' || count(*) as task_templates FROM task_templates WHERE is_active = true;
SELECT 'Box types: ' || count(*) as box_types FROM box_types WHERE is_active = true;
SELECT 'Available prizes: ' || count(*) as prizes FROM prizes WHERE is_active = true;