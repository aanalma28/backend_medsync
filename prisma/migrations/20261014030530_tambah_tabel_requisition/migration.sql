/*
  Warnings:

  - You are about to drop the column `buy_price` on the `InventoryLogs` table. All the data in the column will be lost.
  - You are about to drop the column `source_destination` on the `InventoryLogs` table. All the data in the column will be lost.
  - Added the required column `stock_after` to the `InventoryLogs` table without a default value. This is not possible if the table is not empty.
  - Added the required column `stock_before` to the `InventoryLogs` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "RequisitionStatus" AS ENUM ('PENDING', 'APPROVED', 'PARTIAL', 'REJECTED', 'DISTRIBUTED', 'CANCELLED');

-- AlterTable
ALTER TABLE "InventoryLogs" DROP COLUMN "buy_price",
DROP COLUMN "source_destination",
ADD COLUMN     "stock_after" INTEGER NOT NULL,
ADD COLUMN     "stock_batch_id" TEXT,
ADD COLUMN     "stock_before" INTEGER NOT NULL,
ADD COLUMN     "target_warehouse_id" TEXT;

-- CreateTable
CREATE TABLE "Requisitions" (
    "id" TEXT NOT NULL,
    "hospital_id" TEXT NOT NULL,
    "requisition_number" TEXT NOT NULL,
    "requesting_warehouse_id" TEXT NOT NULL,
    "target_warehouse_id" TEXT NOT NULL,
    "requested_by_id" TEXT NOT NULL,
    "approved_by_id" TEXT,
    "status" "RequisitionStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Requisitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RequisitionItems" (
    "id" TEXT NOT NULL,
    "requisition_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "quantity_requested" INTEGER NOT NULL,
    "quantity_approved" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RequisitionItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Requisitions_requisition_number_key" ON "Requisitions"("requisition_number");

-- CreateIndex
CREATE INDEX "Requisitions_hospital_id_status_idx" ON "Requisitions"("hospital_id", "status");

-- CreateIndex
CREATE INDEX "Requisitions_requesting_warehouse_id_idx" ON "Requisitions"("requesting_warehouse_id");

-- CreateIndex
CREATE INDEX "Requisitions_target_warehouse_id_idx" ON "Requisitions"("target_warehouse_id");

-- CreateIndex
CREATE INDEX "RequisitionItems_requisition_id_idx" ON "RequisitionItems"("requisition_id");

-- CreateIndex
CREATE INDEX "RequisitionItems_product_id_idx" ON "RequisitionItems"("product_id");

-- CreateIndex
CREATE INDEX "InventoryLogs_target_warehouse_id_idx" ON "InventoryLogs"("target_warehouse_id");

-- CreateIndex
CREATE INDEX "InventoryLogs_stock_batch_id_idx" ON "InventoryLogs"("stock_batch_id");

-- AddForeignKey
ALTER TABLE "Requisitions" ADD CONSTRAINT "Requisitions_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "Hospital"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisitions" ADD CONSTRAINT "Requisitions_requesting_warehouse_id_fkey" FOREIGN KEY ("requesting_warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisitions" ADD CONSTRAINT "Requisitions_target_warehouse_id_fkey" FOREIGN KEY ("target_warehouse_id") REFERENCES "Warehouses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisitions" ADD CONSTRAINT "Requisitions_requested_by_id_fkey" FOREIGN KEY ("requested_by_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Requisitions" ADD CONSTRAINT "Requisitions_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItems" ADD CONSTRAINT "RequisitionItems_requisition_id_fkey" FOREIGN KEY ("requisition_id") REFERENCES "Requisitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RequisitionItems" ADD CONSTRAINT "RequisitionItems_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_target_warehouse_id_fkey" FOREIGN KEY ("target_warehouse_id") REFERENCES "Warehouses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_stock_batch_id_fkey" FOREIGN KEY ("stock_batch_id") REFERENCES "StockBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
