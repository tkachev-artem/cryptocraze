-- Migration: Add activePayingUsers column to revenue_metrics table
-- This column tracks the number of users with active subscriptions at any given time

ALTER TABLE "revenue_metrics" ADD COLUMN "active_paying_users" integer DEFAULT 0;

-- Update existing records to set activePayingUsers = totalPayingUsers as a starting point
-- This is a reasonable approximation until the service recalculates with proper logic
UPDATE "revenue_metrics" SET "active_paying_users" = "total_paying_users";