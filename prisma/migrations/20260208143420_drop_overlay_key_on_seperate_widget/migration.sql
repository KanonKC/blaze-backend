/*
  Warnings:

  - You are about to drop the column `enabled` on the `ClipShoutout` table. All the data in the column will be lost.
  - You are about to drop the column `overlay_key` on the `ClipShoutout` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `ClipShoutout` table. All the data in the column will be lost.
  - You are about to drop the column `twitch_id` on the `ClipShoutout` table. All the data in the column will be lost.
  - You are about to drop the column `enabled` on the `FirstWord` table. All the data in the column will be lost.
  - You are about to drop the column `overlay_key` on the `FirstWord` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `FirstWord` table. All the data in the column will be lost.
  - You are about to drop the column `twitch_id` on the `FirstWord` table. All the data in the column will be lost.
  - You are about to drop the column `widgetTypeId` on the `Widget` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[twitch_id,widget_type_slug]` on the table `Widget` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[owner_id,widget_type_slug]` on the table `Widget` will be added. If there are existing duplicate values, this will fail.
  - Made the column `widget_id` on table `ClipShoutout` required. This step will fail if there are existing NULL values in that column.
  - Made the column `widget_id` on table `FirstWord` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "ClipShoutout" DROP CONSTRAINT "ClipShoutout_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "ClipShoutout" DROP CONSTRAINT "ClipShoutout_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "FirstWord" DROP CONSTRAINT "FirstWord_owner_id_fkey";

-- DropForeignKey
ALTER TABLE "FirstWord" DROP CONSTRAINT "FirstWord_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "Widget" DROP CONSTRAINT "Widget_widgetTypeId_fkey";

-- DropIndex
DROP INDEX "ClipShoutout_owner_id_key";

-- DropIndex
DROP INDEX "ClipShoutout_twitch_id_key";

-- DropIndex
DROP INDEX "FirstWord_owner_id_key";

-- DropIndex
DROP INDEX "FirstWord_twitch_id_key";

-- DropIndex
DROP INDEX "Widget_owner_id_widgetTypeId_key";

-- DropIndex
DROP INDEX "Widget_twitch_id_widgetTypeId_key";

-- AlterTable
ALTER TABLE "ClipShoutout" DROP COLUMN "enabled",
DROP COLUMN "overlay_key",
DROP COLUMN "owner_id",
DROP COLUMN "twitch_id",
ALTER COLUMN "widget_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "FirstWord" DROP COLUMN "enabled",
DROP COLUMN "overlay_key",
DROP COLUMN "owner_id",
DROP COLUMN "twitch_id",
ALTER COLUMN "widget_id" SET NOT NULL;

-- AlterTable
ALTER TABLE "Widget" DROP COLUMN "widgetTypeId",
ADD COLUMN     "widget_type_slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Widget_twitch_id_widget_type_slug_key" ON "Widget"("twitch_id", "widget_type_slug");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_owner_id_widget_type_slug_key" ON "Widget"("owner_id", "widget_type_slug");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_widget_type_slug_fkey" FOREIGN KEY ("widget_type_slug") REFERENCES "WidgetType"("slug") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstWord" ADD CONSTRAINT "FirstWord_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipShoutout" ADD CONSTRAINT "ClipShoutout_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
