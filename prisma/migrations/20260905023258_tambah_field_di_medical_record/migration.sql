/*
  Warnings:

  - The values [DOCTOR] on the enum `Role` will be removed. If these variants are still used in the database, this will fail.
  - The `status` column on the `DoctorRecipe` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `hospital_id` to the `Departmen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `DoctorRecipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `detail_sympton` to the `MedicalHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_age` to the `MedicalHistory` table without a default value. This is not possible if the table is not empty.
  - Added the required column `patient_name` to the `MedicalHistory` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- AlterEnum
BEGIN;
CREATE TYPE "Role_new" AS ENUM ('OWNER', 'SUPERADMIN', 'MASTERADMIN', 'REGISTER_ADMIN', 'GENERAL_DOCTOR', 'SPECIALIST_DOCTOR', 'PHARMACIST', 'NURSE', 'PATIENT');
ALTER TABLE "public"."User" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "User" ALTER COLUMN "role" TYPE "Role_new" USING ("role"::text::"Role_new");
ALTER TYPE "Role" RENAME TO "Role_old";
ALTER TYPE "Role_new" RENAME TO "Role";
DROP TYPE "public"."Role_old";
ALTER TABLE "User" ALTER COLUMN "role" SET DEFAULT 'PATIENT';
COMMIT;

-- DropForeignKey
ALTER TABLE "DoctorRecipe" DROP CONSTRAINT "DoctorRecipe_pharmacist_id_fkey";

-- AlterTable
ALTER TABLE "Departmen" ADD COLUMN     "hospital_id" TEXT NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL;

-- AlterTable
ALTER TABLE "DoctorRecipe" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "pharmacist_id" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "RecipeStatus" NOT NULL DEFAULT 'PENDING',
ALTER COLUMN "take_med_date" DROP NOT NULL,
ALTER COLUMN "verify_notes" DROP NOT NULL,
ALTER COLUMN "match_product_recipe" DROP NOT NULL,
ALTER COLUMN "match_product_recipe" SET DEFAULT true;

-- AlterTable
ALTER TABLE "MedicalHistory" ADD COLUMN     "detail_sympton" TEXT NOT NULL,
ADD COLUMN     "patient_age" INTEGER NOT NULL,
ADD COLUMN     "patient_name" TEXT NOT NULL;

-- CreateTable
CREATE TABLE "Hospital" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "hospital_code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Hospital_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Hospital_hospital_code_key" ON "Hospital"("hospital_code");

-- AddForeignKey
ALTER TABLE "Hospital" ADD CONSTRAINT "Hospital_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departmen" ADD CONSTRAINT "Departmen_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DoctorRecipe" ADD CONSTRAINT "DoctorRecipe_pharmacist_id_fkey" FOREIGN KEY ("pharmacist_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
