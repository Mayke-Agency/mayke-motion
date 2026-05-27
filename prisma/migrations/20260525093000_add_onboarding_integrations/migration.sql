-- AlterTable
ALTER TABLE "Business" ADD COLUMN "stripeAccountId" TEXT;
ALTER TABLE "Business" ADD COLUMN "stripeOnboardingStatus" TEXT NOT NULL DEFAULT 'not_started';
ALTER TABLE "Business" ADD COLUMN "stripeChargesEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "stripePayoutsEnabled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Business" ADD COLUMN "emailSenderName" TEXT;
ALTER TABLE "Business" ADD COLUMN "emailSenderEmail" TEXT;
ALTER TABLE "Business" ADD COLUMN "emailDomain" TEXT;
ALTER TABLE "Business" ADD COLUMN "emailVerificationStatus" TEXT NOT NULL DEFAULT 'not_configured';

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeAccountId_key" ON "Business"("stripeAccountId");
