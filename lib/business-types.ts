import "server-only";

import type { BusinessTypeCode, Prisma, PrismaClient } from "@prisma/client";

const supportedBusinessTypes: Record<BusinessTypeCode, { name: string; description: string }> = {
  RETAIL: {
    name: "Retail / Ecommerce",
    description: "Retail, ecommerce, boutique, and product-led businesses."
  },
  RESTAURANT: {
    name: "Restaurant / Hospitality",
    description: "Restaurants, hospitality groups, caterers, and experience-led food brands."
  },
  DANCE_STUDIO: {
    name: "Education / Dance Studio",
    description: "Dance studios, education programs, classes, events, and parent communication."
  },
  SPORTS_CLUB: {
    name: "Sports Club",
    description: "Club sports organizations managing players, families, teams, dues, schedules, and recruiting."
  }
};

type BusinessTypeClient = PrismaClient | Prisma.TransactionClient;

export async function ensureSupportedBusinessTypes(client: BusinessTypeClient) {
  await Promise.all(
    (Object.entries(supportedBusinessTypes) as [BusinessTypeCode, (typeof supportedBusinessTypes)[BusinessTypeCode]][]).map(([code, type]) =>
      client.businessType.upsert({
        where: { code },
        update: { name: type.name, description: type.description },
        create: { code, ...type }
      })
    )
  );
}
