/*
  Warnings:

  - You are about to drop the column `doctor_id` on the `DoctorAppoinment` table. All the data in the column will be lost.
  - You are about to drop the column `time_meet` on the `DoctorAppoinment` table. All the data in the column will be lost.
  - You are about to drop the column `user_code` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id_history]` on the table `DoctorRecipe` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `booking_date` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `practice_id` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `queue_number` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DoctorAppoinment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `id_history` to the `DoctorRecipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `address` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birth_date` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `phone` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "DoctorAppoinment" DROP CONSTRAINT "DoctorAppoinment_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorAppoinment" DROP CONSTRAINT "DoctorAppoinment_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorRecipe" DROP CONSTRAINT "DoctorRecipe_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorRecipe" DROP CONSTRAINT "DoctorRecipe_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorRecipe" DROP CONSTRAINT "DoctorRecipe_pharmacist_id_fkey";

-- AlterTable
ALTER TABLE "DoctorAppoinment" DROP COLUMN "doctor_id",
DROP COLUMN "time_meet",
ADD COLUMN     "booking_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "practice_id" TEXT NOT NULL,
ADD COLUMN     "queue_number" INTEGER NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DoctorRecipe" ADD COLUMN     "id_history" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "user_code",
ADD COLUMN     "address" TEXT NOT NULL,
ADD COLUMN     "birth_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "phone" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Departmen" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "departmen_code" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Departmen_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "medical_record_number" TEXT NOT NULL,

    CONSTRAINT "Patient_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "staff_code" TEXT NOT NULL,
    "departmen_id" TEXT NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorPractice" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "practice_date" TIMESTAMP(3) NOT NULL,
    "start_hour" TEXT NOT NULL,
    "end_hour" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,

    CONSTRAINT "DoctorPractice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MedicalHistory" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appoinment_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "complaint" TEXT NOT NULL,
    "diagnosis" TEXT NOT NULL,
    "notes" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MedicalHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Patient_user_id_key" ON "Patient"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_user_id_key" ON "Employee"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "MedicalHistory_appoinment_id_key" ON "MedicalHistory"("appoinment_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorRecipe_id_history_key" ON "DoctorRecipe"("id_history");

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmen_id_fkey" FOREIGN KEY ("departmen_id") REFERENCES "Departmen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPractice" ADD CONSTRAINT "DoctorPractice_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppoinment" ADD CONSTRAINT "DoctorAppoinment_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "DoctorPractice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppoinment" ADD CONSTRAINT "DoctorAppoinment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_appoinment_id_fkey" FOREIGN KEY ("appoinment_id") REFERENCES "DoctorAppoinment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MedicalHistory" ADD CONSTRAINT "MedicalHistory_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_id_history_fkey" FOREIGN KEY ("id_history") REFERENCES "MedicalHistory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
