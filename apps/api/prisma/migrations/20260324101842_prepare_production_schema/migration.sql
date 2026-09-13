/*
  Warnings:

  - The `instructors` column on the `course` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "answer" ADD COLUMN     "userAnswers" TEXT[],
ALTER COLUMN "pointsEarned" SET DEFAULT 0,
ALTER COLUMN "pointsEarned" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "course" ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'COURSE',
DROP COLUMN "instructors",
ADD COLUMN     "instructors" JSONB,
ALTER COLUMN "certificatesEnabled" SET DEFAULT true;

-- AlterTable
ALTER TABLE "question" ADD COLUMN     "correctAnswers" TEXT[],
ADD COLUMN     "negativePoints" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "partialMarking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sectionId" TEXT;

-- AlterTable
ALTER TABLE "quiz" ADD COLUMN     "defaultNegativeMark" DOUBLE PRECISION,
ADD COLUMN     "endTime" TIMESTAMP(3),
ADD COLUMN     "isMockTest" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "negativeMarking" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "startTime" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "quiz_section" (
    "id" TEXT NOT NULL,
    "quizId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "quiz_section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "dueDate" TIMESTAMP(3),
    "totalPoints" INTEGER NOT NULL DEFAULT 100,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assignment_submission" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "endUserId" TEXT NOT NULL,
    "content" TEXT,
    "fileUrl" TEXT,
    "grade" DOUBLE PRECISION,
    "feedback" TEXT,
    "gradedAt" TIMESTAMP(3),
    "gradedById" TEXT,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assignment_submission_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "quiz_section_quizId_order_key" ON "quiz_section"("quizId", "order");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_lessonId_key" ON "assignment"("lessonId");

-- CreateIndex
CREATE INDEX "assignment_submission_assignmentId_idx" ON "assignment_submission"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "assignment_submission_assignmentId_endUserId_key" ON "assignment_submission"("assignmentId", "endUserId");

-- AddForeignKey
ALTER TABLE "quiz_section" ADD CONSTRAINT "quiz_section_quizId_fkey" FOREIGN KEY ("quizId") REFERENCES "quiz"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question" ADD CONSTRAINT "question_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "quiz_section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment" ADD CONSTRAINT "assignment_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "lesson"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assignment_submission" ADD CONSTRAINT "assignment_submission_endUserId_fkey" FOREIGN KEY ("endUserId") REFERENCES "end_user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
