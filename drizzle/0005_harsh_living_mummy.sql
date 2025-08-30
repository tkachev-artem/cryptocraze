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
ALTER TABLE "task_templates" ADD CONSTRAINT "task_templates_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;