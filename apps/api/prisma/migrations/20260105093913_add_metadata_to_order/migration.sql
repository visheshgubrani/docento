-- AlterTable
ALTER TABLE "enrollment" ADD COLUMN     "amountPaid" INTEGER DEFAULT 0,
ADD COLUMN     "status" TEXT;

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "metadata" JSONB;
