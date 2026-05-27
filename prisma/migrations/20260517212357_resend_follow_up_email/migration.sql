-- AlterEnum
ALTER TYPE "FollowUpStatus" ADD VALUE 'FAILED';

-- AlterTable
ALTER TABLE "FollowUpEmail" ADD COLUMN     "errorMessage" TEXT,
ADD COLUMN     "fromEmail" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "providerMessageId" TEXT,
ALTER COLUMN "inquiryId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "FollowUpEmail_businessId_customerId_idx" ON "FollowUpEmail"("businessId", "customerId");
