-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('LAKILAKI', 'PEREMPUAN');

-- AlterTable
ALTER TABLE "MedicalHistory" ADD COLUMN     "gender" "Gender" NOT NULL DEFAULT 'LAKILAKI';
