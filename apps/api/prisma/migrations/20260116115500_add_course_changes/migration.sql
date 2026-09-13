-- AlterTable
ALTER TABLE "course" ADD COLUMN     "category" TEXT[],
ADD COLUMN     "instructors" TEXT[];

-- AlterTable
ALTER TABLE "lesson" ADD COLUMN     "transcriptionLanguage" TEXT DEFAULT 'en',
ADD COLUMN     "transcriptionStatus" TEXT;

-- CreateTable
CREATE TABLE "upload" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "upload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "upload_lessonId_idx" ON "upload"("lessonId");

-- CreateIndex
CREATE UNIQUE INDEX "upload_id_lessonId_key" ON "upload"("id", "lessonId");

-- AddForeignKey
ALTER TABLE "upload" ADD CONSTRAINT "upload_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;
