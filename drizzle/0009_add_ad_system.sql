-- Add ad system enums
DO $$ BEGIN
    CREATE TYPE "public"."ad_type" AS ENUM('rewarded_video', 'interstitial', 'banner', 'native');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."ad_placement" AS ENUM('task_completion', 'wheel_spin', 'box_opening', 'trading_bonus', 'screen_transition');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."ad_provider" AS ENUM('google_admob', 'google_adsense', 'simulation');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "public"."ad_reward_type" AS ENUM('money', 'coins', 'energy', 'trading_bonus');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create ad sessions table
CREATE TABLE IF NOT EXISTS "ad_sessions" (
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

-- Create ad rewards table
CREATE TABLE IF NOT EXISTS "ad_rewards" (
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

-- Create ad performance metrics table
CREATE TABLE IF NOT EXISTS "ad_performance_metrics" (
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

-- Add foreign key constraints
DO $$ BEGIN
    ALTER TABLE "ad_sessions" ADD CONSTRAINT "ad_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ad_rewards" ADD CONSTRAINT "ad_rewards_session_id_ad_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."ad_sessions"("id") ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "ad_rewards" ADD CONSTRAINT "ad_rewards_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS "idx_ad_sessions_user_id" ON "ad_sessions" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ad_sessions_ad_id" ON "ad_sessions" ("ad_id");
CREATE INDEX IF NOT EXISTS "idx_ad_sessions_placement" ON "ad_sessions" ("placement");
CREATE INDEX IF NOT EXISTS "idx_ad_sessions_start_time" ON "ad_sessions" ("start_time");
CREATE INDEX IF NOT EXISTS "idx_ad_sessions_completed" ON "ad_sessions" ("completed");
CREATE INDEX IF NOT EXISTS "idx_ad_sessions_fraud_detected" ON "ad_sessions" ("fraud_detected");

CREATE INDEX IF NOT EXISTS "idx_ad_rewards_session_id" ON "ad_rewards" ("session_id");
CREATE INDEX IF NOT EXISTS "idx_ad_rewards_user_id" ON "ad_rewards" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_ad_rewards_processed" ON "ad_rewards" ("processed");
CREATE INDEX IF NOT EXISTS "idx_ad_rewards_created_at" ON "ad_rewards" ("created_at");

CREATE INDEX IF NOT EXISTS "idx_ad_performance_date" ON "ad_performance_metrics" ("date");
CREATE INDEX IF NOT EXISTS "idx_ad_performance_type_placement" ON "ad_performance_metrics" ("ad_type","placement");

-- Add some default ad performance metrics for today
INSERT INTO "ad_performance_metrics" ("date", "ad_type", "placement", "provider") VALUES
(date_trunc('day', now()), 'rewarded_video', 'task_completion', 'simulation'),
(date_trunc('day', now()), 'rewarded_video', 'wheel_spin', 'simulation'),
(date_trunc('day', now()), 'rewarded_video', 'box_opening', 'simulation'),
(date_trunc('day', now()), 'rewarded_video', 'trading_bonus', 'simulation')
ON CONFLICT DO NOTHING;