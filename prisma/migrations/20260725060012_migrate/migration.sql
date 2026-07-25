/*
  Warnings:

  - Added the required column `role` to the `User` table without a default value. This is not possible if the table is not empty.
  - Added the required column `user_code` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" TEXT NOT NULL,
ADD COLUMN     "user_code" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Medicine" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "alternate" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "stock" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "expired" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Medicine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorRecipe" (
    "id" TEXT NOT NULL,
    "no_trx" TEXT NOT NULL,
    "recipe_date_exec" TIMESTAMP(3) NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "pharmacist_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "take_med_date" TIMESTAMP(3) NOT NULL,
    "match_medicine_recipe" BOOLEAN NOT NULL,
    "verify_notes" TEXT NOT NULL,

    CONSTRAINT "DoctorRecipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeDetail" (
    "id" TEXT NOT NULL,
    "recipe_id" TEXT NOT NULL,
    "medicine_id" TEXT NOT NULL,
    "rules_using" TEXT NOT NULL,

    CONSTRAINT "RecipeDetail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DoctorAppoinment" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "time_meet" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DoctorAppoinment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeDetail" ADD CONSTRAINT "RecipeDetail_recipe_id_fkey" FOREIGN KEY ("recipe_id") REFERENCES "DoctorRecipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeDetail" ADD CONSTRAINT "RecipeDetail_medicine_id_fkey" FOREIGN KEY ("medicine_id") REFERENCES "Medicine"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppoinment" ADD CONSTRAINT "DoctorAppoinment_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorAppoinment" ADD CONSTRAINT "DoctorAppoinment_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
