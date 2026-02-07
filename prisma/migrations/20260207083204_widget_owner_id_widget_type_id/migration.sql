/*
  Warnings:

  - A unique constraint covering the columns `[owner_id,widgetTypeId]` on the table `Widget` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Widget_owner_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "Widget_owner_id_widgetTypeId_key" ON "Widget"("owner_id", "widgetTypeId");
