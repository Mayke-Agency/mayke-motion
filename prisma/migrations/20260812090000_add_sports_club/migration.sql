ALTER TYPE "BusinessTypeCode" ADD VALUE IF NOT EXISTS 'SPORTS_CLUB';
ALTER TYPE "ModuleKey" ADD VALUE IF NOT EXISTS 'SPORTS';

CREATE TYPE "SportsRole" AS ENUM ('CLUB_OWNER', 'ADMINISTRATOR', 'COACH', 'TEAM_MANAGER', 'PARENT', 'PLAYER');
CREATE TYPE "SportsParticipantStatus" AS ENUM ('ACTIVE', 'PROSPECT', 'INACTIVE', 'GRADUATED');
CREATE TYPE "SportsRosterStatus" AS ENUM ('ACTIVE', 'PENDING', 'WAITLISTED', 'FORMER');
CREATE TYPE "SportsFormType" AS ENUM ('TRYOUT', 'PLAYER_REGISTRATION', 'MEDICAL', 'WAIVER', 'VOLUNTEER', 'SPONSOR_INQUIRY');
CREATE TYPE "SportsSubmissionStatus" AS ENUM ('NEW', 'REVIEWED', 'APPROVED', 'DECLINED');
CREATE TYPE "SportsInvoiceStatus" AS ENUM ('DRAFT', 'OPEN', 'PENDING', 'PAID', 'PAST_DUE', 'VOID');
CREATE TYPE "SportsDocumentType" AS ENUM ('BIRTH_CERTIFICATE', 'INSURANCE_CARD', 'MEDICAL_FORM', 'WAIVER', 'PLAYER_PHOTO', 'OTHER');
CREATE TYPE "SportsScheduleType" AS ENUM ('PRACTICE', 'GAME', 'TOURNAMENT', 'TRYOUT', 'CLUB_EVENT');

ALTER TABLE "User" ADD COLUMN "sportsRole" "SportsRole";

CREATE TABLE "SportsFamily" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "familyName" TEXT NOT NULL,
  "billingContact" TEXT,
  "billingEmail" TEXT,
  "paymentStatus" "SportsInvoiceStatus" NOT NULL DEFAULT 'OPEN',
  "emergencyContact" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsFamily_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SportsFamily_customerId_key" ON "SportsFamily"("customerId");
CREATE INDEX "SportsFamily_businessId_familyName_idx" ON "SportsFamily"("businessId", "familyName");
CREATE INDEX "SportsFamily_businessId_paymentStatus_idx" ON "SportsFamily"("businessId", "paymentStatus");

CREATE TABLE "SportsPlayer" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "firstName" TEXT NOT NULL,
  "lastName" TEXT NOT NULL,
  "birthDate" TIMESTAMP(3),
  "graduationYear" INTEGER,
  "positions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "jerseyNumber" TEXT,
  "phone" TEXT,
  "email" TEXT,
  "emergencyContact" TEXT,
  "notes" TEXT,
  "status" "SportsParticipantStatus" NOT NULL DEFAULT 'PROSPECT',
  "gpa" DECIMAL(3,2),
  "height" TEXT,
  "weight" TEXT,
  "throws" TEXT,
  "bats" TEXT,
  "highlightVideoUrl" TEXT,
  "recruitingNotes" TEXT,
  "collegeInterestLevel" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsPlayer_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsPlayer_businessId_status_idx" ON "SportsPlayer"("businessId", "status");
CREATE INDEX "SportsPlayer_businessId_graduationYear_idx" ON "SportsPlayer"("businessId", "graduationYear");
CREATE INDEX "SportsPlayer_familyId_idx" ON "SportsPlayer"("familyId");

CREATE TABLE "SportsCoach" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "certifications" TEXT,
  "backgroundCheckStatus" TEXT NOT NULL DEFAULT 'PENDING',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsCoach_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsCoach_businessId_name_idx" ON "SportsCoach"("businessId", "name");

CREATE TABLE "SportsTeam" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "ageGroup" TEXT NOT NULL,
  "season" TEXT NOT NULL,
  "practiceSchedule" TEXT,
  "tournamentSchedule" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsTeam_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsTeam_businessId_active_idx" ON "SportsTeam"("businessId", "active");
CREATE INDEX "SportsTeam_businessId_season_idx" ON "SportsTeam"("businessId", "season");

CREATE TABLE "SportsTeamRoster" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "playerId" TEXT NOT NULL,
  "status" "SportsRosterStatus" NOT NULL DEFAULT 'PENDING',
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsTeamRoster_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SportsTeamRoster_businessId_teamId_playerId_key" ON "SportsTeamRoster"("businessId", "teamId", "playerId");
CREATE INDEX "SportsTeamRoster_teamId_status_idx" ON "SportsTeamRoster"("teamId", "status");
CREATE INDEX "SportsTeamRoster_playerId_status_idx" ON "SportsTeamRoster"("playerId", "status");

