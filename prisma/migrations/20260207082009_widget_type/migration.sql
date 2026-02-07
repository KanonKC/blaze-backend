/*
  Warnings:

  - A unique constraint covering the columns `[twitch_id,widgetTypeId]` on the table `Widget` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `widgetTypeId` to the `Widget` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Widget_twitch_id_key";

-- AlterTable
ALTER TABLE "Widget" ADD COLUMN     "widgetTypeId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "WidgetType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WidgetType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WidgetType_name_key" ON "WidgetType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_twitch_id_widgetTypeId_key" ON "Widget"("twitch_id", "widgetTypeId");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_widgetTypeId_fkey" FOREIGN KEY ("widgetTypeId") REFERENCES "WidgetType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
