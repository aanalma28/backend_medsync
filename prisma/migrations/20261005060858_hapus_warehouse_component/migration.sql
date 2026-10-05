/*
  Warnings:

  - You are about to drop the column `warehouse_component_id` on the `InventoryLogs` table. All the data in the column will be lost.
  - You are about to drop the column `warehouse_component_id` on the `StockBatch` table. All the data in the column will be lost.
  - You are about to drop the column `warehouse_component_id` on the `WarehouseStock` table. All the data in the column will be lost.
  - You are about to drop the `Warehouse` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `WarehouseComponent` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "InventoryLogs" DROP CONSTRAINT "InventoryLogs_warehouse_component_id_fkey";

-- DropForeignKey
ALTER TABLE "InventoryLogs" DROP CONSTRAINT "InventoryLogs_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_warehouse_component_id_fkey";

-- DropForeignKey
ALTER TABLE "StockBatch" DROP CONSTRAINT "StockBatch_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "VisitUsage" DROP CONSTRAINT "VisitUsage_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "Warehouse" DROP CONSTRAINT "Warehouse_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseComponent" DROP CONSTRAINT "WarehouseComponent_hospital_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseComponent" DROP CONSTRAINT "WarehouseComponent_warehouse_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStock" DROP CONSTRAINT "WarehouseStock_warehouse_component_id_fkey";

-- DropForeignKey
ALTER TABLE "WarehouseStock" DROP CONSTRAINT "WarehouseStock_warehouse_id_fkey";

-- AlterTable
ALTER TABLE "InventoryLogs" DROP COLUMN "warehouse_component_id";

-- AlterTable
ALTER TABLE "StockBatch" DROP COLUMN "warehouse_component_id";

-- AlterTable
ALTER TABLE "WarehouseStock" DROP COLUMN "warehouse_component_id";

-- DropTable
DROP TABLE "Warehouse";

-- DropTable
DROP TABLE "WarehouseComponent";

-- CreateTable
CREATE TABLE "Warehouses" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "WarehouseType" NOT NULL DEFAULT 'OTHER',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Warehouses_hospital_id_idx" ON "Warehouses"("hospital_id");

-- CreateIndex
CREATE INDEX "Warehouses_hospital_id_type_idx" ON "Warehouses"("hospital_id", "type");

-- CreateIndex
CREATE UNIQUE INDEX "Warehouses_hospital_id_name_key" ON "Warehouses"("hospital_id", "name");

-- AddForeignKey
ALTER TABLE "Warehouses" ADD CONSTRAINT "Warehouses_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WarehouseStock" ADD CONSTRAINT "WarehouseStock_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockBatch" ADD CONSTRAINT "StockBatch_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VisitUsage" ADD CONSTRAINT "VisitUsage_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
