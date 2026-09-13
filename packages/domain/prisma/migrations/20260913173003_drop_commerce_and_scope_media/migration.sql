-- DropForeignKey
ALTER TABLE "access_grant" DROP CONSTRAINT "access_grant_sourceId_fkey";

-- DropForeignKey
ALTER TABLE "offer" DROP CONSTRAINT "offer_academyId_fkey";

-- DropForeignKey
ALTER TABLE "offer" DROP CONSTRAINT "offer_courseId_fkey";

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_academyId_fkey";

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_learnerId_fkey";

-- DropForeignKey
ALTER TABLE "order" DROP CONSTRAINT "order_offerId_fkey";

-- DropForeignKey
ALTER TABLE "payment" DROP CONSTRAINT "payment_orderId_fkey";

-- DropForeignKey
ALTER TABLE "payment_connection" DROP CONSTRAINT "payment_connection_workspaceId_fkey";

-- DropForeignKey
ALTER TABLE "refund" DROP CONSTRAINT "refund_paymentId_fkey";

-- DropIndex
DROP INDEX "media_asset_provider_providerAssetId_key";

-- AlterTable
ALTER TABLE "media_asset" DROP COLUMN "playbackUrl",
DROP COLUMN "referenceCount",
ADD COLUMN     "connectionId" TEXT,
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "storageKey" TEXT;

-- AlterTable
ALTER TABLE "staff_session" DROP COLUMN "activeWorkspaceId";

-- DropTable
DROP TABLE "offer";

-- DropTable
DROP TABLE "order";

-- DropTable
DROP TABLE "payment";

-- DropTable
DROP TABLE "payment_connection";

-- DropTable
DROP TABLE "refund";

-- CreateIndex
CREATE UNIQUE INDEX "media_asset_connectionId_providerAssetId_key" ON "media_asset"("connectionId", "providerAssetId");


-- Hand-written. Prisma's schema language cannot express a CHECK constraint, and
-- this one belongs in the database rather than in application code.
--
-- `can()` refuses any staff role that is not `owner` or `admin` with
-- "Unrecognised staff role", so a membership created with the organization
-- plugin's own default of `member` would be stored successfully and then deny
-- its holder everything, at a call site far from the insert. A constraint makes
-- that a write failure where the mistake is.
--
-- The plugin's `defaultRole` is set to `admin` alongside this, so it does not
-- attempt the insert at all. This is the backstop for paths that do not go
-- through the plugin.
ALTER TABLE "member"
  ADD CONSTRAINT "member_role_check" CHECK ("role" IN ('owner', 'admin'));
