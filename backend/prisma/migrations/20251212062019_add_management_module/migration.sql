/*
  Warnings:

  - You are about to drop the column `subsequent_multiplier` on the `FineRule` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('STUDENT', 'NON_EARNED', 'SALARIED', 'NORMAL');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CASH', 'ONLINE', 'UPI', 'BANK_TRANSFER');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "LedgerType" ADD VALUE 'SUBSCRIPTION';
ALTER TYPE "LedgerType" ADD VALUE 'DONATION';
ALTER TYPE "LedgerType" ADD VALUE 'MAINTENANCE';
ALTER TYPE "LedgerType" ADD VALUE 'OTHER';

-- AlterTable
ALTER TABLE "FeeLedger" ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "transaction_type" "TransactionType" NOT NULL DEFAULT 'DEBIT';

-- AlterTable
ALTER TABLE "FineRule" DROP COLUMN "subsequent_multiplier",
ADD COLUMN     "subsequent_fine" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "age" INTEGER,
ADD COLUMN     "user_type" "UserType" NOT NULL DEFAULT 'NORMAL';
