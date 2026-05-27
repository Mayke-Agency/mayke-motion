-- CreateTable
CREATE TABLE "PilotFeedback" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "submittedById" TEXT,
    "type" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PilotFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PilotFeedback_businessId_status_idx" ON "PilotFeedback"("businessId", "status");

-- CreateIndex
CREATE INDEX "PilotFeedback_businessId_createdAt_idx" ON "PilotFeedback"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "PilotFeedback_submittedById_idx" ON "PilotFeedback"("submittedById");

-- AddForeignKey
ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PilotFeedback" ADD CONSTRAINT "PilotFeedback_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
