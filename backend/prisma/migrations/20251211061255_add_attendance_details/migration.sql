-- AlterTable
ALTER TABLE "Attendance" ADD COLUMN     "in_time" TIMESTAMP(3),
ADD COLUMN     "location_lat" DOUBLE PRECISION,
ADD COLUMN     "location_lng" DOUBLE PRECISION,
ADD COLUMN     "out_time" TIMESTAMP(3);
