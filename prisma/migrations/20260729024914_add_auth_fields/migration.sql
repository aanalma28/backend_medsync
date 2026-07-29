-- AlterTable
ALTER TABLE "User" ADD COLUMN     "accepted_terms" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "remember_token" TEXT,
ADD COLUMN     "remember_token_expires" TIMESTAMP(3);
