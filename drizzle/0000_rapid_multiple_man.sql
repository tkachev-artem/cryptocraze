CREATE TYPE "public"."notification_type" AS ENUM('auto_close_trade', 'daily_reward', 'personal_messages', 'maintenance', 'trade_opened', 'trade_closed', 'achievement_unlocked', 'system_alert');--> statement-breakpoint
CREATE TABLE "achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(50) NOT NULL,
	"name_key" varchar(100) NOT NULL,
	"description_key" varchar(200) NOT NULL,
	"icon_url" varchar,
	"category" varchar(20) NOT NULL,
	"requirement" integer DEFAULT 1,
	"reward" numeric(15, 2) DEFAULT '0.00',
	"is_active" boolean DEFAULT true,
	CONSTRAINT "achievements_key_unique" UNIQUE("key")
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
	"ip_address" varchar(45)
);
--> statement-breakpoint
CREATE TABLE "daily_rewards" (
	"id" serial PRIMARY KEY NOT NULL,
	"day" integer NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"is_special" boolean DEFAULT false
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
CREATE TABLE "loot_boxes" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(20) NOT NULL,
	"prizes" jsonb NOT NULL,
	"is_active" boolean DEFAULT true
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
CREATE TABLE "price_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"pair_id" integer NOT NULL,
	"price" numeric(15, 8) NOT NULL,
	"timestamp" timestamp DEFAULT now(),
	"volume_24h" numeric(20, 2),
	"price_change_24h" real
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"sid" varchar PRIMARY KEY NOT NULL,
	"sess" jsonb NOT NULL,
	"expire" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trades" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"pair_id" integer NOT NULL,
	"direction" varchar(4) NOT NULL,
	"amount" numeric(15, 2) NOT NULL,
	"leverage" integer DEFAULT 1,
	"entry_price" numeric(15, 8) NOT NULL,
	"take_profit_price" numeric(15, 8),
	"stop_loss_price" numeric(15, 8),
	"status" varchar(20) DEFAULT 'open',
	"exit_price" numeric(15, 8),
	"pnl" numeric(15, 2) DEFAULT '0.00',
	"pnl_percentage" real DEFAULT 0,
	"opened_at" timestamp DEFAULT now(),
	"closed_at" timestamp,
	"closure_reason" varchar(20)
);
--> statement-breakpoint
CREATE TABLE "trading_pairs" (
	"id" serial PRIMARY KEY NOT NULL,
	"symbol" varchar(20) NOT NULL,
	"base_asset" varchar(10) NOT NULL,
	"quote_asset" varchar(10) NOT NULL,
	"is_active" boolean DEFAULT true,
	"min_trade_amount" numeric(15, 2) DEFAULT '1.00',
	"max_leverage" integer DEFAULT 50,
	CONSTRAINT "trading_pairs_symbol_unique" UNIQUE("symbol")
);
--> statement-breakpoint
CREATE TABLE "user_achievements" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"achievement_id" integer NOT NULL,
	"progress" integer DEFAULT 0,
	"is_completed" boolean DEFAULT false,
	"completed_at" timestamp,
	"reward_claimed" boolean DEFAULT false
);
--> statement-breakpoint
CREATE TABLE "user_loot_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar NOT NULL,
	"loot_box_id" integer NOT NULL,
	"prize_type" varchar(20) NOT NULL,
	"prize_amount" numeric(15, 2),
	"prize_duration" integer,
	"opened_at" timestamp DEFAULT now()
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
	"is_premium" boolean DEFAULT false,
	"premium_expires_at" timestamp,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "analytics" ADD CONSTRAINT "analytics_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "premium_subscriptions" ADD CONSTRAINT "premium_subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_history" ADD CONSTRAINT "price_history_pair_id_trading_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."trading_pairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trades" ADD CONSTRAINT "trades_pair_id_trading_pairs_id_fk" FOREIGN KEY ("pair_id") REFERENCES "public"."trading_pairs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_achievements" ADD CONSTRAINT "user_achievements_achievement_id_achievements_id_fk" FOREIGN KEY ("achievement_id") REFERENCES "public"."achievements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_loot_history" ADD CONSTRAINT "user_loot_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_loot_history" ADD CONSTRAINT "user_loot_history_loot_box_id_loot_boxes_id_fk" FOREIGN KEY ("loot_box_id") REFERENCES "public"."loot_boxes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "IDX_session_expire" ON "sessions" USING btree ("expire");