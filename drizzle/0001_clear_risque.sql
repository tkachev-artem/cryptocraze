ALTER TABLE "analytics" ADD COLUMN "country" varchar(2);--> statement-breakpoint
CREATE INDEX "idx_analytics_country" ON "analytics" USING btree ("country");