-- CryptoCraze Enhanced Analytics System Setup
-- This script creates the necessary database schema for comprehensive BI analytics

-- Add indexes to existing analytics table if they don't exist
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_user_id ON analytics(user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_event_type ON analytics(event_type);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_timestamp ON analytics(timestamp);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_analytics_session_id ON analytics(session_id);

-- User sessions tracking for engagement metrics
CREATE TABLE IF NOT EXISTS user_sessions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255) NOT NULL,
    start_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    duration INTEGER, -- in seconds
    screens_opened INTEGER DEFAULT 0,
    trades_opened INTEGER DEFAULT 0,
    ads_watched INTEGER DEFAULT 0,
    virtual_balance_used DECIMAL(18,8) DEFAULT 0,
    device_info JSONB, -- device type, OS, app version
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_sessions
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_start_time ON user_sessions(start_time);
CREATE INDEX IF NOT EXISTS idx_user_sessions_session_id ON user_sessions(session_id);

-- User acquisition tracking
CREATE TABLE IF NOT EXISTS user_acquisition (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    install_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for user_acquisition
CREATE INDEX IF NOT EXISTS idx_user_acquisition_install_date ON user_acquisition(install_date);
CREATE INDEX IF NOT EXISTS idx_user_acquisition_source ON user_acquisition(acquisition_source);
CREATE INDEX IF NOT EXISTS idx_user_acquisition_first_trade ON user_acquisition(first_trade_date);

-- Ad performance tracking
CREATE TABLE IF NOT EXISTS ad_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    session_id VARCHAR(255),
    ad_type VARCHAR(30) NOT NULL, -- rewarded_video, interstitial, banner
    ad_network VARCHAR(50), -- admob, facebook, unity
    ad_unit_id VARCHAR(100),
    event_type VARCHAR(30) NOT NULL, -- impression, click, reward, close
    reward_amount DECIMAL(18,8),
    reward_type VARCHAR(20), -- money, coins, energy, pro_days
    revenue DECIMAL(10,6), -- estimated revenue in USD
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB -- additional ad network specific data
);

-- Indexes for ad_events
CREATE INDEX IF NOT EXISTS idx_ad_events_user_id ON ad_events(user_id);
CREATE INDEX IF NOT EXISTS idx_ad_events_timestamp ON ad_events(timestamp);
CREATE INDEX IF NOT EXISTS idx_ad_events_type ON ad_events(ad_type, event_type);
CREATE INDEX IF NOT EXISTS idx_ad_events_session_id ON ad_events(session_id);

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
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for daily_metrics
CREATE UNIQUE INDEX IF NOT EXISTS idx_daily_metrics_date ON daily_metrics(date);

-- User cohorts for retention analysis
CREATE TABLE IF NOT EXISTS user_cohorts (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_date TIMESTAMP NOT NULL, -- install date truncated to day
    days_since_install INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT FALSE, -- was user active on this day
    trades_count INTEGER DEFAULT 0,
    session_duration INTEGER DEFAULT 0, -- in seconds
    virtual_balance_used DECIMAL(18,8) DEFAULT 0,
    record_date TIMESTAMP NOT NULL -- the actual date being recorded
);

-- Indexes for user_cohorts
CREATE INDEX IF NOT EXISTS idx_user_cohorts_cohort_date ON user_cohorts(cohort_date);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_user_id ON user_cohorts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_record_date ON user_cohorts(record_date);
CREATE INDEX IF NOT EXISTS idx_user_cohorts_days_since ON user_cohorts(days_since_install);

-- Unique constraint to prevent duplicate cohort records
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_cohorts_unique ON user_cohorts(user_id, cohort_date, days_since_install);

-- Function to update daily metrics automatically
CREATE OR REPLACE FUNCTION update_daily_metrics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for daily_metrics updated_at
DROP TRIGGER IF EXISTS trigger_update_daily_metrics_timestamp ON daily_metrics;
CREATE TRIGGER trigger_update_daily_metrics_timestamp
    BEFORE UPDATE ON daily_metrics
    FOR EACH ROW
    EXECUTE FUNCTION update_daily_metrics_timestamp();

-- Create initial user acquisition records for existing users
INSERT INTO user_acquisition (user_id, install_date, signup_date, first_open_date)
SELECT 
    id,
    created_at,
    created_at,
    created_at
FROM users
WHERE id NOT IN (SELECT user_id FROM user_acquisition WHERE user_id IS NOT NULL)
ON CONFLICT (user_id) DO NOTHING;

-- Update first trade dates for users who have made trades
UPDATE user_acquisition 
SET first_trade_date = (
    SELECT MIN(opened_at)
    FROM deals 
    WHERE deals.user_id = user_acquisition.user_id
)
WHERE first_trade_date IS NULL 
AND EXISTS (
    SELECT 1 FROM deals WHERE deals.user_id = user_acquisition.user_id
);

-- Comments for documentation
COMMENT ON TABLE user_sessions IS 'Tracks user session data for engagement analytics';
COMMENT ON TABLE user_acquisition IS 'Tracks user acquisition funnel and attribution';
COMMENT ON TABLE ad_events IS 'Records all ad-related events for performance analysis';
COMMENT ON TABLE daily_metrics IS 'Pre-aggregated daily metrics for fast BI queries';
COMMENT ON TABLE user_cohorts IS 'User cohort data for retention analysis';

COMMENT ON COLUMN user_sessions.virtual_balance_used IS 'Amount of virtual balance used during session';
COMMENT ON COLUMN user_acquisition.acquisition_source IS 'Where the user came from (organic, ads, referral)';
COMMENT ON COLUMN ad_events.revenue IS 'Estimated revenue from this ad event in USD';
COMMENT ON COLUMN daily_metrics.arpu IS 'Average Revenue Per User for this day';
COMMENT ON COLUMN daily_metrics.arppu IS 'Average Revenue Per Paying User for this day';

-- Create a view for easy BI reporting
CREATE OR REPLACE VIEW analytics_overview AS
SELECT 
    dm.date,
    dm.daily_active_users,
    dm.new_installs,
    dm.new_signups,
    dm.total_revenue,
    dm.ad_revenue,
    dm.retention_d1,
    dm.retention_d7,
    dm.retention_d30,
    dm.arpu,
    dm.arppu,
    dm.ctr
FROM daily_metrics dm
ORDER BY dm.date DESC;

COMMENT ON VIEW analytics_overview IS 'Simplified view of key daily metrics for BI dashboards';

-- Grant appropriate permissions
GRANT SELECT ON analytics_overview TO PUBLIC;
GRANT SELECT ON user_sessions TO PUBLIC;
GRANT SELECT ON user_acquisition TO PUBLIC;
GRANT SELECT ON ad_events TO PUBLIC;
GRANT SELECT ON daily_metrics TO PUBLIC;
GRANT SELECT ON user_cohorts TO PUBLIC;

-- Success message
SELECT 'CryptoCraze Enhanced Analytics System setup completed successfully!' as message;