-- BI Analytics Tables Migration
-- Created: 2025-01-30
-- Description: Add comprehensive BI analytics tables for user metrics, cohort analysis, engagement, and revenue tracking

-- User Daily Stats Table
CREATE TABLE IF NOT EXISTS "user_daily_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"date" timestamp NOT NULL,
	"trades_count" integer DEFAULT 0,
	"trades_volume" numeric(18, 8) DEFAULT '0',
	"total_profit" numeric(18, 8) DEFAULT '0',
	"session_duration" integer DEFAULT 0,
	"screens_viewed" integer DEFAULT 0,
	"energy_used" integer DEFAULT 0,
	"coins_earned" integer DEFAULT 0,
	"premium_active" boolean DEFAULT false
);

-- Cohort Analysis Table
CREATE TABLE IF NOT EXISTS "cohort_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_week" timestamp NOT NULL,
	"period_number" integer NOT NULL,
	"users_count" integer NOT NULL,
	"retention_rate" numeric(5, 4),
	"total_revenue" numeric(18, 2) DEFAULT '0',
	"avg_revenue_per_user" numeric(18, 2) DEFAULT '0'
);

-- User Acquisition Metrics Table
CREATE TABLE IF NOT EXISTS "user_acquisition_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_installs" integer DEFAULT 0,
	"total_signups" integer DEFAULT 0,
	"total_first_trades" integer DEFAULT 0,
	"total_first_deposits" integer DEFAULT 0,
	"signup_rate" numeric(5, 4),
	"trade_open_rate" numeric(5, 4),
	"avg_time_to_first_trade" integer
);

-- Engagement Metrics Table
CREATE TABLE IF NOT EXISTS "engagement_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"daily_active_users" integer DEFAULT 0,
	"weekly_active_users" integer DEFAULT 0,
	"monthly_active_users" integer DEFAULT 0,
	"avg_session_duration" integer DEFAULT 0,
	"avg_screens_per_session" numeric(5, 2),
	"avg_trades_per_user" numeric(8, 4),
	"avg_virtual_balance_used" numeric(18, 8),
	"total_trades" integer DEFAULT 0,
	"total_volume" numeric(20, 8) DEFAULT '0'
);

-- Revenue Metrics Table
CREATE TABLE IF NOT EXISTS "revenue_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_revenue" numeric(18, 2) DEFAULT '0',
	"premium_revenue" numeric(18, 2) DEFAULT '0',
	"ad_revenue" numeric(18, 2) DEFAULT '0',
	"total_paying_users" integer DEFAULT 0,
	"new_paying_users" integer DEFAULT 0,
	"arpu" numeric(18, 2) DEFAULT '0',
	"arppu" numeric(18, 2) DEFAULT '0',
	"conversion_rate" numeric(5, 4),
	"churn_rate" numeric(5, 4),
	"lifetime_value" numeric(18, 2) DEFAULT '0'
);

-- Add Foreign Key Constraints
DO $$ BEGIN
 ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "idx_user_daily_stats_user_date" ON "user_daily_stats" ("user_id", "date");
CREATE INDEX IF NOT EXISTS "idx_user_daily_stats_date" ON "user_daily_stats" ("date");
CREATE INDEX IF NOT EXISTS "idx_cohort_week_period" ON "cohort_analysis" ("cohort_week", "period_number");
CREATE INDEX IF NOT EXISTS "idx_acquisition_date" ON "user_acquisition_metrics" ("date");
CREATE INDEX IF NOT EXISTS "idx_engagement_date" ON "engagement_metrics" ("date");
CREATE INDEX IF NOT EXISTS "idx_revenue_date" ON "revenue_metrics" ("date");

-- Add unique constraints where needed
ALTER TABLE "user_acquisition_metrics" ADD CONSTRAINT "user_acquisition_metrics_date_unique" UNIQUE("date");
ALTER TABLE "engagement_metrics" ADD CONSTRAINT "engagement_metrics_date_unique" UNIQUE("date");
ALTER TABLE "revenue_metrics" ADD CONSTRAINT "revenue_metrics_date_unique" UNIQUE("date");
ALTER TABLE "cohort_analysis" ADD CONSTRAINT "cohort_analysis_cohort_week_period_number_unique" UNIQUE("cohort_week", "period_number");

-- Create a composite unique constraint for user daily stats to prevent duplicates
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_user_id_date_unique" UNIQUE("user_id", "date");

-- Insert sample data for testing (optional - remove in production)
-- This helps verify the tables work correctly

