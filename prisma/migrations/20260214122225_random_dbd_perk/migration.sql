-- CreateTable
CREATE TABLE "RandomDbdPerk" (
    "id" TEXT NOT NULL,
    "widget_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RandomDbdPerk_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RandomDbdPerkClass" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "twitch_reward_id" TEXT,
    "maximum_random_size" INTEGER NOT NULL DEFAULT 999,
    "random_dbd_perk_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RandomDbdPerkClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RandomDbdPerk_widget_id_key" ON "RandomDbdPerk"("widget_id");

-- CreateIndex
CREATE UNIQUE INDEX "RandomDbdPerkClass_twitch_reward_id_key" ON "RandomDbdPerkClass"("twitch_reward_id");

-- CreateIndex
CREATE UNIQUE INDEX "RandomDbdPerkClass_random_dbd_perk_id_type_key" ON "RandomDbdPerkClass"("random_dbd_perk_id", "type");

-- AddForeignKey
ALTER TABLE "RandomDbdPerk" ADD CONSTRAINT "RandomDbdPerk_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RandomDbdPerkClass" ADD CONSTRAINT "RandomDbdPerkClass_random_dbd_perk_id_fkey" FOREIGN KEY ("random_dbd_perk_id") REFERENCES "RandomDbdPerk"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
