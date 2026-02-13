-- DropForeignKey
ALTER TABLE "ClipShoutout" DROP CONSTRAINT "ClipShoutout_widget_id_fkey";

-- DropForeignKey
ALTER TABLE "FirstWord" DROP CONSTRAINT "FirstWord_widget_id_fkey";

-- AddForeignKey
ALTER TABLE "FirstWord" ADD CONSTRAINT "FirstWord_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClipShoutout" ADD CONSTRAINT "ClipShoutout_widget_id_fkey" FOREIGN KEY ("widget_id") REFERENCES "Widget"("id") ON DELETE CASCADE ON UPDATE CASCADE;