CREATE TABLE "SportsTeamCoach" (
  "id" TEXT NOT NULL,
  "teamId" TEXT NOT NULL,
  "coachId" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT 'Coach',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SportsTeamCoach_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SportsTeamCoach_teamId_coachId_key" ON "SportsTeamCoach"("teamId", "coachId");
CREATE INDEX "SportsTeamCoach_coachId_idx" ON "SportsTeamCoach"("coachId");

CREATE TABLE "SportsScheduleEvent" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "teamId" TEXT,
  "title" TEXT NOT NULL,
  "type" "SportsScheduleType" NOT NULL,
  "startsAt" TIMESTAMP(3) NOT NULL,
  "endsAt" TIMESTAMP(3),
  "location" TEXT,
  "opponent" TEXT,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsScheduleEvent_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsScheduleEvent_businessId_startsAt_idx" ON "SportsScheduleEvent"("businessId", "startsAt");
CREATE INDEX "SportsScheduleEvent_teamId_startsAt_idx" ON "SportsScheduleEvent"("teamId", "startsAt");

CREATE TABLE "SportsForm" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "type" "SportsFormType" NOT NULL,
  "description" TEXT,
  "fee" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "fields" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsForm_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SportsForm_businessId_slug_key" ON "SportsForm"("businessId", "slug");
CREATE INDEX "SportsForm_businessId_type_active_idx" ON "SportsForm"("businessId", "type", "active");

CREATE TABLE "SportsFormSubmission" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "formId" TEXT NOT NULL,
  "familyId" TEXT,
  "playerId" TEXT,
  "status" "SportsSubmissionStatus" NOT NULL DEFAULT 'NEW',
  "data" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsFormSubmission_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsFormSubmission_businessId_status_idx" ON "SportsFormSubmission"("businessId", "status");
CREATE INDEX "SportsFormSubmission_formId_createdAt_idx" ON "SportsFormSubmission"("formId", "createdAt");
CREATE INDEX "SportsFormSubmission_familyId_idx" ON "SportsFormSubmission"("familyId");
CREATE INDEX "SportsFormSubmission_playerId_idx" ON "SportsFormSubmission"("playerId");

CREATE TABLE "SportsDocument" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "familyId" TEXT,
  "playerId" TEXT,
  "name" TEXT NOT NULL,
  "type" "SportsDocumentType" NOT NULL,
  "url" TEXT,
  "status" TEXT NOT NULL DEFAULT 'REQUESTED',
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsDocument_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SportsDocument_businessId_type_idx" ON "SportsDocument"("businessId", "type");
CREATE INDEX "SportsDocument_familyId_idx" ON "SportsDocument"("familyId");
CREATE INDEX "SportsDocument_playerId_idx" ON "SportsDocument"("playerId");

CREATE TABLE "SportsInvoice" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "familyId" TEXT NOT NULL,
  "playerId" TEXT,
  "teamId" TEXT,
  "invoiceNumber" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(10,2) NOT NULL,
  "status" "SportsInvoiceStatus" NOT NULL DEFAULT 'OPEN',
  "dueAt" TIMESTAMP(3),
  "installmentPlan" TEXT,
  "autoPay" BOOLEAN NOT NULL DEFAULT false,
  "stripePaymentIntentId" TEXT,
  "stripeCheckoutId" TEXT,
  "paymentMethod" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SportsInvoice_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SportsInvoice_businessId_invoiceNumber_key" ON "SportsInvoice"("businessId", "invoiceNumber");
CREATE INDEX "SportsInvoice_businessId_status_idx" ON "SportsInvoice"("businessId", "status");
CREATE INDEX "SportsInvoice_familyId_status_idx" ON "SportsInvoice"("familyId", "status");
CREATE INDEX "SportsInvoice_teamId_idx" ON "SportsInvoice"("teamId");

CREATE TABLE "Sponsor" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contactName" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "tier" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PROSPECT',
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Sponsor_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "Sponsor_businessId_status_idx" ON "Sponsor"("businessId", "status");

CREATE TABLE "WebsitePage" (
  "id" TEXT NOT NULL,
  "businessId" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "content" TEXT,
  "published" BOOLEAN NOT NULL DEFAULT false,
  "updatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "WebsitePage_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebsitePage_businessId_slug_key" ON "WebsitePage"("businessId", "slug");
CREATE INDEX "WebsitePage_businessId_published_idx" ON "WebsitePage"("businessId", "published");

ALTER TABLE "SportsFamily" ADD CONSTRAINT "SportsFamily_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsFamily" ADD CONSTRAINT "SportsFamily_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsPlayer" ADD CONSTRAINT "SportsPlayer_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsPlayer" ADD CONSTRAINT "SportsPlayer_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "SportsFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsCoach" ADD CONSTRAINT "SportsCoach_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsTeam" ADD CONSTRAINT "SportsTeam_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsTeamRoster" ADD CONSTRAINT "SportsTeamRoster_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsTeamRoster" ADD CONSTRAINT "SportsTeamRoster_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportsTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsTeamRoster" ADD CONSTRAINT "SportsTeamRoster_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SportsPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsTeamCoach" ADD CONSTRAINT "SportsTeamCoach_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportsTeam"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsTeamCoach" ADD CONSTRAINT "SportsTeamCoach_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "SportsCoach"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsScheduleEvent" ADD CONSTRAINT "SportsScheduleEvent_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsScheduleEvent" ADD CONSTRAINT "SportsScheduleEvent_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportsForm" ADD CONSTRAINT "SportsForm_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsFormSubmission" ADD CONSTRAINT "SportsFormSubmission_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsFormSubmission" ADD CONSTRAINT "SportsFormSubmission_formId_fkey" FOREIGN KEY ("formId") REFERENCES "SportsForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsFormSubmission" ADD CONSTRAINT "SportsFormSubmission_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "SportsFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportsFormSubmission" ADD CONSTRAINT "SportsFormSubmission_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SportsPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportsDocument" ADD CONSTRAINT "SportsDocument_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsDocument" ADD CONSTRAINT "SportsDocument_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "SportsFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsDocument" ADD CONSTRAINT "SportsDocument_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SportsPlayer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsInvoice" ADD CONSTRAINT "SportsInvoice_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsInvoice" ADD CONSTRAINT "SportsInvoice_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "SportsFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SportsInvoice" ADD CONSTRAINT "SportsInvoice_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "SportsPlayer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "SportsInvoice" ADD CONSTRAINT "SportsInvoice_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "SportsTeam"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Sponsor" ADD CONSTRAINT "Sponsor_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsitePage" ADD CONSTRAINT "WebsitePage_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;
