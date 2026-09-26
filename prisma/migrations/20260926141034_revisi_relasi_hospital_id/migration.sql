/*
  Warnings:

  - You are about to alter the column `total_amount` on the `Billing` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `price` on the `BillingItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - You are about to alter the column `subtotal` on the `BillingItem` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Decimal(14,2)`.
  - A unique constraint covering the columns `[hospital_id,code]` on the table `Products` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[product_id,warehouse_id,batch_number]` on the table `StockBatch` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[hospital_id,name]` on the table `Warehouse` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `type` on the `InventoryLogs` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Made the column `warehouse_id` on table `InventoryLogs` required. This step will fail if there are existing NULL values in that column.
  - Made the column `warehouse_id` on table `StockBatch` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `updatedAt` to the `Warehouse` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `WarehouseStock` table without a default value. This is not possible if the table is not empty.
  - Made the column `warehouse_id` on table `WarehouseStock` required. This step will fail if there are existing NULL values in that column.

*/
-- CreateEnum
CREATE TYPE "WarehouseType" AS ENUM ('MAIN', 'PHARMACY', 'LABORATORY', 'POLI', 'IGD', 'OTHER');

-- CreateEnum
CREATE TYPE "InventoryLogType" AS ENUM ('INITIAL', 'PURCHASE', 'RESTOCK', 'TRANSFER_OUT', 'TRANSFER_IN', 'DISPENSE', 'USAGE', 'ADJUSTMENT', 'RETURN');

-- AlterEnum
ALTER TYPE "CategoryDepartmen" ADD VALUE 'LOGISTIC';

-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'LOGISTIC';

-- DropForeignKey
ALTER TABLE "InventoryLogs" DROP CONSTRAINT "InventoryLogs_warehouse_id_fkey";

-- DropIndex
DROP INDEX "Products_code_key";

-- DropIndex
DROP INDEX "WarehouseStock_product_id_warehouse_component_id_key";

-- AlterTable
ALTER TABLE "Billing" ALTER COLUMN "total_amount" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "BillingItem" ALTER COLUMN "price" SET DATA TYPE DECIMAL(14,2),
ALTER COLUMN "subtotal" SET DATA TYPE DECIMAL(14,2);

-- AlterTable
ALTER TABLE "InventoryLogs" ADD COLUMN     "buy_price" DOUBLE PRECISION,
DROP COLUMN "type",
ADD COLUMN     "type" "InventoryLogType" NOT NULL,
ALTER COLUMN "warehouse_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "PatientAllergy" ALTER COLUMN "employee_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Products" ADD COLUMN     "description" TEXT;

-- AlterTable
ALTER TABLE "StockBatch" ADD COLUMN     "buy_price" DOUBLE PRECISION,
ALTER COLUMN "warehouse_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "type" "WarehouseType" NOT NULL DEFAULT 'OTHER',
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- AlterTable
ALTER TABLE "WarehouseStock" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "warehouse_id" SET NOT NULL;

