import type { BusinessTypeCode, ModuleKey } from "@prisma/client";

export type PortalModuleDefinition = {
  key: ModuleKey;
  label: string;
  businessTypes: BusinessTypeCode[];
  description: string;
};

export const portalModules: PortalModuleDefinition[] = [
  { key: "CRM", label: "CRM", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Customer profiles, segmentation, tags, and history." },
  { key: "INQUIRIES", label: "Inquiries", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Lead capture, triage, notes, and conversion workflow." },
  { key: "COMMUNICATIONS", label: "Communications", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Conversation logging, outbound email, and future SMS." },
  { key: "CAMPAIGNS", label: "Campaigns", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Campaign drafts, audience segmentation, and engagement analytics." },
  { key: "ANALYTICS", label: "Analytics", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Revenue, inquiry, engagement, and growth intelligence." },
  { key: "PRODUCTS", label: "Products", businessTypes: ["RETAIL"], description: "Product performance and inventory visibility." },
  { key: "MENU", label: "Menu", businessTypes: ["RESTAURANT"], description: "Menu and hospitality catalog visibility." },
  { key: "RESERVATIONS", label: "Reservations", businessTypes: ["RESTAURANT"], description: "Reservations, catering, and private event operations." },
  { key: "EDUCATION", label: "Education", businessTypes: ["DANCE_STUDIO"], description: "Programs, registration, recitals, and family communication." },
  { key: "SPORTS", label: "Club operations", businessTypes: ["SPORTS_CLUB"], description: "Players, teams, forms, schedules, payments, recruiting, and sponsors." },
  { key: "INTEGRATIONS", label: "Integrations", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Mayke-managed integration readiness and sync health." },
  { key: "BILLING", label: "Billing", businessTypes: ["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"], description: "Subscription plan and billing portal access." }
];
