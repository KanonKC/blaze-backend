-- CreateTable
CREATE TABLE "FirstWordCustomReply" (
    "id" SERIAL NOT NULL,
    "twitch_chatter_id" TEXT NOT NULL,
    "reply_message" TEXT,
    "audio_key" TEXT,
    "first_word_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FirstWordCustomReply_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FirstWordCustomReply_twitch_chatter_id_first_word_id_key" ON "FirstWordCustomReply"("twitch_chatter_id", "first_word_id");

-- AddForeignKey
ALTER TABLE "FirstWord" ADD CONSTRAINT "FirstWord_audio_key_fkey" FOREIGN KEY ("audio_key") REFERENCES "UploadedFile"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstWordCustomReply" ADD CONSTRAINT "FirstWordCustomReply_audio_key_fkey" FOREIGN KEY ("audio_key") REFERENCES "UploadedFile"("key") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FirstWordCustomReply" ADD CONSTRAINT "FirstWordCustomReply_first_word_id_fkey" FOREIGN KEY ("first_word_id") REFERENCES "FirstWord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
