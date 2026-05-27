import type { BusinessTypeCode, ModuleKey, Prisma, PrismaClient } from "@prisma/client";
import { getSegmentOptions } from "@/lib/segments";

type ProvisionClient = PrismaClient | Prisma.TransactionClient;

const moduleLabels: Record<ModuleKey, { label: string; description: string }> = {
  CRM: { label: "CRM", description: "Customer profiles, tags, and segmentation." },
  INQUIRIES: { label: "Inquiries", description: "Inbound requests and lead workflow." },
  CAMPAIGNS: { label: "Campaigns", description: "Marketing drafts, segments, and sends." },
  ANALYTICS: { label: "Analytics", description: "Charts, reporting, and business intelligence." },
  COMMUNICATIONS: { label: "Communications", description: "Conversation and follow-up history." },
  PRODUCTS: { label: "Products", description: "Retail product catalog management." },
  MENU: { label: "Menu", description: "Restaurant menu management." },
  RESERVATIONS: { label: "Reservations", description: "Hospitality reservation workflows." },
  EDUCATION: { label: "Education", description: "Studio registrations, families, classes, payments, attendance, and events." },
  INTEGRATIONS: { label: "Integrations", description: "Connected platform status." },
  BILLING: { label: "Billing", description: "Subscription and plan controls." }
};

const moduleDefaults: Record<BusinessTypeCode, ModuleKey[]> = {
  RETAIL: ["CRM", "PRODUCTS", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "INTEGRATIONS"],
  RESTAURANT: ["RESERVATIONS", "INQUIRIES", "CRM", "CAMPAIGNS", "COMMUNICATIONS", "MENU", "INTEGRATIONS"],
  DANCE_STUDIO: ["EDUCATION", "COMMUNICATIONS", "CAMPAIGNS", "CRM", "INTEGRATIONS"]
};

const dashboardLayouts: Record<BusinessTypeCode, string[]> = {
  RETAIL: ["setup", "priority-alerts", "revenue", "orders", "top-products", "campaigns", "activity"],
  RESTAURANT: ["setup", "priority-alerts", "reservations", "catering", "crm", "campaigns", "activity"],
  DANCE_STUDIO: ["setup", "registrations", "families", "classes", "payments", "communication", "events"]
};

const starterStatuses: Record<BusinessTypeCode, Record<string, string[]>> = {
  RETAIL: {
    inquiries: ["NEW", "IN_PROGRESS", "FOLLOWED_UP", "CLOSED"],
    orders: ["PAID", "PENDING", "REFUNDED"]
  },
  RESTAURANT: {
    inquiries: ["NEW", "IN_PROGRESS", "FOLLOWED_UP", "CLOSED"],
    reservations: ["REQUESTED", "CONFIRMED", "SEATED", "CANCELED"],
    catering: ["NEW", "QUALIFYING", "PROPOSAL_SENT", "BOOKED", "DECLINED"]
  },
  DANCE_STUDIO: {
    registrations: ["NEW", "REVIEWED", "CONTACTED", "ENROLLED", "NOT_A_FIT"],
    payments: ["UNPAID", "PENDING", "PAID", "FAILED", "REFUNDED"],
    enrollments: ["ACTIVE", "WAITLISTED", "DROPPED", "COMPLETED"]
  }
};

const analyticsCards: Record<BusinessTypeCode, string[]> = {
  RETAIL: ["Revenue", "Orders", "Customer growth", "Top products", "Campaign activity"],
  RESTAURANT: ["Reservations", "Catering inquiries", "Guest growth", "Revenue", "Campaign activity"],
  DANCE_STUDIO: ["New registrations", "Active students", "Paid vs unpaid", "Attendance", "Upcoming events"]
};

const communicationCategories: Record<BusinessTypeCode, string[]> = {
  RETAIL: ["Product question", "Order follow-up", "Wholesale", "Campaign reply"],
  RESTAURANT: ["Reservation", "Catering", "Private event", "Guest follow-up"],
  DANCE_STUDIO: ["Registration", "Family follow-up", "Class update", "Payment", "Event reminder"]
};

