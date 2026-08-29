/*
  Warnings:

  - You are about to drop the column `slots_practice_id` on the `DoctorAppoinment` table. All the data in the column will be lost.
  - You are about to drop the `SlotsPractice` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `slot_practice_id` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SlotStatus" AS ENUM ('OPEN', 'CLOSED');

-- DropForeignKey
ALTER TABLE "DoctorAppoinment" DROP CONSTRAINT "DoctorAppoinment_slots_practice_id_fkey";

-- DropForeignKey
ALTER TABLE "SlotsPractice" DROP CONSTRAINT "SlotsPractice_practice_id_fkey";

-- AlterTable
ALTER TABLE "DoctorAppoinment" DROP COLUMN "slots_practice_id",
ADD COLUMN     "slot_practice_id" TEXT NOT NULL;

-- DropTable
DROP TABLE "SlotsPractice";

-- DropEnum
DROP TYPE "SlotsStatus";

-- CreateTable
CREATE TABLE "SlotPractice" (
    "id" TEXT NOT NULL,
    "practice_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_hour" TEXT NOT NULL,
    "end_hour" TEXT NOT NULL,
    "status_slot" "SlotStatus" NOT NULL DEFAULT 'OPEN',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "max_patient" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SlotPractice_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "SlotPractice" ADD CONSTRAINT "SlotPractice_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "DoctorPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppoinment" ADD CONSTRAINT "DoctorAppoinment_slot_practice_id_fkey" FOREIGN KEY ("slot_practice_id") REFERENCES "SlotPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
