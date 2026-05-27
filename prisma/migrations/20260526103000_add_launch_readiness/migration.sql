-- AlterTable
ALTER TABLE "Business" ADD COLUMN "launchStatus" TEXT NOT NULL DEFAULT 'NOT_STARTED';
ALTER TABLE "Business" ADD COLUMN "launchChecklist" JSONB;
ALTER TABLE "Business" ADD COLUMN "launchNotes" TEXT;
