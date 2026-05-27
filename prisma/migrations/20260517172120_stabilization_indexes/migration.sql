-- DropIndex
DROP INDEX "Customer_email_idx";

-- DropIndex
DROP INDEX "Inquiry_status_idx";

-- AlterTable
ALTER TABLE "Business" ALTER COLUMN "brandPrimary" SET DEFAULT '#241915',
ALTER COLUMN "brandAccent" SET DEFAULT '#733038';

-- CreateIndex
CREATE INDEX "ActivityLog_businessId_createdAt_idx" ON "ActivityLog"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Campaign_businessId_status_idx" ON "Campaign"("businessId", "status");

-- CreateIndex
CREATE INDEX "Campaign_businessId_createdAt_idx" ON "Campaign"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_businessId_createdAt_idx" ON "Customer"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "Customer_businessId_email_idx" ON "Customer"("businessId", "email");

-- CreateIndex
CREATE INDEX "Inquiry_businessId_status_idx" ON "Inquiry"("businessId", "status");

-- CreateIndex
CREATE INDEX "Inquiry_businessId_createdAt_idx" ON "Inquiry"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "MenuItem_businessId_active_idx" ON "MenuItem"("businessId", "active");

-- CreateIndex
CREATE INDEX "MenuItem_businessId_category_idx" ON "MenuItem"("businessId", "category");

-- CreateIndex
CREATE INDEX "Product_businessId_active_idx" ON "Product"("businessId", "active");

-- CreateIndex
CREATE INDEX "Product_businessId_category_idx" ON "Product"("businessId", "category");

-- CreateIndex
CREATE INDEX "Sale_businessId_placedAt_idx" ON "Sale"("businessId", "placedAt");

-- CreateIndex
CREATE INDEX "Sale_businessId_status_idx" ON "Sale"("businessId", "status");
