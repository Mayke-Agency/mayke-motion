import "server-only";

import { prisma } from "@/lib/prisma";

export async function getSportsOverview(businessId: string) {
  const [players, teams, tryouts, invoices, schedule, activity] = await Promise.all([
    prisma.sportsPlayer.findMany({ where: { businessId }, include: { rosters: { where: { status: "ACTIVE" }, include: { team: true } } }, orderBy: { lastName: "asc" } }),
    prisma.sportsTeam.findMany({ where: { businessId, active: true }, include: { rosters: { where: { status: "ACTIVE" } }, coaches: { include: { coach: true } } }, orderBy: { name: "asc" } }),
    prisma.sportsFormSubmission.findMany({ where: { businessId, form: { type: "TRYOUT" } }, include: { form: true, player: true, family: true }, orderBy: { createdAt: "desc" }, take: 6 }),
    prisma.sportsInvoice.findMany({ where: { businessId }, include: { family: true, player: true }, orderBy: { updatedAt: "desc" }, take: 8 }),
    prisma.sportsScheduleEvent.findMany({ where: { businessId, startsAt: { gte: new Date() } }, include: { team: true }, orderBy: { startsAt: "asc" }, take: 6 }),
    prisma.activityLog.findMany({ where: { businessId }, orderBy: { createdAt: "desc" }, take: 8 })
  ]);

  return {
    players,
    teams,
    tryouts,
    invoices,
    schedule,
    activity,
    activePlayers: players.filter((player) => player.status === "ACTIVE").length,
    openBalances: invoices.filter((invoice) => ["OPEN", "PENDING", "PAST_DUE"].includes(invoice.status)),
    collected: invoices.filter((invoice) => invoice.status === "PAID").reduce((sum, invoice) => sum + Number(invoice.amount), 0)
  };
}

export async function getSportsPlayers(businessId: string) {
  return prisma.sportsPlayer.findMany({
    where: { businessId },
    include: { family: { include: { customer: true } }, rosters: { include: { team: true } }, documents: true, invoices: true },
    orderBy: [{ status: "asc" }, { lastName: "asc" }]
  });
}

export async function getSportsFamilies(businessId: string) {
  return prisma.sportsFamily.findMany({
    where: { businessId },
    include: { customer: true, players: { include: { rosters: { include: { team: true } } } }, invoices: true, documents: true },
    orderBy: { familyName: "asc" }
  });
}

export async function getSportsCoaches(businessId: string) {
  return prisma.sportsCoach.findMany({ where: { businessId }, include: { assignments: { include: { team: true } } }, orderBy: { name: "asc" } });
}

export async function getSportsTeams(businessId: string) {
  return prisma.sportsTeam.findMany({
    where: { businessId },
    include: { rosters: { include: { player: true } }, coaches: { include: { coach: true } }, scheduleEvents: { orderBy: { startsAt: "asc" }, take: 3 } },
    orderBy: { name: "asc" }
  });
}

export async function getSportsForms(businessId: string) {
  return prisma.sportsForm.findMany({ where: { businessId }, include: { submissions: { include: { player: true, family: true } } }, orderBy: { createdAt: "desc" } });
}

export async function getSportsSchedule(businessId: string) {
  return prisma.sportsScheduleEvent.findMany({ where: { businessId }, include: { team: true }, orderBy: { startsAt: "asc" } });
}

export async function getSportsInvoices(businessId: string) {
  return prisma.sportsInvoice.findMany({ where: { businessId }, include: { family: true, player: true, team: true }, orderBy: [{ status: "asc" }, { dueAt: "asc" }] });
}

export async function getSportsDocuments(businessId: string) {
  return prisma.sportsDocument.findMany({ where: { businessId }, include: { player: true, family: true }, orderBy: { updatedAt: "desc" } });
}

export async function getSponsors(businessId: string) {
  return prisma.sponsor.findMany({ where: { businessId }, orderBy: { name: "asc" } });
}

export async function getWebsitePages(businessId: string) {
  return prisma.websitePage.findMany({ where: { businessId }, orderBy: { slug: "asc" } });
}

export async function getPublicSportsForm(businessSlug: string, formSlug: string) {
  return prisma.sportsForm.findFirst({
    where: { slug: formSlug, active: true, business: { slug: businessSlug, businessType: { code: "SPORTS_CLUB" } } },
    include: { business: true }
  });
}

export async function getPublicSportsWebsitePage(businessSlug: string, pageSlug: string) {
  return prisma.websitePage.findFirst({
    where: { slug: pageSlug, published: true, business: { slug: businessSlug, businessType: { code: "SPORTS_CLUB" } } },
    include: { business: true }
  });
}
