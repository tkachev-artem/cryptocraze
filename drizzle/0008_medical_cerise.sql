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
