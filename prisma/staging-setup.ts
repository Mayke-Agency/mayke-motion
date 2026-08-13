import { PrismaClient, type BusinessTypeCode, type ModuleKey } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const moduleLabels: Record<ModuleKey, { label: string; description: string }> = {
  CRM: { label: "CRM", description: "Customer profiles, tags, and segmentation." },
  INQUIRIES: { label: "Inquiries", description: "Inbound requests and lead workflow." },
  CAMPAIGNS: { label: "Campaigns", description: "Marketing drafts, segments, and sends." },
  ANALYTICS: { label: "Analytics", description: "Charts, reporting, and business intelligence." },
  COMMUNICATIONS: { label: "Communications", description: "Conversation and follow-up history." },
  PRODUCTS: { label: "Products", description: "Retail product catalog management." },
  MENU: { label: "Menu", description: "Restaurant menu management." },
  RESERVATIONS: { label: "Reservations", description: "Hospitality reservation workflows." },
  EDUCATION: { label: "Education", description: "Studio events, announcements, and programs." },
  SPORTS: { label: "Club operations", description: "Players, teams, forms, schedules, payments, recruiting, and sponsors." },
  INTEGRATIONS: { label: "Integrations", description: "Connected platform status." },
  BILLING: { label: "Billing", description: "Subscription and plan controls." }
};

const businessTypeNames: Record<BusinessTypeCode, string> = {
  RESTAURANT: "Restaurant",
  RETAIL: "Retail / Ecommerce",
  DANCE_STUDIO: "Dance Studio / Education",
  SPORTS_CLUB: "Sports Club"
};

function requireEnv(key: string) {
  const value = process.env[key]?.trim();
  if (!value) throw new Error(`${key} is required.`);
  return value;
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "pilot-client"
  );
}

function businessTypeCode() {
  const value = (process.env.STAGING_CLIENT_TYPE ?? "RETAIL").trim();
  if (!["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"].includes(value)) {
    throw new Error("STAGING_CLIENT_TYPE must be RESTAURANT, RETAIL, DANCE_STUDIO, or SPORTS_CLUB.");
  }
  return value as BusinessTypeCode;
}

function enabledModulesFor(type: BusinessTypeCode): ModuleKey[] {
  if (type === "RESTAURANT") return ["CRM", "INQUIRIES", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "MENU", "RESERVATIONS", "INTEGRATIONS", "BILLING"];
  if (type === "DANCE_STUDIO") return ["CRM", "CAMPAIGNS", "COMMUNICATIONS", "EDUCATION", "INTEGRATIONS", "BILLING"];
  if (type === "SPORTS_CLUB") return ["CRM", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "SPORTS", "INTEGRATIONS", "BILLING"];
  return ["CRM", "INQUIRIES", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "PRODUCTS", "INTEGRATIONS", "BILLING"];
}

async function main() {
  const adminEmail = requireEnv("STAGING_ADMIN_EMAIL").toLowerCase();
  const adminPassword = requireEnv("STAGING_ADMIN_PASSWORD");
  const clientEmail = requireEnv("STAGING_CLIENT_EMAIL").toLowerCase();
  const clientPassword = requireEnv("STAGING_CLIENT_PASSWORD");
  const clientName = process.env.STAGING_CLIENT_NAME?.trim() || "Mayke Pilot Client";
  const type = businessTypeCode();
  const slug = process.env.STAGING_CLIENT_SLUG?.trim() || slugify(clientName);

  if (adminPassword.length < 12 || clientPassword.length < 12) {
    throw new Error("Staging passwords must be at least 12 characters.");
  }

  const businessType = await prisma.businessType.upsert({
    where: { code: type },
    update: { name: businessTypeNames[type] },
    create: {
      code: type,
      name: businessTypeNames[type],
      description: `${businessTypeNames[type]} staging workspace.`
    }
  });

  const [adminHash, clientHash] = await Promise.all([bcrypt.hash(adminPassword, 12), bcrypt.hash(clientPassword, 12)]);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Mayke Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      isActive: true,
      businessId: null
    },
    create: {
      email: adminEmail,
      name: "Mayke Admin",
      passwordHash: adminHash,
      role: "ADMIN",
      title: "Platform admin"
    }
  });

  const business = await prisma.business.upsert({
    where: { slug },
    update: {
      name: clientName,
      businessTypeId: businessType.id,
      contactEmail: clientEmail,
      launchStatus: "READY_FOR_PILOT",
      subscriptionStatus: "TRIALING"
    },
    create: {
      name: clientName,
      slug,
      description: `${clientName} private staging workspace.`,
      contactEmail: clientEmail,
      address: "Staging workspace",
      brandPrimary: "#14110f",
      brandAccent: "#733038",
      launchStatus: "READY_FOR_PILOT",
      subscriptionStatus: "TRIALING",
      businessTypeId: businessType.id
    }
  });

  await prisma.user.upsert({
    where: { email: clientEmail },
    update: {
      name: `${clientName} Owner`,
      passwordHash: clientHash,
      role: "CLIENT_OWNER",
      isActive: true,
      businessId: business.id
    },
    create: {
      email: clientEmail,
      name: `${clientName} Owner`,
      passwordHash: clientHash,
      role: "CLIENT_OWNER",
      title: "Owner",
      businessId: business.id
    }
  });

  const enabled = new Set(enabledModulesFor(type));
  await Promise.all(
    (Object.keys(moduleLabels) as ModuleKey[]).map((key) =>
      prisma.module.upsert({
        where: { businessId_key: { businessId: business.id, key } },
        update: {
          enabled: enabled.has(key),
          label: moduleLabels[key].label,
          description: moduleLabels[key].description
        },
        create: {
          businessId: business.id,
          key,
          enabled: enabled.has(key),
          label: moduleLabels[key].label,
          description: moduleLabels[key].description
        }
      })
    )
  );

  await prisma.activityLog.create({
    data: {
      businessId: business.id,
      actor: "Staging setup",
      action: "Created staging pilot workspace",
      entity: business.name,
      metadata: {
        businessType: type,
        adminEmail,
        clientEmail
      }
    }
  });

  console.log(`Staging setup complete: admin=${adminEmail}, client=${clientEmail}, business=${business.slug}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
