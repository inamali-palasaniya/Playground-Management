-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "man_of_the_match_id" INTEGER;

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "man_of_the_series_id" INTEGER;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "password" TEXT;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_man_of_the_series_id_fkey" FOREIGN KEY ("man_of_the_series_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_man_of_the_match_id_fkey" FOREIGN KEY ("man_of_the_match_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_bowler_id_fkey" FOREIGN KEY ("bowler_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_striker_id_fkey" FOREIGN KEY ("striker_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
