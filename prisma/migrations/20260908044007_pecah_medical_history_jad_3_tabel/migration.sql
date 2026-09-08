/*
  Warnings:

  - You are about to drop the column `id_history` on the `DoctorRecipe` table. All the data in the column will be lost.
  - You are about to drop the `MedicalHistory` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[visit_id]` on the table `DoctorRecipe` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `visit_id` to the `DoctorRecipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `age` to the `Patient` table without a default value. This is not possible if the table is not empty.
  - Added the required column `name` to the `Patient` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('REGISTERED', 'NURSE_CHECKED', 'DOCTOR_EXAMINED', 'CANCELLED', 'COMPLETED');

-- DropForeignKey
ALTER TABLE "Departmen" DROP CONSTRAINT "Departmen_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorPractice" DROP CONSTRAINT "DoctorPractice_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorRecipe" DROP CONSTRAINT "DoctorRecipe_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "DoctorRecipe" DROP CONSTRAINT "DoctorRecipe_id_history_fkey";

-- DropForeignKey
ALTER TABLE "Employee" DROP CONSTRAINT "Employee_user_id_fkey";

-- DropForeignKey
ALTER TABLE "Hospital" DROP CONSTRAINT "Hospital_user_id_fkey";

-- DropForeignKey
ALTER TABLE "InventoryLogs" DROP CONSTRAINT "InventoryLogs_user_id_fkey";

-- DropForeignKey
ALTER TABLE "MedicalHistory" DROP CONSTRAINT "MedicalHistory_appoinment_id_fkey";

-- DropForeignKey
ALTER TABLE "MedicalHistory" DROP CONSTRAINT "MedicalHistory_doctor_id_fkey";

-- DropForeignKey
ALTER TABLE "MedicalHistory" DROP CONSTRAINT "MedicalHistory_patient_id_fkey";

-- DropForeignKey
ALTER TABLE "Patient" DROP CONSTRAINT "Patient_user_id_fkey";

-- DropForeignKey
ALTER TABLE "RecipeDetail" DROP CONSTRAINT "RecipeDetail_recipe_id_fkey";

-- DropForeignKey
ALTER TABLE "SlotPractice" DROP CONSTRAINT "SlotPractice_practice_id_fkey";

-- DropIndex
DROP INDEX "DoctorRecipe_id_history_key";

-- DropIndex
DROP INDEX "Patient_user_id_key";

-- AlterTable
ALTER TABLE "DoctorPractice" ALTER COLUMN "doctor_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DoctorRecipe" DROP COLUMN "id_history",
ADD COLUMN     "visit_id" TEXT NOT NULL,
ALTER COLUMN "patient_id" DROP NOT NULL,
ALTER COLUMN "doctor_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Employee" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'LAKILAKI',
ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Hospital" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "InventoryLogs" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Patient" ADD COLUMN     "age" INTEGER NOT NULL,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'LAKILAKI',
ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "medicine_allergy" TEXT,
ADD COLUMN     "name" TEXT NOT NULL,
ALTER COLUMN "user_id" DROP NOT NULL;

-- DropTable
DROP TABLE "MedicalHistory";

-- CreateTable
CREATE TABLE "Visit" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appoinment_id" TEXT NOT NULL,
    "status" "VisitStatus" NOT NULL DEFAULT 'REGISTERED',
    "complaint" TEXT,
    "detail_sympton" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Visit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NursingAssesment" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "nurse_id" TEXT,
    "sistolic" INTEGER,
    "diastolic" INTEGER,
    "heart_rate" INTEGER,
    "respiratory_rate" INTEGER,
    "temperature" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "NursingAssesment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAssesment" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "doctor_id" TEXT,
    "subjective" TEXT,
    "objective" TEXT,
    "assessment" TEXT,
    "plan" TEXT,
    "doctorNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAssesment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Visit_appoinment_id_key" ON "Visit"("appoinment_id");

-- CreateIndex
CREATE UNIQUE INDEX "NursingAssesment_visit_id_key" ON "NursingAssesment"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorAssesment_visit_id_key" ON "DoctorAssesment"("visit_id");

-- CreateIndex
CREATE UNIQUE INDEX "DoctorRecipe_visit_id_key" ON "DoctorRecipe"("visit_id");

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departmen" ADD CONSTRAINT "Departmen_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient" ADD CONSTRAINT "Patient_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorPractice" ADD CONSTRAINT "DoctorPractice_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SlotPractice" ADD CONSTRAINT "SlotPractice_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "DoctorPractice"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_appoinment_id_fkey" FOREIGN KEY ("appoinment_id") REFERENCES "DoctorAppoinment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingAssesment" ADD CONSTRAINT "NursingAssesment_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NursingAssesment" ADD CONSTRAINT "NursingAssesment_nurse_id_fkey" FOREIGN KEY ("nurse_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAssesment" ADD CONSTRAINT "DoctorAssesment_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAssesment" ADD CONSTRAINT "DoctorAssesment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeDetail" ADD CONSTRAINT "RecipeDetail_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "DoctorRecipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
