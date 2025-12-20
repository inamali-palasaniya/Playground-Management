-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_user_id_fkey";

-- DropForeignKey
ALTER TABLE "BallEvent" DROP CONSTRAINT "BallEvent_bowler_id_fkey";

-- DropForeignKey
ALTER TABLE "BallEvent" DROP CONSTRAINT "BallEvent_striker_id_fkey";

-- DropForeignKey
ALTER TABLE "FeeLedger" DROP CONSTRAINT "FeeLedger_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Team" DROP CONSTRAINT "Team_tournament_id_fkey";

-- DropForeignKey
ALTER TABLE "UserFine" DROP CONSTRAINT "UserFine_user_id_fkey";

-- AlterTable
ALTER TABLE "Permission" ADD COLUMN     "can_view" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeeLedger" ADD CONSTRAINT "FeeLedger_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFine" ADD CONSTRAINT "UserFine_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_tournament_id_fkey" FOREIGN KEY ("tournament_id") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_bowler_id_fkey" FOREIGN KEY ("bowler_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_striker_id_fkey" FOREIGN KEY ("striker_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
