/*
  Warnings:

  - Added the required column `twitch_chatter_avatar_url` to the `FirstWordCustomReply` table without a default value. This is not possible if the table is not empty.
  - Added the required column `twitch_chatter_username` to the `FirstWordCustomReply` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "FirstWordCustomReply" ADD COLUMN     "twitch_chatter_avatar_url" TEXT NOT NULL,
ADD COLUMN     "twitch_chatter_username" TEXT NOT NULL;
