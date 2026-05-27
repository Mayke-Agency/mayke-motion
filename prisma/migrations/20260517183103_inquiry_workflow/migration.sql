-- CreateEnum
CREATE TYPE "FollowUpStatus" AS ENUM ('DRAFT', 'SENT');

-- AlterTable
ALTER TABLE "Inquiry" ADD COLUMN     "convertedAt" TIMESTAMP(3),
ADD COLUMN     "leadEmail" TEXT,
ADD COLUMN     "leadName" TEXT,
ADD COLUMN     "leadPhone" TEXT;

-- CreateTable
CREATE TABLE "InquiryNote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InquiryNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FollowUpEmail" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "inquiryId" TEXT NOT NULL,
    "customerId" TEXT,
    "createdById" TEXT,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "FollowUpStatus" NOT NULL DEFAULT 'DRAFT',
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FollowUpEmail_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InquiryNote_businessId_inquiryId_idx" ON "InquiryNote"("businessId", "inquiryId");

-- CreateIndex
CREATE INDEX "InquiryNote_businessId_createdAt_idx" ON "InquiryNote"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "InquiryNote_authorId_idx" ON "InquiryNote"("authorId");

-- CreateIndex
CREATE INDEX "FollowUpEmail_businessId_inquiryId_idx" ON "FollowUpEmail"("businessId", "inquiryId");

-- CreateIndex
CREATE INDEX "FollowUpEmail_businessId_status_idx" ON "FollowUpEmail"("businessId", "status");

-- CreateIndex
CREATE INDEX "FollowUpEmail_customerId_idx" ON "FollowUpEmail"("customerId");

-- CreateIndex
CREATE INDEX "FollowUpEmail_createdById_idx" ON "FollowUpEmail"("createdById");

-- AddForeignKey
ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InquiryNote" ADD CONSTRAINT "InquiryNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEmail" ADD CONSTRAINT "FollowUpEmail_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEmail" ADD CONSTRAINT "FollowUpEmail_inquiryId_fkey" FOREIGN KEY ("inquiryId") REFERENCES "Inquiry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEmail" ADD CONSTRAINT "FollowUpEmail_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FollowUpEmail" ADD CONSTRAINT "FollowUpEmail_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
