-- AlterEnum
ALTER TYPE "RegistrationPaymentStatus" ADD VALUE 'REFUNDED';

-- CreateTable
CREATE TABLE "PaymentRecord" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "registrationId" TEXT,
    "familyProfileId" TEXT,
    "studentProfileId" TEXT,
    "classId" TEXT,
    "classEnrollmentId" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "RegistrationPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "source" TEXT NOT NULL DEFAULT 'manual',
    "note" TEXT,
    "recordedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentRecord_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PaymentRecord_businessId_status_idx" ON "PaymentRecord"("businessId", "status");

-- CreateIndex
CREATE INDEX "PaymentRecord_businessId_recordedAt_idx" ON "PaymentRecord"("businessId", "recordedAt");

-- CreateIndex
CREATE INDEX "PaymentRecord_registrationId_idx" ON "PaymentRecord"("registrationId");

-- CreateIndex
CREATE INDEX "PaymentRecord_familyProfileId_idx" ON "PaymentRecord"("familyProfileId");

-- CreateIndex
CREATE INDEX "PaymentRecord_studentProfileId_idx" ON "PaymentRecord"("studentProfileId");

-- CreateIndex
CREATE INDEX "PaymentRecord_classEnrollmentId_idx" ON "PaymentRecord"("classEnrollmentId");

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "RegistrationSubmission"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_studentProfileId_fkey" FOREIGN KEY ("studentProfileId") REFERENCES "StudentProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_classId_fkey" FOREIGN KEY ("classId") REFERENCES "StudioClass"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentRecord" ADD CONSTRAINT "PaymentRecord_classEnrollmentId_fkey" FOREIGN KEY ("classEnrollmentId") REFERENCES "ClassEnrollment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
