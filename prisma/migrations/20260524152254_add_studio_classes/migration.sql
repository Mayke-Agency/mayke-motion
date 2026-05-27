-- AlterTable
ALTER TABLE "RegistrationSubmission" ADD COLUMN     "classId" TEXT;

-- CreateTable
CREATE TABLE "StudioClass" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "className" TEXT NOT NULL,
    "ageRange" TEXT NOT NULL,
    "level" TEXT NOT NULL,
    "dayTime" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudioClass_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StudioClass_businessId_active_idx" ON "StudioClass"("businessId", "active");

-- CreateIndex
CREATE INDEX "StudioClass_businessId_archivedAt_idx" ON "StudioClass"("businessId", "archivedAt");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_classId_idx" ON "RegistrationSubmission"("classId");

-- AddForeignKey
ALTER TABLE "StudioClass" ADD CONSTRAINT "StudioClass_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudioClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;
