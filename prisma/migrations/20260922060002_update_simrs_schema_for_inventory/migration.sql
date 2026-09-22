/*
  Warnings:

  - You are about to drop the column `buy_price` on the `InventoryLogs` table. All the data in the column will be lost.
  - You are about to drop the column `exp_date` on the `InventoryLogs` table. All the data in the column will be lost.
  - You are about to drop the column `supplierName` on the `InventoryLogs` table. All the data in the column will be lost.
  - You are about to drop the column `description` on the `Products` table. All the data in the column will be lost.
  - You are about to drop the column `min_stock` on the `Products` table. All the data in the column will be lost.
  - You are about to drop the column `stock` on the `Products` table. All the data in the column will be lost.
  - You are about to drop the column `rules_using` on the `RecipeDetail` table. All the data in the column will be lost.
  - Added the required column `hospital_id` to the `InventoryLogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `hospital_id` to the `Products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `dosage` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `duration_days` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `end_date` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `qty` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.
  - Added the required column `start_date` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Severity" AS ENUM ('MILD', 'MODERATE', 'SEVERE');

-- AlterTable
ALTER TABLE "InventoryLogs" DROP COLUMN "buy_price",
DROP COLUMN "exp_date",
DROP COLUMN "supplierName",
ADD COLUMN     "hospital_id" TEXT NOT NULL,
ADD COLUMN     "source_destination" TEXT,
ADD COLUMN     "warehouse_component_id" TEXT,
ADD COLUMN     "warehouse_id" TEXT;

-- AlterTable
ALTER TABLE "Products" DROP COLUMN "description",
DROP COLUMN "min_stock",
DROP COLUMN "stock",
ADD COLUMN     "hospital_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "RecipeDetail" DROP COLUMN "rules_using",
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "dosage" TEXT NOT NULL,
ADD COLUMN     "duration_days" INTEGER NOT NULL,
ADD COLUMN     "end_date" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "qty" INTEGER NOT NULL,
ADD COLUMN     "start_date" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseComponent" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "warehouse_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WarehouseComponent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WarehouseStock" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "warehouse_component_id" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "min_stock" INTEGER NOT NULL DEFAULT 5,

    CONSTRAINT "WarehouseStock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockBatch" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "warehouse_id" TEXT,
    "warehouse_component_id" TEXT,
    "batch_number" TEXT NOT NULL,
    "exp_date" TIMESTAMP(3) NOT NULL,
    "initial_stock" INTEGER NOT NULL,
    "current_stock" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatientAllergy" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "employee_id" TEXT NOT NULL,
    "allergen" TEXT NOT NULL,
    "severity" "Severity" NOT NULL DEFAULT 'MILD',
    "reaction" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PatientAllergy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStock_product_id_warehouse_id_key" ON "WarehouseStock"("product_id", "warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "WarehouseStock_product_id_warehouse_component_id_key" ON "WarehouseStock"("product_id", "warehouse_component_id");

-- AddForeignKey
ALTER TABLE "Products" ADD CONSTRAINT "Products_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Warehouse" ADD CONSTRAINT "Warehouse_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseComponent" ADD CONSTRAINT "WarehouseComponent_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseComponent" ADD CONSTRAINT "WarehouseComponent_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouse_component_id_fkey" FOREIGN KEY ("warehouse_component_id") REFERENCES "WarehouseComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_warehouse_component_id_fkey" FOREIGN KEY ("warehouse_component_id") REFERENCES "WarehouseComponent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouse"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_warehouse_component_id_fkey" FOREIGN KEY ("warehouse_component_id") REFERENCES "WarehouseComponent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatientAllergy" ADD CONSTRAINT "PatientAllergy_employee_id_fkey" FOREIGN KEY ("employee_id") REFERENCES "Employee"("id") ON DELETE SET NULL ON UPDATE CASCADE;
