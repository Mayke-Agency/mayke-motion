import type { BusinessTypeCode, SubscriptionPlan, SubscriptionStatus, UserRole } from "@prisma/client";

export type PortalRole = UserRole;
export type PortalBusinessType = BusinessTypeCode;

export type TenantAccessSnapshot = {
  businessId: string;
  businessName: string;
  businessType: PortalBusinessType;
  role: PortalRole;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
};
