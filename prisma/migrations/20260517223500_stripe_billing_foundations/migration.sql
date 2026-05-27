-- CreateEnum
CREATE TYPE "SubscriptionPlan" AS ENUM ('STARTER', 'GROWTH', 'PRO');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('TRIALING', 'ACTIVE', 'PAST_DUE', 'INCOMPLETE', 'CANCELED', 'UNPAID', 'INACTIVE');

-- AlterTable
ALTER TABLE "Business"
  ADD COLUMN "stripeCustomerId" TEXT,
  ADD COLUMN "stripeSubscriptionId" TEXT,
  ADD COLUMN "subscriptionPlan" "SubscriptionPlan" NOT NULL DEFAULT 'STARTER',
  ADD COLUMN "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'TRIALING',
  ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "Business_stripeCustomerId_key" ON "Business"("stripeCustomerId");

-- CreateIndex
CREATE INDEX "Business_subscriptionStatus_idx" ON "Business"("subscriptionStatus");

-- CreateIndex
CREATE INDEX "Business_subscriptionPlan_idx" ON "Business"("subscriptionPlan");
