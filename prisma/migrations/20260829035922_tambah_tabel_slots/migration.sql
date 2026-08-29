/*
  Warnings:

  - You are about to drop the column `booking_date` on the `DoctorAppoinment` table. All the data in the column will be lost.
  - You are about to drop the column `practice_id` on the `DoctorAppoinment` table. All the data in the column will be lost.
  - The `status` column on the `DoctorAppoinment` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `capacity` on the `DoctorPractice` table. All the data in the column will be lost.
  - You are about to drop the column `end_hour` on the `DoctorPractice` table. All the data in the column will be lost.
  - You are about to drop the column `start_hour` on the `DoctorPractice` table. All the data in the column will be lost.
  - Added the required column `slots_practice_id` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SlotsStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "AppoinmentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "DoctorAppoinment" DROP CONSTRAINT "DoctorAppoinment_practice_id_fkey";

-- AlterTable
ALTER TABLE "DoctorAppoinment" DROP COLUMN "booking_date",
DROP COLUMN "practice_id",
ADD COLUMN     "slots_practice_id" TEXT NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AppoinmentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "DoctorPractice" DROP COLUMN "capacity",
DROP COLUMN "end_hour",
DROP COLUMN "start_hour";

-- CreateTable
CREATE TABLE "SlotsPractice" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_hour" TEXT NOT NULL,
    "end_hour" TEXT NOT NULL,
    "status_slots" "SlotsStatus" NOT NULL DEFAULT 'OPEN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_patient" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotsPractice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlotsPractice" ADD CONSTRAINT "SlotsPractice_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "DoctorPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppoinment" ADD CONSTRAINT "DoctorAppoinment_slots_practice_id_fkey" FOREIGN KEY ("slots_practice_id") REFERENCES "SlotsPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
