-- SQL Migration for Subscription Management Tables
-- Run this in Supabase SQL Editor

-- Create LedgerType enum
DO $$ BEGIN
    CREATE TYPE "LedgerType" AS ENUM ('DAILY_FEE', 'MONTHLY_FEE', 'FINE', 'PAYMENT', 'DEPOSIT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SubscriptionStatus enum (add CANCELLED if not exists)
DO $$ BEGIN
    ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'CANCELLED';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create SubscriptionPlan table
CREATE TABLE IF NOT EXISTS "SubscriptionPlan" (
    "id" SERIAL PRIMARY KEY,
    "name" TEXT UNIQUE NOT NULL,
    "rate_daily" DOUBLE PRECISION,
    "rate_monthly" DOUBLE PRECISION,
    "is_deposit_required" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Update Subscription table (add createdAt and indexes)
ALTER TABLE "Subscription" 
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "Subscription_user_id_idx" ON "Subscription"("user_id");
CREATE INDEX IF NOT EXISTS "Subscription_plan_id_idx" ON "Subscription"("plan_id");

-- Update Attendance table
ALTER TABLE "Attendance"
ALTER COLUMN "date" TYPE DATE,
ALTER COLUMN "daily_fee_charged" DROP NOT NULL,
ALTER COLUMN "daily_fee_charged" DROP DEFAULT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE UNIQUE INDEX IF NOT EXISTS "Attendance_user_id_date_key" ON "Attendance"("user_id", "date");
CREATE INDEX IF NOT EXISTS "Attendance_user_id_idx" ON "Attendance"("user_id");
CREATE INDEX IF NOT EXISTS "Attendance_date_idx" ON "Attendance"("date");

-- Update FeeLedger table
ALTER TABLE "FeeLedger"
DROP COLUMN IF EXISTS "type" CASCADE;

ALTER TABLE "FeeLedger"
ADD COLUMN "type" "LedgerType" NOT NULL DEFAULT 'DAILY_FEE',
ADD COLUMN IF NOT EXISTS "notes" TEXT,
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "FeeLedger_user_id_idx" ON "FeeLedger"("user_id");
CREATE INDEX IF NOT EXISTS "FeeLedger_is_paid_idx" ON "FeeLedger"("is_paid");

-- Update FineRule table
ALTER TABLE "FineRule"
ADD CONSTRAINT IF NOT EXISTS "FineRule_name_key" UNIQUE ("name"),
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update UserFine table
ALTER TABLE "UserFine"
ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX IF NOT EXISTS "UserFine_user_id_idx" ON "UserFine"("user_id");
CREATE INDEX IF NOT EXISTS "UserFine_rule_id_idx" ON "UserFine"("rule_id");

-- Insert sample subscription plans
INSERT INTO "SubscriptionPlan" ("name", "rate_daily", "rate_monthly", "is_deposit_required")
VALUES 
    ('Daily Package', 100, NULL, false),
    ('Monthly - No Deposit', NULL, 400, false),
    ('Monthly - With Deposit', NULL, 300, true)
ON CONFLICT ("name") DO NOTHING;
