-- Ad Performance Metrics Table Migration
-- Created: 2025-08-30
-- Description: Add ad performance tracking table for CPI, CPA, ROAS metrics

-- Ad Performance Metrics Table
CREATE TABLE IF NOT EXISTS "ad_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_ad_spend" numeric(18, 2) DEFAULT '0',
	"total_installs" integer DEFAULT 0,
	"total_conversions" integer DEFAULT 0,
	"total_revenue" numeric(18, 2) DEFAULT '0',
	"cpi" numeric(8, 2) DEFAULT '0',
	"cpa" numeric(8, 2) DEFAULT '0',
	"roas" numeric(8, 4) DEFAULT '0',
	"ad_impressions" bigint DEFAULT 0,
	"ad_clicks" integer DEFAULT 0,
	"click_through_rate" numeric(5, 4) DEFAULT '0',
	"conversion_rate" numeric(5, 4) DEFAULT '0',
	"avg_revenue_per_install" numeric(8, 2) DEFAULT '0'
);

-- Create Indexes for Performance
CREATE INDEX IF NOT EXISTS "idx_ad_performance_date" ON "ad_performance_metrics" ("date");

-- Add unique constraint to prevent duplicates
ALTER TABLE "ad_performance_metrics" ADD CONSTRAINT "ad_performance_metrics_date_unique" UNIQUE("date");

-- Insert sample data for testing
INSERT INTO "ad_performance_metrics" (date, total_ad_spend, total_installs, total_conversions, total_revenue, cpi, cpa, roas, ad_impressions, ad_clicks, click_through_rate, conversion_rate, avg_revenue_per_install)
VALUES 
  (CURRENT_DATE - INTERVAL '4 days', '1200.00', 48, 32, '2400.00', '25.00', '37.50', '2.0000', 120000, 960, '0.0080', '0.0333', '50.00'),
  (CURRENT_DATE - INTERVAL '3 days', '1500.00', 60, 40, '3200.00', '25.00', '37.50', '2.1333', 150000, 1200, '0.0080', '0.0333', '53.33'),
  (CURRENT_DATE - INTERVAL '2 days', '900.00', 36, 24, '1800.00', '25.00', '37.50', '2.0000', 90000, 720, '0.0080', '0.0333', '50.00'),
  (CURRENT_DATE - INTERVAL '1 day', '1800.00', 72, 48, '4320.00', '25.00', '37.50', '2.4000', 180000, 1440, '0.0080', '0.0333', '60.00'),
  (CURRENT_DATE, '1300.00', 52, 35, '2800.00', '25.00', '37.14', '2.1538', 130000, 1040, '0.0080', '0.0337', '53.85')
ON CONFLICT (date) DO NOTHING;