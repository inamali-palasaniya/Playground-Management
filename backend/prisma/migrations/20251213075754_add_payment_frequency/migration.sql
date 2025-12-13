-- CreateEnum
CREATE TYPE "PaymentFrequency" AS ENUM ('DAILY', 'MONTHLY');

-- AlterTable
ALTER TABLE "Subscription" ADD COLUMN     "payment_frequency" "PaymentFrequency" NOT NULL DEFAULT 'MONTHLY';
