import "server-only";

import type { SubscriptionPlan, SubscriptionStatus } from "@prisma/client";

export const activeBillingStatuses: SubscriptionStatus[] = ["TRIALING", "ACTIVE"];

export const planDetails: Record<
  SubscriptionPlan,
  {
    name: string;
    monthlyPrice: string;
    summary: string;
    features: string[];
    envPriceKey: string;
  }
> = {
  STARTER: {
    name: "Starter",
    monthlyPrice: "$149",
    summary: "For lean teams launching their operating workspace.",
    features: ["Customer CRM", "Inquiry workflow", "Basic campaigns", "Core analytics"],
    envPriceKey: "STRIPE_STARTER_PRICE_ID"
  },
  GROWTH: {
    name: "Growth",
    monthlyPrice: "$349",
    summary: "For active brands scaling sales, retention, and service.",
    features: ["Everything in Starter", "Advanced workflows", "Priority campaign tools", "Integration readiness"],
    envPriceKey: "STRIPE_GROWTH_PRICE_ID"
  },
  PRO: {
    name: "Pro",
    monthlyPrice: "$749",
    summary: "For premium operators with multi-channel growth needs.",
    features: ["Everything in Growth", "Dedicated onboarding", "Advanced analytics", "Priority support"],
    envPriceKey: "STRIPE_PRO_PRICE_ID"
  }
};

export function hasDashboardAccess(status: SubscriptionStatus) {
  return activeBillingStatuses.includes(status);
}

export function formatSubscriptionStatus(status: SubscriptionStatus) {
  return status.toLowerCase().replaceAll("_", " ");
}
