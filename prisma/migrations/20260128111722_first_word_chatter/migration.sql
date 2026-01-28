/*
  Warnings:

  - A unique constraint covering the columns `[twitch_id]` on the table `FirstWord` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `twitch_id` to the `FirstWord` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `FirstWord` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FirstWord" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "twitch_id" TEXT NOT NULL,
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "FirstWordChatter" (
    "id" SERIAL NOT NULL,
    "twitch_chatter_id" TEXT NOT NULL,
    "first_word_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirstWordChatter_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FirstWordChatter_twitch_chatter_id_first_word_id_key" ON "FirstWordChatter"("twitch_chatter_id", "first_word_id");

-- CreateIndex
CREATE UNIQUE INDEX "FirstWord_twitch_id_key" ON "FirstWord"("twitch_id");

-- AddForeignKey
ALTER TABLE "FirstWordChatter" ADD CONSTRAINT "FirstWordChatter_first_word_id_fkey" FOREIGN KEY ("first_word_id") REFERENCES "FirstWord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
