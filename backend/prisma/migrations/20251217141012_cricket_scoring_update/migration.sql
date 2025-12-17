-- AlterTable
ALTER TABLE "BallEvent" ADD COLUMN     "batting_team_id" INTEGER,
ADD COLUMN     "innings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "non_striker_id" INTEGER;

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "current_innings" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "is_completed" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "result_description" TEXT,
ADD COLUMN     "toss_decision" TEXT,
ADD COLUMN     "toss_winner_id" INTEGER,
ADD COLUMN     "winning_team_id" INTEGER;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_toss_winner_id_fkey" FOREIGN KEY ("toss_winner_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_winning_team_id_fkey" FOREIGN KEY ("winning_team_id") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BallEvent" ADD CONSTRAINT "BallEvent_non_striker_id_fkey" FOREIGN KEY ("non_striker_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
