CREATE TYPE "public"."box_type" AS ENUM('red', 'green', 'x');--> statement-breakpoint
CREATE TYPE "public"."prize_type" AS ENUM('money', 'pro');--> statement-breakpoint
CREATE TABLE "box_openings" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"box_type_id" integer NOT NULL,
	"prize_id" integer NOT NULL,
	"prize_type" "prize_type" NOT NULL,
	"amount" numeric(15, 2),
	"pro_days" integer,
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
ALTER TABLE "box_openings" ADD CONSTRAINT "box_openings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_openings" ADD CONSTRAINT "box_openings_box_type_id_box_types_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."box_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "box_openings" ADD CONSTRAINT "box_openings_prize_id_prizes_id_fk" FOREIGN KEY ("prize_id") REFERENCES "public"."prizes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "prizes" ADD CONSTRAINT "prizes_box_type_id_box_types_id_fk" FOREIGN KEY ("box_type_id") REFERENCES "public"."box_types"("id") ON DELETE cascade ON UPDATE no action;