const starterTemplates: Record<BusinessTypeCode, { name: string; type: "FOLLOW_UP" | "CAMPAIGN" | "ANNOUNCEMENT"; subject: string; body: string }[]> = {
  RETAIL: [
    { name: "Product interest follow-up", type: "FOLLOW_UP", subject: "A quick note from {{business}}", body: "Hi {{firstName}},\n\nThanks for reaching out. I wanted to follow up and help with the right product recommendation.\n\nBest,\n{{business}}" },
    { name: "New product drop", type: "CAMPAIGN", subject: "New from {{business}}", body: "A curated note for customers interested in new releases, limited drops, and product stories." }
  ],
  RESTAURANT: [
    { name: "Reservation follow-up", type: "FOLLOW_UP", subject: "Following up from {{business}}", body: "Hi {{firstName}},\n\nThank you for reaching out. We would be happy to help with your reservation or event details.\n\nWarmly,\n{{business}}" },
    { name: "Private event campaign", type: "CAMPAIGN", subject: "Host your next gathering with {{business}}", body: "A polished campaign draft for catering, private dining, and elevated hospitality moments." }
  ],
  DANCE_STUDIO: [
    { name: "Registration next steps", type: "FOLLOW_UP", subject: "Next steps from {{business}}", body: "Hi {{firstName}},\n\nThank you for submitting a registration. Our team will review details and follow up with placement guidance.\n\nWarmly,\n{{business}}" },
    { name: "Studio announcement", type: "ANNOUNCEMENT", subject: "An update from {{business}}", body: "A clear family-facing announcement for classes, recitals, reminders, and studio updates." }
  ]
};

function moduleConfig(type: BusinessTypeCode, key: ModuleKey) {
  return {
    dashboardLayout: dashboardLayouts[type],
    starterStatuses: starterStatuses[type],
    analyticsCards: analyticsCards[type],
    communicationCategories: communicationCategories[type],
    crmSegments: getSegmentOptions(type),
    defaultFor: key
  };
}

export async function provisionWorkspaceDefaults(input: {
  actor: string;
  businessId: string;
  businessName: string;
  businessType: BusinessTypeCode;
  prisma: ProvisionClient;
}) {
  const alreadyProvisioned = await input.prisma.activityLog.findFirst({
    where: {
      businessId: input.businessId,
      action: "Provisioned workspace defaults"
    },
    select: { id: true }
  });

  if (alreadyProvisioned) return { skipped: true };

  const enabledKeys = new Set(moduleDefaults[input.businessType]);
  const allKeys = Object.keys(moduleLabels) as ModuleKey[];
  const existingTemplateCount = await input.prisma.messageTemplate.count({
    where: { businessId: input.businessId }
  });

  await Promise.all(
    allKeys.map((key) =>
      input.prisma.module.upsert({
        where: {
          businessId_key: {
            businessId: input.businessId,
            key
          }
        },
        create: {
          businessId: input.businessId,
          key,
          enabled: enabledKeys.has(key),
          label: moduleLabels[key].label,
          description: moduleLabels[key].description,
          config: moduleConfig(input.businessType, key)
        },
        update: {
          label: moduleLabels[key].label,
          description: moduleLabels[key].description,
          config: moduleConfig(input.businessType, key)
        }
      })
    )
  );

  if (!existingTemplateCount) {
    await input.prisma.messageTemplate.createMany({
      data: starterTemplates[input.businessType].map((template) => ({
        businessId: input.businessId,
        businessType: input.businessType,
        name: template.name,
        type: template.type,
        subject: template.subject.replaceAll("{{business}}", input.businessName),
        body: template.body.replaceAll("{{business}}", input.businessName)
      }))
    });
  }

  await input.prisma.activityLog.create({
    data: {
      businessId: input.businessId,
      actor: input.actor,
      action: "Provisioned workspace defaults",
      entity: input.businessName,
      metadata: {
        modules: Array.from(enabledKeys),
        dashboardLayout: dashboardLayouts[input.businessType],
        crmSegments: getSegmentOptions(input.businessType).map((segment) => segment.key),
        starterStatuses: starterStatuses[input.businessType],
        analyticsCards: analyticsCards[input.businessType],
        communicationCategories: communicationCategories[input.businessType],
        templatesCreated: existingTemplateCount ? 0 : starterTemplates[input.businessType].length
      }
    }
  });

  return { skipped: false };
}
