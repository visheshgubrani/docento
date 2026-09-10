/*
  Warnings:

  - You are about to drop the column `projectId` on the `tenant_subscription` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId]` on the table `tenant_subscription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `userId` to the `tenant_subscription` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."tenant_subscription" DROP CONSTRAINT "tenant_subscription_projectId_fkey";

-- DropIndex
DROP INDEX "public"."tenant_subscription_projectId_key";

-- AlterTable
ALTER TABLE "project" ADD COLUMN     "tenantSubscriptionId" TEXT;

-- AlterTable
ALTER TABLE "tenant_subscription" DROP COLUMN "projectId",
ADD COLUMN     "userId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "tenant_subscription_userId_key" ON "tenant_subscription"("userId");

-- AddForeignKey
ALTER TABLE "project" ADD CONSTRAINT "project_tenantSubscriptionId_fkey" FOREIGN KEY ("tenantSubscriptionId") REFERENCES "tenant_subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_subscription" ADD CONSTRAINT "tenant_subscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