-- CreateTable
CREATE TABLE "VisitUsage" (
    "id" TEXT NOT NULL,
    "visit_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "employee_id" TEXT,
    "quantity" INTEGER NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VisitUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VisitUsage_visit_id_idx" ON "VisitUsage"("visit_id");

-- CreateIndex
CREATE INDEX "VisitUsage_product_id_idx" ON "VisitUsage"("product_id");

-- CreateIndex
CREATE INDEX "Billing_hospital_id_idx" ON "Billing"("hospital_id");

-- CreateIndex
CREATE INDEX "Billing_patient_id_idx" ON "Billing"("patient_id");

-- CreateIndex
CREATE INDEX "BillingItem_billing_id_idx" ON "BillingItem"("billing_id");

-- CreateIndex
CREATE INDEX "Departmen_hospital_id_idx" ON "Departmen"("hospital_id");

-- CreateIndex
CREATE INDEX "DoctorAppoinment_slot_practice_id_idx" ON "DoctorAppoinment"("slot_practice_id");

-- CreateIndex
CREATE INDEX "DoctorAppoinment_patient_id_idx" ON "DoctorAppoinment"("patient_id");

-- CreateIndex
CREATE INDEX "DoctorAssesment_visit_id_idx" ON "DoctorAssesment"("visit_id");

-- CreateIndex
CREATE INDEX "DoctorRecipe_status_idx" ON "DoctorRecipe"("status");

-- CreateIndex
CREATE INDEX "DoctorRecipe_patient_id_idx" ON "DoctorRecipe"("patient_id");

-- CreateIndex
CREATE INDEX "Employee_departmen_id_idx" ON "Employee"("departmen_id");

-- CreateIndex
CREATE INDEX "Hospital_user_id_idx" ON "Hospital"("user_id");

-- CreateIndex
CREATE INDEX "InventoryLogs_hospital_id_createdAt_idx" ON "InventoryLogs"("hospital_id", "createdAt");

-- CreateIndex
CREATE INDEX "InventoryLogs_product_id_idx" ON "InventoryLogs"("product_id");

-- CreateIndex
CREATE INDEX "InventoryLogs_warehouse_id_idx" ON "InventoryLogs"("warehouse_id");

-- CreateIndex
CREATE INDEX "InventoryLogs_type_idx" ON "InventoryLogs"("type");

-- CreateIndex
CREATE INDEX "NursingAssesment_visit_id_idx" ON "NursingAssesment"("visit_id");

-- CreateIndex
CREATE INDEX "Patient_user_id_idx" ON "Patient"("user_id");

-- CreateIndex
CREATE INDEX "Patient_medical_record_number_idx" ON "Patient"("medical_record_number");

-- CreateIndex
CREATE INDEX "PatientAllergy_patient_id_idx" ON "PatientAllergy"("patient_id");

-- CreateIndex
CREATE INDEX "Products_hospital_id_idx" ON "Products"("hospital_id");

-- CreateIndex
CREATE INDEX "Products_category_idx" ON "Products"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Products_hospital_id_code_key" ON "Products"("hospital_id", "code");

-- CreateIndex
CREATE INDEX "RecipeDetail_recipe_id_idx" ON "RecipeDetail"("recipe_id");

-- CreateIndex
CREATE INDEX "RecipeDetail_product_id_idx" ON "RecipeDetail"("product_id");

-- CreateIndex
CREATE INDEX "SlotPractice_practice_id_idx" ON "SlotPractice"("practice_id");

-- CreateIndex
CREATE INDEX "StockBatch_hospital_id_idx" ON "StockBatch"("hospital_id");

-- CreateIndex
CREATE INDEX "StockBatch_product_id_warehouse_id_exp_date_idx" ON "StockBatch"("product_id", "warehouse_id", "exp_date");

-- CreateIndex
CREATE UNIQUE INDEX "StockBatch_product_id_warehouse_id_batch_number_key" ON "StockBatch"("product_id", "warehouse_id", "batch_number");

-- CreateIndex
CREATE INDEX "Visit_patient_id_idx" ON "Visit"("patient_id");

-- CreateIndex
CREATE INDEX "Visit_status_idx" ON "Visit"("status");

-- CreateIndex
CREATE INDEX "Warehouse_hospital_id_idx" ON "Warehouse"("hospital_id");

-- CreateIndex
CREATE INDEX "Warehouse_hospital_id_type_idx" ON "Warehouse"("hospital_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_hospital_id_name_key" ON "Warehouse"("hospital_id", "name");

-- CreateIndex
CREATE INDEX "WarehouseComponent_hospital_id_idx" ON "WarehouseComponent"("hospital_id");

-- CreateIndex
CREATE INDEX "WarehouseComponent_warehouse_id_idx" ON "WarehouseComponent"("warehouse_id");

-- CreateIndex
CREATE INDEX "WarehouseStock_warehouse_id_idx" ON "WarehouseStock"("warehouse_id");

-- CreateIndex
CREATE INDEX "WarehouseStock_product_id_idx" ON "WarehouseStock"("product_id");

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUsage" ADD CONSTRAINT "VisitUsage_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "Visit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUsage" ADD CONSTRAINT "VisitUsage_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUsage" ADD CONSTRAINT "VisitUsage_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUsage" ADD CONSTRAINT "VisitUsage_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Billing" ADD CONSTRAINT "Billing_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
