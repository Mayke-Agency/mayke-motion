import type { IntegrationProvider } from "@prisma/client";

export type IntegrationDefinition = {
  provider: IntegrationProvider;
  label: string;
  category: "commerce" | "payments" | "hospitality" | "messaging" | "crm" | "marketing";
  productionStatus: "scaffolded" | "partial" | "ready";
  description: string;
};

export const integrationRegistry: IntegrationDefinition[] = [
  {
    provider: "SHOPIFY",
    label: "Shopify",
    category: "commerce",
    productionStatus: "scaffolded",
    description: "Headless commerce products, orders, and customer sync."
  },
  {
    provider: "STRIPE",
    label: "Stripe",
    category: "payments",
    productionStatus: "partial",
    description: "Billing foundations, checkout, customer portal, and future payment analytics."
  },
  {
    provider: "SQUARE",
    label: "Square",
    category: "payments",
    productionStatus: "scaffolded",
    description: "POS and payment activity for retail and hospitality clients."
  },
  {
    provider: "TOAST",
    label: "Toast",
    category: "hospitality",
    productionStatus: "scaffolded",
    description: "Restaurant menu, order, and guest activity sync."
  },
  {
    provider: "RESEND",
    label: "Resend",
    category: "messaging",
    productionStatus: "partial",
    description: "Transactional and follow-up email sending."
  },
  {
    provider: "TWILIO",
    label: "Twilio",
    category: "messaging",
    productionStatus: "scaffolded",
    description: "Future SMS reminders, announcements, and campaign sends."
  },
  {
    provider: "KLAVIYO",
    label: "Klaviyo",
    category: "marketing",
    productionStatus: "scaffolded",
    description: "Future campaign segmentation and marketing analytics sync."
  },
  {
    provider: "CRM",
    label: "CRM",
    category: "crm",
    productionStatus: "scaffolded",
    description: "Future external CRM import and export workflows."
  }
];
