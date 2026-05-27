-- CreateEnum
CREATE TYPE "MessageTemplateType" AS ENUM ('FOLLOW_UP', 'CAMPAIGN', 'ANNOUNCEMENT');

-- CreateTable
CREATE TABLE "MessageTemplate" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MessageTemplateType" NOT NULL,
    "businessType" "BusinessTypeCode" NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MessageTemplate_businessId_type_idx" ON "MessageTemplate"("businessId", "type");

-- CreateIndex
CREATE INDEX "MessageTemplate_businessId_businessType_idx" ON "MessageTemplate"("businessId", "businessType");

-- AddForeignKey
ALTER TABLE "MessageTemplate" ADD CONSTRAINT "MessageTemplate_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
