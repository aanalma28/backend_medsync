/*
  Warnings:

  - Added the required column `updatedAt` to the `DoctorPractice` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('UNPAID', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BillingCategory" AS ENUM ('DRUG', 'DOCTOR_SERVICE', 'NURSE_SERVICE', 'IGD_SERVICE', 'ROOM_FEE', 'LAB_RADIOLOGY', 'OTHER');

-- CreateEnum
CREATE TYPE "ServiceUnit" AS ENUM ('POLI', 'IGD', 'LABORATORY', 'RADIOLOGY');

-- DropIndex
DROP INDEX "DoctorAssesment_visit_id_key";

-- DropIndex
DROP INDEX "NursingAssesment_visit_id_key";

-- AlterTable
ALTER TABLE "DoctorAssesment" ADD COLUMN     "service_unit" "ServiceUnit" NOT NULL DEFAULT 'POLI';

-- AlterTable
ALTER TABLE "DoctorPractice" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "DoctorRecipe" ALTER COLUMN "recipe_date_exec" SET DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "NursingAssesment" ADD COLUMN     "service_unit" "ServiceUnit" NOT NULL DEFAULT 'POLI';

-- AlterTable
ALTER TABLE "RecipeDetail" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "service_unit" "ServiceUnit" NOT NULL DEFAULT 'POLI',
ALTER COLUMN "appoinment_id" DROP NOT NULL;

-- CreateTable
CREATE TABLE "Billing" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "total_amount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
    "status" "BillingStatus" NOT NULL DEFAULT 'UNPAID',
    "payment_method" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Billing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingItem" (
    "id" TEXT NOT NULL,
    "billing_id" TEXT NOT NULL,
    "product_id" TEXT,
    "employee_id" TEXT,
    "item_name" TEXT NOT NULL,
    "category" "BillingCategory" NOT NULL DEFAULT 'OTHER',
    "price" DOUBLE PRECISION NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Billing_visit_id_key" ON "Billing"("visit_id");

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_billing_id_fkey" FOREIGN KEY ("billing_id") REFERENCES "Billing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingItem" ADD CONSTRAINT "BillingItem_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
