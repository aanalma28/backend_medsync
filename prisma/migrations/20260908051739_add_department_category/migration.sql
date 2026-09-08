-- CreateEnum
CREATE TYPE "CategoryDepartmen" AS ENUM ('ADMIN', 'GENERALIST', 'SPECIALIST', 'LABORATORY', 'PHARMACY', 'NURSING');

-- AlterTable
ALTER TABLE "Departmen" ADD COLUMN     "category" "CategoryDepartmen" NOT NULL DEFAULT 'GENERALIST';
