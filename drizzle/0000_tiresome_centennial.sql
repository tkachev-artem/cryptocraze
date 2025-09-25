CREATE TYPE "public"."ad_placement" AS ENUM('task_completion', 'wheel_spin', 'box_opening', 'trading_bonus', 'screen_transition');--> statement-breakpoint
CREATE TYPE "public"."ad_provider" AS ENUM('google_admob', 'google_adsense', 'simulation');--> statement-breakpoint
CREATE TYPE "public"."ad_reward_type" AS ENUM('money', 'coins', 'energy', 'trading_bonus');--> statement-breakpoint
CREATE TYPE "public"."ad_type" AS ENUM('rewarded_video', 'interstitial', 'banner', 'native');--> statement-breakpoint
CREATE TYPE "public"."box_type" AS ENUM('red', 'green', 'x');--> statement-breakpoint
CREATE TYPE "public"."notification_type" AS ENUM('auto_close_trade', 'daily_reward', 'personal_messages', 'maintenance', 'trade_opened', 'trade_closed', 'achievement_unlocked', 'system_alert');--> statement-breakpoint
CREATE TYPE "public"."prize_type" AS ENUM('money', 'pro');--> statement-breakpoint
CREATE TABLE "ad_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"session_id" varchar(255),
	"ad_type" varchar(30) NOT NULL,
	"ad_network" varchar(50),
	"ad_unit_id" varchar(100),
	"event_type" varchar(30) NOT NULL,
	"reward_amount" numeric(18, 8),
	"reward_type" varchar(20),
	"revenue" numeric(10, 6),
	"timestamp" timestamp DEFAULT now(),
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "ad_performance_analytics" (
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
--> statement-breakpoint
CREATE TABLE "ad_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL,
	"ad_type" "ad_type" NOT NULL,
	"placement" "ad_placement" NOT NULL,
	"provider" "ad_provider" NOT NULL,
	"impressions" integer DEFAULT 0,
	"completions" integer DEFAULT 0,
	"rewards" integer DEFAULT 0,
	"fraud_attempts" integer DEFAULT 0,
	"total_watch_time" bigint DEFAULT 0,
	"total_reward_amount" numeric(18, 8) DEFAULT '0',
	"revenue" numeric(18, 8) DEFAULT '0',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ad_rewards" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" varchar NOT NULL,
	"reward_type" "ad_reward_type" NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"multiplier" numeric(5, 2) DEFAULT '1.00',
	"bonus_percentage" integer,
	"processed" boolean DEFAULT false,
	"processed_at" timestamp,
	"error_message" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "ad_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" varchar NOT NULL,
	"ad_id" varchar(100) NOT NULL,
	"ad_type" "ad_type" NOT NULL,
	"placement" "ad_placement" NOT NULL,
	"provider" "ad_provider" DEFAULT 'simulation' NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"watch_time" integer,
	"completed" boolean DEFAULT false,
	"reward_claimed" boolean DEFAULT false,
	"fraud_detected" boolean DEFAULT false,
	"fraud_reason" text,
	"ip_address" varchar(45),
	"user_agent" text,
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "analytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar,
	"event_type" varchar(50) NOT NULL,
	"event_data" jsonb,
	"timestamp" timestamp DEFAULT now(),
	"session_id" varchar,
	"user_agent" text,
	"ip_address" varchar(45),
	"country" varchar(2)
);
--> statement-breakpoint
CREATE TABLE "box_openings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"box_type_id" integer NOT NULL,
	"prize_id" integer NOT NULL,
	"prize_type" "prize_type" NOT NULL,
	"amount" numeric(15, 2),
	"pro_days" integer,
	"energy_spent" integer NOT NULL,
	"opened_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "box_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" "box_type" NOT NULL,
	"name" varchar(50) NOT NULL,
	"required_energy" integer NOT NULL,
	"description" text,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "box_types_type_unique" UNIQUE("type")
);
--> statement-breakpoint
CREATE TABLE "cohort_analysis" (
	"id" serial PRIMARY KEY NOT NULL,
	"cohort_week" timestamp NOT NULL,
	"period_number" integer NOT NULL,
	"users_count" integer NOT NULL,
	"retention_rate" numeric(5, 4),
	"total_revenue" numeric(18, 2) DEFAULT '0',
	"avg_revenue_per_user" numeric(18, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "daily_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"new_installs" integer DEFAULT 0,
	"new_signups" integer DEFAULT 0,
	"new_first_trades" integer DEFAULT 0,
	"daily_active_users" integer DEFAULT 0,
	"total_sessions" integer DEFAULT 0,
	"avg_session_duration" numeric(10, 2),
	"total_trades_opened" integer DEFAULT 0,
	"total_screens_opened" integer DEFAULT 0,
	"avg_virtual_balance_used" numeric(18, 8),
	"retention_d1" numeric(5, 2),
	"retention_d3" numeric(5, 2),
	"retention_d7" numeric(5, 2),
	"retention_d30" numeric(5, 2),
	"total_revenue" numeric(15, 2) DEFAULT '0',
	"premium_subscriptions" integer DEFAULT 0,
	"arpu" numeric(10, 2),
	"arppu" numeric(10, 2),
	"ad_impressions" integer DEFAULT 0,
	"ad_clicks" integer DEFAULT 0,
	"ad_rewards" integer DEFAULT 0,
	"ad_revenue" numeric(15, 2) DEFAULT '0',
	"ctr" numeric(5, 2),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "deals" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(32) NOT NULL,
	"symbol" varchar(16) NOT NULL,
	"direction" varchar(8) NOT NULL,
	"amount" numeric(18, 8) NOT NULL,
	"multiplier" integer NOT NULL,
	"open_price" numeric(18, 8) NOT NULL,
	"take_profit" numeric(18, 8),
	"stop_loss" numeric(18, 8),
	"opened_at" timestamp DEFAULT now() NOT NULL,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"closed_at" timestamp,
	"close_price" numeric(18, 8),
	"profit" numeric(18, 8)
);
--> statement-breakpoint
CREATE TABLE "engagement_metrics" (
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
--> statement-breakpoint
CREATE TABLE "premium_plans" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	"plan_type" varchar(20) NOT NULL,
	"price" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RUB',
	"features" jsonb,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "premium_subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"telegram_id" varchar(50),
	"payment_id" varchar(100) NOT NULL,
	"plan_type" varchar(20) NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(3) DEFAULT 'RUB',
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"expires_at" timestamp,
	"is_active" boolean DEFAULT false,
	CONSTRAINT "premium_subscriptions_payment_id_unique" UNIQUE("payment_id")
);
--> statement-breakpoint
CREATE TABLE "prizes" (
	"id" serial PRIMARY KEY NOT NULL,
	"box_type_id" integer NOT NULL,
	"prize_type" "prize_type" NOT NULL,
	"amount" numeric(15, 2),
	"pro_days" integer,
	"chance" numeric(5, 2) NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "revenue_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"date" timestamp NOT NULL,
	"total_revenue" numeric(18, 2) DEFAULT '0',
	"premium_revenue" numeric(18, 2) DEFAULT '0',
	"ad_revenue" numeric(18, 2) DEFAULT '0',
	"total_paying_users" integer DEFAULT 0,
	"active_paying_users" integer DEFAULT 0,
	"new_paying_users" integer DEFAULT 0,
	"arpu" numeric(18, 2) DEFAULT '0',
	"arppu" numeric(18, 2) DEFAULT '0',
	"conversion_rate" numeric(5, 4),
	"churn_rate" numeric(5, 4),
	"lifetime_value" numeric(18, 2) DEFAULT '0'
);
--> statement-breakpoint
CREATE TABLE "reward_tiers" (
	"id" serial PRIMARY KEY NOT NULL,
	"level" integer NOT NULL,
	"account_money" integer NOT NULL,
	"reward" integer NOT NULL,
	"pro_days" integer,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "reward_tiers_level_unique" UNIQUE("level")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"template_id" varchar(100) NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"reward_type" varchar(20) NOT NULL,
	"reward_amount" varchar(50) NOT NULL,
	"progress_total" integer NOT NULL,
	"icon" varchar(255),
	"category" varchar(20) NOT NULL,
	"rarity" varchar(20) NOT NULL,
	"expires_in_hours" integer DEFAULT 24 NOT NULL,
	"is_active" boolean DEFAULT true,
	"created_by" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "task_templates_template_id_unique" UNIQUE("template_id")
);
--> statement-breakpoint
CREATE TABLE "user_acquisition" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"install_date" timestamp DEFAULT now() NOT NULL,
	"first_open_date" timestamp,
	"signup_date" timestamp,
	"first_trade_date" timestamp,
	"acquisition_source" varchar(100),
	"campaign_id" varchar(100),
	"ad_group_id" varchar(100),
	"creative_id" varchar(100),
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"referral_code" varchar(50),
	"created_at" timestamp DEFAULT now(),
	CONSTRAINT "user_acquisition_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "user_acquisition_metrics" (
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
--> statement-breakpoint
CREATE TABLE "user_cohorts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"cohort_date" timestamp NOT NULL,
	"days_since_install" integer NOT NULL,
	"is_active" boolean DEFAULT false,
	"trades_count" integer DEFAULT 0,
	"session_duration" integer DEFAULT 0,
	"virtual_balance_used" numeric(18, 8) DEFAULT '0',
	"record_date" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_daily_stats" (
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
--> statement-breakpoint
CREATE TABLE "user_notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"type" "notification_type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"is_active" boolean DEFAULT true,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"session_id" varchar(255) NOT NULL,
	"start_time" timestamp DEFAULT now() NOT NULL,
	"end_time" timestamp,
	"duration" integer,
	"screens_opened" integer DEFAULT 0,
	"trades_opened" integer DEFAULT 0,
	"ads_watched" integer DEFAULT 0,
	"virtual_balance_used" numeric(18, 8) DEFAULT '0',
	"device_info" jsonb,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "user_tasks" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"task_type" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"reward_type" varchar(20) NOT NULL,
	"reward_amount" varchar(50) NOT NULL,
	"progress_current" integer DEFAULT 0,
	"progress_total" integer NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"icon" varchar(255),
	"created_at" timestamp DEFAULT now(),
	"completed_at" timestamp,
	"expires_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar PRIMARY KEY NOT NULL,
	"email" varchar,
	"first_name" varchar,
	"last_name" varchar,
	"profile_image_url" varchar,
	"phone" varchar,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"balance" numeric(15, 2) DEFAULT '10000.00',
	"coins" integer DEFAULT 0,
	"free_balance" numeric(18, 8) DEFAULT '0',
	"rating_score" integer DEFAULT 0,
	"rating_rank_30_days" integer,
	"trades_count" integer DEFAULT 0,
	"total_trades_volume" numeric(15, 2) DEFAULT '0.00',
	"successful_trades_percentage" numeric(5, 2) DEFAULT '0.00',
	"max_profit" numeric(15, 2) DEFAULT '0.00',
	"max_loss" numeric(15, 2) DEFAULT '0.00',
	"average_trade_amount" numeric(15, 2) DEFAULT '0.00',
	"rewards_count" integer DEFAULT 0,
	"last_claim" timestamp,
	"streak" integer DEFAULT 0,
	"energy_tasks_bonus" integer DEFAULT 0,
	"is_premium" boolean DEFAULT false,
	"premium_expires_at" timestamp,
	"role" varchar(20) DEFAULT 'user',
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "ad_events" ADD CONSTRAINT "ad_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_rewards" ADD CONSTRAINT "ad_rewards_session_id_ad_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ad_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_rewards" ADD CONSTRAINT "ad_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ad_sessions" ADD CONSTRAINT "ad_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_openings" ADD CONSTRAINT "box_openings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_openings" ADD CONSTRAINT "box_openings_box_type_id_box_types_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."box_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_openings" ADD CONSTRAINT "box_openings_prize_id_prizes_id_fk" FOREIGN KEY ("prize_id") REFERENCES "public"."prizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_subscriptions" ADD CONSTRAINT "premium_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_box_type_id_box_types_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."box_types"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_acquisition" ADD CONSTRAINT "user_acquisition_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_cohorts" ADD CONSTRAINT "user_cohorts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_daily_stats" ADD CONSTRAINT "user_daily_stats_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_ad_events_user_id" ON "ad_events" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ad_events_timestamp" ON "ad_events" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_ad_events_type" ON "ad_events" USING btree ("ad_type","event_type");--> statement-breakpoint
CREATE INDEX "idx_ad_events_session_id" ON "ad_events" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ad_performance_analytics_date" ON "ad_performance_analytics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_ad_performance_date" ON "ad_performance_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_ad_performance_type_placement" ON "ad_performance_metrics" USING btree ("ad_type","placement");--> statement-breakpoint
CREATE INDEX "idx_ad_rewards_session_id" ON "ad_rewards" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_ad_rewards_user_id" ON "ad_rewards" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ad_rewards_processed" ON "ad_rewards" USING btree ("processed");--> statement-breakpoint
CREATE INDEX "idx_ad_rewards_created_at" ON "ad_rewards" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "idx_ad_sessions_user_id" ON "ad_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_ad_sessions_ad_id" ON "ad_sessions" USING btree ("ad_id");--> statement-breakpoint
CREATE INDEX "idx_ad_sessions_placement" ON "ad_sessions" USING btree ("placement");--> statement-breakpoint
CREATE INDEX "idx_ad_sessions_start_time" ON "ad_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_ad_sessions_completed" ON "ad_sessions" USING btree ("completed");--> statement-breakpoint
CREATE INDEX "idx_ad_sessions_fraud_detected" ON "ad_sessions" USING btree ("fraud_detected");--> statement-breakpoint
CREATE INDEX "idx_analytics_user_id" ON "analytics" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_event_type" ON "analytics" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "idx_analytics_timestamp" ON "analytics" USING btree ("timestamp");--> statement-breakpoint
CREATE INDEX "idx_analytics_session_id" ON "analytics" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_analytics_country" ON "analytics" USING btree ("country");--> statement-breakpoint
CREATE INDEX "idx_cohort_week_period" ON "cohort_analysis" USING btree ("cohort_week","period_number");--> statement-breakpoint
CREATE INDEX "idx_daily_metrics_date" ON "daily_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_engagement_date" ON "engagement_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_revenue_date" ON "revenue_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");--> statement-breakpoint
CREATE INDEX "idx_user_acquisition_install_date" ON "user_acquisition" USING btree ("install_date");--> statement-breakpoint
CREATE INDEX "idx_user_acquisition_source" ON "user_acquisition" USING btree ("acquisition_source");--> statement-breakpoint
CREATE INDEX "idx_user_acquisition_first_trade" ON "user_acquisition" USING btree ("first_trade_date");--> statement-breakpoint
CREATE INDEX "idx_acquisition_date" ON "user_acquisition_metrics" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_user_cohorts_cohort_date" ON "user_cohorts" USING btree ("cohort_date");--> statement-breakpoint
CREATE INDEX "idx_user_cohorts_user_id" ON "user_cohorts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_cohorts_record_date" ON "user_cohorts" USING btree ("record_date");--> statement-breakpoint
CREATE INDEX "idx_user_cohorts_days_since" ON "user_cohorts" USING btree ("days_since_install");--> statement-breakpoint
CREATE INDEX "idx_user_daily_stats_user_date" ON "user_daily_stats" USING btree ("user_id","date");--> statement-breakpoint
CREATE INDEX "idx_user_daily_stats_date" ON "user_daily_stats" USING btree ("date");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_user_id" ON "user_sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_start_time" ON "user_sessions" USING btree ("start_time");--> statement-breakpoint
CREATE INDEX "idx_user_sessions_session_id" ON "user_sessions" USING btree ("session_id");