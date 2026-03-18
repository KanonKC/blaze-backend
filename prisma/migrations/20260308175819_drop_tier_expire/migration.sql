/*
  Warnings:

  - You are about to drop the column `tier_expires_at` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "tier_expires_at",
ADD COLUMN     "tier_expire_at" TIMESTAMP(3);
