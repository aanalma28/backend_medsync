/*
  Warnings:

  - Added the required column `city` to the `Departmen` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Departmen" ADD COLUMN     "city" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
