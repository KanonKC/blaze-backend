/*
  Warnings:

  - A unique constraint covering the columns `[overlay_key]` on the table `Widget` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateTable
CREATE TABLE "DropImage" (
    "id" TEXT NOT NULL,
    "twitch_reward_id" TEXT,
    "twitch_bot_id" TEXT,
    "invalid_message" TEXT,
    "not_image_message" TEXT,
    "contain_mature_message" TEXT,
    "enabled_moderation" BOOLEAN NOT NULL DEFAULT true,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "display_duration" INTEGER NOT NULL DEFAULT 5,
    "widget_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropImage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DropImage_twitch_reward_id_key" ON "DropImage"("twitch_reward_id");

-- CreateIndex
CREATE UNIQUE INDEX "DropImage_widget_id_key" ON "DropImage"("widget_id");

-- CreateIndex
CREATE UNIQUE INDEX "Widget_overlay_key_key" ON "Widget"("overlay_key");

-- AddForeignKey
ALTER TABLE "DropImage" ADD CONSTRAINT "DropImage_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
