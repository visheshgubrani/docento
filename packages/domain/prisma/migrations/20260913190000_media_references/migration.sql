-- AlterTable
ALTER TABLE "release_lesson" ADD COLUMN     "mediaAssetId" TEXT;

-- CreateIndex
CREATE INDEX "release_lesson_mediaAssetId_idx" ON "release_lesson"("mediaAssetId");

-- AddForeignKey
ALTER TABLE "release_lesson" ADD CONSTRAINT "release_lesson_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lesson" ADD CONSTRAINT "lesson_mediaAssetId_fkey" FOREIGN KEY ("mediaAssetId") REFERENCES "media_asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

