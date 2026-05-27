-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'WAITLISTED', 'DROPPED', 'COMPLETED');

-- CreateTable
CREATE TABLE "ClassEnrollment" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentProfileId" TEXT NOT NULL,
    "registrationId" TEXT,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClassEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_registrationId_key" ON "ClassEnrollment"("registrationId");

-- CreateIndex
CREATE INDEX "ClassEnrollment_businessId_status_idx" ON "ClassEnrollment"("businessId", "status");

-- CreateIndex
CREATE INDEX "ClassEnrollment_classId_status_idx" ON "ClassEnrollment"("classId", "status");

-- CreateIndex
CREATE INDEX "ClassEnrollment_studentProfileId_status_idx" ON "ClassEnrollment"("studentProfileId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ClassEnrollment_businessId_classId_studentProfileId_key" ON "ClassEnrollment"("businessId", "classId", "studentProfileId");

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudioClass"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClassEnrollment" ADD CONSTRAINT "ClassEnrollment_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "RegistrationSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;