-- Insert engagement metrics for the last few days
INSERT INTO "engagement_metrics" (date, daily_active_users, weekly_active_users, monthly_active_users, avg_session_duration, total_trades, total_volume)
VALUES 
  (CURRENT_DATE - INTERVAL '3 days', 0, 0, 0, 0, 0, '0'),
  (CURRENT_DATE - INTERVAL '2 days', 0, 0, 0, 0, 0, '0'),
  (CURRENT_DATE - INTERVAL '1 day', 0, 0, 0, 0, 0, '0'),
  (CURRENT_DATE, 0, 0, 0, 0, 0, '0')
ON CONFLICT (date) DO NOTHING;

-- Insert acquisition metrics
INSERT INTO "user_acquisition_metrics" (date, total_installs, total_signups, total_first_trades, signup_rate, trade_open_rate)
VALUES 
  (CURRENT_DATE - INTERVAL '3 days', 0, 0, 0, 0, 0),
  (CURRENT_DATE - INTERVAL '2 days', 0, 0, 0, 0, 0),
  (CURRENT_DATE - INTERVAL '1 day', 0, 0, 0, 0, 0),
  (CURRENT_DATE, 0, 0, 0, 0, 0)
ON CONFLICT (date) DO NOTHING;

-- Insert revenue metrics
INSERT INTO "revenue_metrics" (date, total_revenue, premium_revenue, arpu, arppu, conversion_rate)
VALUES 
  (CURRENT_DATE - INTERVAL '3 days', '0', '0', '0', '0', 0),
  (CURRENT_DATE - INTERVAL '2 days', '0', '0', '0', '0', 0),
  (CURRENT_DATE - INTERVAL '1 day', '0', '0', '0', '0', 0),
  (CURRENT_DATE, '0', '0', '0', '0', 0)
ON CONFLICT (date) DO NOTHING;

-- Create a function to calculate metrics automatically (stored procedure)
CREATE OR REPLACE FUNCTION calculate_daily_metrics(target_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
    daily_active_users_count INTEGER;
    total_trades_count INTEGER;
    total_signups_count INTEGER;
BEGIN
    -- Calculate DAU from analytics events
    SELECT COUNT(DISTINCT user_id) INTO daily_active_users_count
    FROM analytics 
    WHERE DATE(timestamp) = target_date AND user_id IS NOT NULL;
    
    -- Calculate trades count
    SELECT COUNT(*) INTO total_trades_count
    FROM deals 
    WHERE DATE(opened_at) = target_date;
    
    -- Calculate signups
    SELECT COUNT(*) INTO total_signups_count
    FROM users 
    WHERE DATE(created_at) = target_date;
    
    -- Update engagement metrics
    INSERT INTO engagement_metrics (date, daily_active_users, total_trades)
    VALUES (target_date, daily_active_users_count, total_trades_count)
    ON CONFLICT (date) DO UPDATE SET
        daily_active_users = EXCLUDED.daily_active_users,
        total_trades = EXCLUDED.total_trades;
    
    -- Update acquisition metrics
    INSERT INTO user_acquisition_metrics (date, total_signups, total_first_trades)
    VALUES (target_date, total_signups_count, 0)
    ON CONFLICT (date) DO UPDATE SET
        total_signups = EXCLUDED.total_signups;
        
    -- Log the operation
    RAISE NOTICE 'Calculated metrics for %: % DAU, % trades, % signups', 
                 target_date, daily_active_users_count, total_trades_count, total_signups_count;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update user daily stats when deals are closed
CREATE OR REPLACE FUNCTION update_user_daily_stats_on_deal()
RETURNS TRIGGER AS $$
BEGIN
    -- Only process when deal is closed
    IF NEW.status = 'closed' AND OLD.status != 'closed' THEN
        INSERT INTO user_daily_stats (
            user_id, 
            date, 
            trades_count, 
            trades_volume, 
            total_profit
        )
        VALUES (
            NEW.user_id,
            DATE(NEW.closed_at),
            1,
            CAST(NEW.amount AS NUMERIC),
            CAST(COALESCE(NEW.profit, 0) AS NUMERIC)
        )
        ON CONFLICT (user_id, date) DO UPDATE SET
            trades_count = user_daily_stats.trades_count + 1,
            trades_volume = user_daily_stats.trades_volume + CAST(NEW.amount AS NUMERIC),
            total_profit = user_daily_stats.total_profit + CAST(COALESCE(NEW.profit, 0) AS NUMERIC);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_user_daily_stats ON deals;
CREATE TRIGGER trigger_update_user_daily_stats
    AFTER UPDATE ON deals
    FOR EACH ROW
    EXECUTE FUNCTION update_user_daily_stats_on_deal();

-- Grant appropriate permissions (adjust as needed for your user)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;