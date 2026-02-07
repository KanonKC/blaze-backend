/*
  Warnings:

  - A unique constraint covering the columns `[widget_id]` on the table `ClipShoutout` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[widget_id]` on the table `FirstWord` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "ClipShoutout" ADD COLUMN     "widget_id" TEXT;

-- AlterTable
ALTER TABLE "FirstWord" ADD COLUMN     "widget_id" TEXT;

-- CreateTable
CREATE TABLE "Widget" (
    "id" TEXT NOT NULL,
    "twitch_id" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "overlay_key" TEXT,
    "owner_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Widget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Widget_twitch_id_key" ON "Widget"("twitch_id");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_owner_id_key" ON "Widget"("owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "ClipShoutout_widget_id_key" ON "ClipShoutout"("widget_id");

-- CreateIndex
CREATE UNIQUE INDEX "FirstWord_widget_id_key" ON "FirstWord"("widget_id");

-- AddForeignKey
ALTER TABLE "Widget" ADD CONSTRAINT "Widget_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstWord" ADD CONSTRAINT "FirstWord_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipShoutout" ADD CONSTRAINT "ClipShoutout_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE SET NULL ON UPDATE CASCADE;
