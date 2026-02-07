/*
  Warnings:

  - You are about to drop the column `name` on the `WidgetType` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `WidgetType` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `displayName` to the `WidgetType` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slug` to the `WidgetType` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "WidgetType_name_key";

-- AlterTable
ALTER TABLE "WidgetType" DROP COLUMN "name",
ADD COLUMN     "displayName" TEXT NOT NULL,
ADD COLUMN     "slug" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "WidgetType_slug_key" ON "WidgetType"("slug");
