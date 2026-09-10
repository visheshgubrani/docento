-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'REVOKED', 'EXPIRED');

-- AlterTable
ALTER TABLE "project_invitation"
ADD COLUMN "status" "InvitationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN "respondedAt" TIMESTAMP(3),
ADD COLUMN "acceptedAt" TIMESTAMP(3),
ADD COLUMN "rejectedAt" TIMESTAMP(3),
ADD COLUMN "revokedAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "project_invitation_projectId_status_idx" ON "project_invitation"("projectId", "status");

-- CreateIndex
CREATE INDEX "project_invitation_expiresAt_idx" ON "project_invitation"("expiresAt");
