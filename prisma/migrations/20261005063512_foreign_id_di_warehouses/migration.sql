/*
  Warnings:

  - Added the required column `departmen_id` to the `Warehouses` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Warehouses" ADD COLUMN     "departmen_id" TEXT NOT NULL;

-- CreateIndex
CREATE INDEX "Warehouses_departmen_id_idx" ON "Warehouses"("departmen_id");

-- AddForeignKey
ALTER TABLE "Warehouses" ADD CONSTRAINT "Warehouses_departmen_id_fkey" FOREIGN KEY ("departmen_id") REFERENCES "Departmen"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
