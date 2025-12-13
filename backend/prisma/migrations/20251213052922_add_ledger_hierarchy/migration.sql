-- AlterTable
ALTER TABLE "FeeLedger" ADD COLUMN     "parent_ledger_id" INTEGER;

-- CreateIndex
CREATE INDEX "FeeLedger_parent_ledger_id_idx" ON "FeeLedger"("parent_ledger_id");

-- AddForeignKey
ALTER TABLE "FeeLedger" ADD CONSTRAINT "FeeLedger_parent_ledger_id_fkey" FOREIGN KEY ("parent_ledger_id") REFERENCES "FeeLedger"("id") ON DELETE SET NULL ON UPDATE CASCADE;
