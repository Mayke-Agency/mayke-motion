-- AlterTable
ALTER TABLE "RegistrationSubmission" ADD COLUMN     "familyProfileId" TEXT;

-- CreateTable
CREATE TABLE "FamilyProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "familyLastName" TEXT NOT NULL,
    "homeAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "emergencyContactInfo" TEXT NOT NULL,
    "contact1Name" TEXT NOT NULL,
    "contact1Type" TEXT NOT NULL,
    "contact1Phone" TEXT NOT NULL,
    "contact1Email" TEXT NOT NULL,
    "contact2Name" TEXT,
    "contact2Type" TEXT,
    "contact2Phone" TEXT,
    "contact2Email" TEXT,
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FamilyProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentProfile" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "familyProfileId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "gender" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "tshirtSize" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "specialNeeds" TEXT,
    "currentClassInterest" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentProfile_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FamilyProfile_customerId_key" ON "FamilyProfile"("customerId");

-- CreateIndex
CREATE INDEX "FamilyProfile_businessId_idx" ON "FamilyProfile"("businessId");

-- CreateIndex
CREATE INDEX "FamilyProfile_businessId_familyLastName_idx" ON "FamilyProfile"("businessId", "familyLastName");

-- CreateIndex
CREATE INDEX "StudentProfile_businessId_idx" ON "StudentProfile"("businessId");

-- CreateIndex
CREATE INDEX "StudentProfile_familyProfileId_idx" ON "StudentProfile"("familyProfileId");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_familyProfileId_idx" ON "RegistrationSubmission"("familyProfileId");

-- AddForeignKey
ALTER TABLE "FamilyProfile" ADD CONSTRAINT "FamilyProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FamilyProfile" ADD CONSTRAINT "FamilyProfile_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentProfile" ADD CONSTRAINT "StudentProfile_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_familyProfileId_fkey" FOREIGN KEY ("familyProfileId") REFERENCES "FamilyProfile"("id") ON DELETE SET NULL ON UPDATE CASCADE;
