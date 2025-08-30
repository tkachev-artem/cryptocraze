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
ALTER TABLE "user_tasks" ADD CONSTRAINT "user_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;