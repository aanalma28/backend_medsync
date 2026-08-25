/*
  Warnings:

  - You are about to drop the column `match_medicine_recipe` on the `DoctorRecipe` table. All the data in the column will be lost.
  - You are about to drop the column `medicine_id` on the `RecipeDetail` table. All the data in the column will be lost.
  - The `role` column on the `User` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the `Medicine` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `address` to the `Departmen` table without a default value. This is not possible if the table is not empty.
  - Added the required column `match_product_recipe` to the `DoctorRecipe` table without a default value. This is not possible if the table is not empty.
  - Added the required column `product_id` to the `RecipeDetail` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'MASTERADMIN', 'REGISTER_ADMIN', 'DOCTOR', 'PHARMACIST', 'NURSE', 'PATIENT');

-- CreateEnum
CREATE TYPE "Category" AS ENUM ('DRUG', 'CONSUMABLE', 'SUPPLEMENT', 'MEDICAL_DEVICE', 'OTHER');

-- DropForeignKey
ALTER TABLE "RecipeDetail" DROP CONSTRAINT "RecipeDetail_medicine_id_fkey";

-- AlterTable
ALTER TABLE "Departmen" ADD COLUMN     "address" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "DoctorRecipe" DROP COLUMN "match_medicine_recipe",
ADD COLUMN     "match_product_recipe" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "RecipeDetail" DROP COLUMN "medicine_id",
ADD COLUMN     "product_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'PATIENT';

-- DropTable
DROP TABLE "Medicine";

-- CreateTable
CREATE TABLE "Products" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "Category" NOT NULL DEFAULT 'DRUG',
    "unit" TEXT NOT NULL,
    "stock" INTEGER NOT NULL,
    "min_stock" INTEGER NOT NULL,
    "buy_price" DOUBLE PRECISION NOT NULL,
    "sell_price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryLogs" (
    "id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "buy_price" DOUBLE PRECISION NOT NULL,
    "exp_date" TIMESTAMP(3),
    "supplierName" TEXT,
    "reference_number" TEXT,
    "user_id" TEXT NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryLogs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Products_code_key" ON "Products"("code");

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryLogs" ADD CONSTRAINT "InventoryLogs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeDetail" ADD CONSTRAINT "RecipeDetail_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "Products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
