-- CreateEnum
CREATE TYPE "RegistrationStatus" AS ENUM ('NEW', 'REVIEWED', 'CONTACTED', 'ENROLLED', 'NOT_A_FIT');

-- CreateEnum
CREATE TYPE "RegistrationPaymentStatus" AS ENUM ('UNPAID', 'PENDING', 'PAID', 'FAILED');

-- CreateTable
CREATE TABLE "RegistrationForm" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationSubmission" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "formId" TEXT NOT NULL,
    "customerId" TEXT,
    "status" "RegistrationStatus" NOT NULL DEFAULT 'NEW',
    "paymentStatus" "RegistrationPaymentStatus" NOT NULL DEFAULT 'UNPAID',
    "stripeSessionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "referralSource" TEXT NOT NULL,
    "referralName" TEXT,
    "familyLastName" TEXT NOT NULL,
    "homeAddress" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zip" TEXT NOT NULL,
    "primaryPhone" TEXT NOT NULL,
    "emergencyContactInfo" TEXT NOT NULL,
    "contact1FirstName" TEXT NOT NULL,
    "contact1LastName" TEXT NOT NULL,
    "contact1Type" TEXT NOT NULL,
    "contact1Phone" TEXT NOT NULL,
    "contact1Email" TEXT NOT NULL,
    "smsConsent" BOOLEAN NOT NULL DEFAULT false,
    "contact2FirstName" TEXT,
    "contact2LastName" TEXT,
    "contact2Type" TEXT,
    "contact2Phone" TEXT,
    "contact2Email" TEXT,
    "studentFirstName" TEXT NOT NULL,
    "studentLastName" TEXT NOT NULL,
    "studentGender" TEXT NOT NULL,
    "birthDate" TIMESTAMP(3) NOT NULL,
    "studentPhone" TEXT,
    "tshirtSize" TEXT NOT NULL,
    "gradeLevel" TEXT NOT NULL,
    "specialNeeds" TEXT,
    "classInterest" TEXT NOT NULL,
    "trialClass" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RegistrationNote" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "authorId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RegistrationForm_businessId_active_idx" ON "RegistrationForm"("businessId", "active");

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationForm_businessId_slug_key" ON "RegistrationForm"("businessId", "slug");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_businessId_status_idx" ON "RegistrationSubmission"("businessId", "status");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_businessId_paymentStatus_idx" ON "RegistrationSubmission"("businessId", "paymentStatus");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_businessId_createdAt_idx" ON "RegistrationSubmission"("businessId", "createdAt");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_formId_idx" ON "RegistrationSubmission"("formId");

-- CreateIndex
CREATE INDEX "RegistrationSubmission_customerId_idx" ON "RegistrationSubmission"("customerId");

-- CreateIndex
CREATE INDEX "RegistrationNote_businessId_registrationId_idx" ON "RegistrationNote"("businessId", "registrationId");

-- CreateIndex
CREATE INDEX "RegistrationNote_authorId_idx" ON "RegistrationNote"("authorId");

-- AddForeignKey
ALTER TABLE "RegistrationForm" ADD CONSTRAINT "RegistrationForm_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "RegistrationForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationSubmission" ADD CONSTRAINT "RegistrationSubmission_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationNote" ADD CONSTRAINT "RegistrationNote_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationNote" ADD CONSTRAINT "RegistrationNote_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "RegistrationSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RegistrationNote" ADD CONSTRAINT "RegistrationNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
