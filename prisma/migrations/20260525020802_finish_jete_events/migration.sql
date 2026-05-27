-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "archivedAt" TIMESTAMP(3),
ADD COLUMN     "audience" TEXT NOT NULL DEFAULT 'All families',
ADD COLUMN     "classId" TEXT,
ADD COLUMN     "description" TEXT;

-- CreateIndex
CREATE INDEX "Event_businessId_archivedAt_idx" ON "Event"("businessId", "archivedAt");

-- CreateIndex
CREATE INDEX "Event_classId_idx" ON "Event"("classId");

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudioClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
