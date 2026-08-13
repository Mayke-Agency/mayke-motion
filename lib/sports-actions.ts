"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createSportsInvoiceCheckoutSession, isStripeConfigured } from "@/lib/stripe";
import { isStripePaymentsReady } from "@/lib/integration-gates";

type SportsActionResult = { error?: string; success?: string };

function value(formData: FormData, key: string) {
  const result = formData.get(key);
  return typeof result === "string" ? result.trim() : "";
}

function resolve(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

async function clubUser() {
  const user = await requireBusinessUser();
  if (user.business.businessType.code !== "SPORTS_CLUB") return null;
  return user;
}

function canManage(user: NonNullable<Awaited<ReturnType<typeof clubUser>>>) {
  return user.role === "ADMIN" || user.role === "CLIENT_OWNER" || ["CLUB_OWNER", "ADMINISTRATOR", "TEAM_MANAGER"].includes(user.sportsRole ?? "");
}

function slugify(input: string) {
  return input.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 48) || "form";
}

async function activity(businessId: string, actor: string, action: string, entity: string, metadata: Record<string, unknown>) {
  await prisma.activityLog.create({ data: { businessId, actor, action, entity, metadata: metadata as Prisma.InputJsonValue } });
}

const teamSchema = z.object({ name: z.string().min(2), ageGroup: z.string().min(2), season: z.string().min(2), practiceSchedule: z.string().optional(), tournamentSchedule: z.string().optional() });
export async function saveSportsTeamAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser();
  if (!user || !canManage(user)) return { error: "Only club administrators can manage teams." };
  const data = resolve(first, second);
  const parsed = teamSchema.safeParse({ name: value(data, "name"), ageGroup: value(data, "ageGroup"), season: value(data, "season"), practiceSchedule: value(data, "practiceSchedule"), tournamentSchedule: value(data, "tournamentSchedule") });
  if (!parsed.success) return { error: "Add team name, age group, and season." };
  const team = await prisma.sportsTeam.create({ data: { businessId: user.business.id, ...parsed.data, practiceSchedule: parsed.data.practiceSchedule || null, tournamentSchedule: parsed.data.tournamentSchedule || null } });
  await activity(user.business.id, user.name, "Created club team", team.name, { teamId: team.id });
  revalidatePath("/dashboard/teams"); revalidatePath("/dashboard");
  return { success: "Team created." };
}

const coachSchema = z.object({ name: z.string().min(2), email: z.string().email().optional().or(z.literal("")), phone: z.string().optional(), certifications: z.string().optional(), backgroundCheckStatus: z.string().min(2), notes: z.string().optional() });
export async function saveSportsCoachAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser();
  if (!user || !canManage(user)) return { error: "Only club administrators can manage coaches." };
  const data = resolve(first, second);
  const parsed = coachSchema.safeParse({ name: value(data, "name"), email: value(data, "email"), phone: value(data, "phone"), certifications: value(data, "certifications"), backgroundCheckStatus: value(data, "backgroundCheckStatus") || "PENDING", notes: value(data, "notes") });
  if (!parsed.success) return { error: "Add a coach name and valid contact details." };
  const coach = await prisma.sportsCoach.create({ data: { businessId: user.business.id, ...parsed.data, email: parsed.data.email || null, phone: parsed.data.phone || null, certifications: parsed.data.certifications || null, notes: parsed.data.notes || null } });
  await activity(user.business.id, user.name, "Added coach", coach.name, { coachId: coach.id });
  revalidatePath("/dashboard/coaches");
  return { success: "Coach added." };
}

const playerSchema = z.object({ familyName: z.string().min(2), parentName: z.string().min(2), parentEmail: z.string().email(), parentPhone: z.string().optional(), firstName: z.string().min(2), lastName: z.string().min(2), graduationYear: z.coerce.number().int().min(2024).max(2045).optional(), positions: z.string().optional(), jerseyNumber: z.string().optional(), status: z.enum(["ACTIVE", "PROSPECT", "INACTIVE", "GRADUATED"]), notes: z.string().optional() });
export async function saveSportsPlayerAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser();
  if (!user || !canManage(user)) return { error: "Only club administrators can manage players." };
  const data = resolve(first, second);
  const parsed = playerSchema.safeParse({ familyName: value(data, "familyName"), parentName: value(data, "parentName"), parentEmail: value(data, "parentEmail"), parentPhone: value(data, "parentPhone"), firstName: value(data, "firstName"), lastName: value(data, "lastName"), graduationYear: value(data, "graduationYear") || undefined, positions: value(data, "positions"), jerseyNumber: value(data, "jerseyNumber"), status: value(data, "status") || "PROSPECT", notes: value(data, "notes") });
  if (!parsed.success) return { error: "Add family, parent, and player details." };
  const existingCustomer = await prisma.customer.findFirst({ where: { businessId: user.business.id, email: parsed.data.parentEmail } });
  const customer = existingCustomer
    ? await prisma.customer.update({ where: { id: existingCustomer.id }, data: { name: parsed.data.parentName, phone: parsed.data.parentPhone || existingCustomer.phone } })
    : await prisma.customer.create({ data: { businessId: user.business.id, name: parsed.data.parentName, email: parsed.data.parentEmail, phone: parsed.data.parentPhone || null, source: "Club roster", segment: "Active players", tags: ["player", "club"] } });
  const family = await prisma.sportsFamily.upsert({ where: { customerId: customer.id }, create: { businessId: user.business.id, customerId: customer.id, familyName: parsed.data.familyName, billingContact: parsed.data.parentName, billingEmail: parsed.data.parentEmail }, update: { familyName: parsed.data.familyName, billingContact: parsed.data.parentName, billingEmail: parsed.data.parentEmail } });
  const player = await prisma.sportsPlayer.create({ data: { businessId: user.business.id, familyId: family.id, firstName: parsed.data.firstName, lastName: parsed.data.lastName, graduationYear: parsed.data.graduationYear, positions: parsed.data.positions ? parsed.data.positions.split(",").map((item) => item.trim()).filter(Boolean) : [], jerseyNumber: parsed.data.jerseyNumber || null, status: parsed.data.status, notes: parsed.data.notes || null } });
  await activity(user.business.id, user.name, "Added player", `${player.firstName} ${player.lastName}`, { playerId: player.id, familyId: family.id });
  revalidatePath("/dashboard/players"); revalidatePath("/dashboard/club-families"); revalidatePath("/dashboard");
  return { success: "Player and family profile created." };
}

const rosterSchema = z.object({ playerId: z.string().min(1), teamId: z.string().min(1), status: z.enum(["ACTIVE", "PENDING", "WAITLISTED", "FORMER"]) });
export async function assignSportsRosterAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser();
  if (!user || !canManage(user)) return { error: "Only club administrators can manage rosters." };
  const data = resolve(first, second); const parsed = rosterSchema.safeParse({ playerId: value(data, "playerId"), teamId: value(data, "teamId"), status: value(data, "status") || "PENDING" });
  if (!parsed.success) return { error: "Choose a player, team, and roster status." };
  const [player, team] = await Promise.all([prisma.sportsPlayer.findFirst({ where: { id: parsed.data.playerId, businessId: user.business.id } }), prisma.sportsTeam.findFirst({ where: { id: parsed.data.teamId, businessId: user.business.id } })]);
  if (!player || !team) return { error: "Player or team was not found for this club." };
  const roster = await prisma.sportsTeamRoster.upsert({ where: { businessId_teamId_playerId: { businessId: user.business.id, teamId: team.id, playerId: player.id } }, create: { businessId: user.business.id, teamId: team.id, playerId: player.id, status: parsed.data.status }, update: { status: parsed.data.status } });
  await activity(user.business.id, user.name, "Updated team roster", `${player.firstName} ${player.lastName} · ${team.name}`, { rosterId: roster.id, status: roster.status });
  revalidatePath("/dashboard/teams"); revalidatePath("/dashboard/players"); revalidatePath("/dashboard");
  return { success: "Roster saved." };
}

const coachAssignmentSchema = z.object({ coachId: z.string().min(1), teamId: z.string().min(1), role: z.string().min(2) });
export async function assignSportsCoachAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser();
  if (!user || !canManage(user)) return { error: "Only club administrators can manage coach assignments." };
  const data = resolve(first, second); const parsed = coachAssignmentSchema.safeParse({ coachId: value(data, "coachId"), teamId: value(data, "coachTeamId"), role: value(data, "coachRole") || "Coach" });
  if (!parsed.success) return { error: "Choose a coach and team." };
  const [coach, team] = await Promise.all([prisma.sportsCoach.findFirst({ where: { id: parsed.data.coachId, businessId: user.business.id } }), prisma.sportsTeam.findFirst({ where: { id: parsed.data.teamId, businessId: user.business.id } })]);
  if (!coach || !team) return { error: "Coach or team was not found for this club." };
  const assignment = await prisma.sportsTeamCoach.upsert({ where: { teamId_coachId: { teamId: team.id, coachId: coach.id } }, create: { teamId: team.id, coachId: coach.id, role: parsed.data.role }, update: { role: parsed.data.role } });
  await activity(user.business.id, user.name, "Assigned coach to team", `${coach.name} · ${team.name}`, { assignmentId: assignment.id, role: assignment.role });
  revalidatePath("/dashboard/teams"); revalidatePath("/dashboard/coaches"); revalidatePath("/dashboard");
  return { success: "Coach assignment saved." };
}

const formSchema = z.object({ title: z.string().min(3), type: z.enum(["TRYOUT", "PLAYER_REGISTRATION", "MEDICAL", "WAIVER", "VOLUNTEER", "SPONSOR_INQUIRY"]), description: z.string().optional(), fee: z.coerce.number().min(0) });
export async function saveSportsFormAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser(); if (!user || !canManage(user)) return { error: "Only club administrators can manage forms." };
  const data = resolve(first, second); const parsed = formSchema.safeParse({ title: value(data, "title"), type: value(data, "type"), description: value(data, "description"), fee: value(data, "fee") || "0" });
  if (!parsed.success) return { error: "Add a form title, type, and valid fee." };
  const form = await prisma.sportsForm.create({ data: { businessId: user.business.id, title: parsed.data.title, slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`, type: parsed.data.type, description: parsed.data.description || null, fee: parsed.data.fee, fields: ["Parent name", "Parent email", "Player name", "Graduation year", "Positions", "Notes"] } });
  await activity(user.business.id, user.name, "Created club form", form.title, { formId: form.id, type: form.type }); revalidatePath("/dashboard/forms");
  return { success: "Club form created." };
}

const scheduleSchema = z.object({ title: z.string().min(2), type: z.enum(["PRACTICE", "GAME", "TOURNAMENT", "TRYOUT", "CLUB_EVENT"]), startsAt: z.coerce.date(), teamId: z.string().optional(), location: z.string().optional(), opponent: z.string().optional(), description: z.string().optional() });
export async function saveSportsScheduleAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser(); if (!user || !canManage(user)) return { error: "Only club administrators can manage the schedule." };
  const data = resolve(first, second); const parsed = scheduleSchema.safeParse({ title: value(data, "title"), type: value(data, "type"), startsAt: value(data, "startsAt"), teamId: value(data, "teamId") || undefined, location: value(data, "location"), opponent: value(data, "opponent"), description: value(data, "description") });
  if (!parsed.success) return { error: "Add a title, schedule type, and date/time." };
  if (parsed.data.teamId && !(await prisma.sportsTeam.findFirst({ where: { id: parsed.data.teamId, businessId: user.business.id } }))) return { error: "Team was not found for this club." };
  const event = await prisma.sportsScheduleEvent.create({ data: { businessId: user.business.id, ...parsed.data, teamId: parsed.data.teamId || null, location: parsed.data.location || null, opponent: parsed.data.opponent || null, description: parsed.data.description || null } });
  await activity(user.business.id, user.name, "Added schedule event", event.title, { eventId: event.id, type: event.type }); revalidatePath("/dashboard/schedule"); revalidatePath("/dashboard");
  return { success: "Schedule event created." };
}

const invoiceSchema = z.object({ familyId: z.string().min(1), playerId: z.string().optional(), teamId: z.string().optional(), description: z.string().min(3), amount: z.coerce.number().positive(), dueAt: z.coerce.date().optional(), installmentPlan: z.string().optional(), autoPay: z.boolean() });
export async function saveSportsInvoiceAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser(); if (!user || !canManage(user)) return { error: "Only club administrators can manage invoices." };
  const data = resolve(first, second); const parsed = invoiceSchema.safeParse({ familyId: value(data, "familyId"), playerId: value(data, "playerId") || undefined, teamId: value(data, "teamId") || undefined, description: value(data, "description"), amount: value(data, "amount"), dueAt: value(data, "dueAt") || undefined, installmentPlan: value(data, "installmentPlan"), autoPay: data.get("autoPay") === "on" });
  if (!parsed.success) return { error: "Add a family, description, and valid amount." };
  const family = await prisma.sportsFamily.findFirst({ where: { id: parsed.data.familyId, businessId: user.business.id } }); if (!family) return { error: "Family was not found for this club." };
  const [player, team] = await Promise.all([
    parsed.data.playerId ? prisma.sportsPlayer.findFirst({ where: { id: parsed.data.playerId, businessId: user.business.id } }) : Promise.resolve(null),
    parsed.data.teamId ? prisma.sportsTeam.findFirst({ where: { id: parsed.data.teamId, businessId: user.business.id } }) : Promise.resolve(null)
  ]);
  if (parsed.data.playerId && !player) return { error: "Player was not found for this club." };
  if (parsed.data.teamId && !team) return { error: "Team was not found for this club." };
  const count = await prisma.sportsInvoice.count({ where: { businessId: user.business.id } });
  const invoice = await prisma.sportsInvoice.create({ data: { businessId: user.business.id, familyId: family.id, playerId: player?.id ?? null, teamId: team?.id ?? null, invoiceNumber: `GBC-${String(count + 1).padStart(4, "0")}`, description: parsed.data.description, amount: parsed.data.amount, dueAt: parsed.data.dueAt || null, installmentPlan: parsed.data.installmentPlan || null, autoPay: parsed.data.autoPay } });
  await activity(user.business.id, user.name, "Created club invoice", invoice.invoiceNumber, { invoiceId: invoice.id, amount: parsed.data.amount }); revalidatePath("/dashboard/club-payments"); revalidatePath("/dashboard");
  return { success: "Invoice created. Stripe collection remains gated by the existing connected-account setup." };
}

const invoiceStatusSchema = z.object({ invoiceId: z.string().min(1), status: z.enum(["DRAFT", "OPEN", "PENDING", "PAID", "PAST_DUE", "VOID"]) });
export async function updateSportsInvoiceStatusAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser(); if (!user || !canManage(user)) return { error: "Only club administrators can update invoices." };
  const data = resolve(first, second); const parsed = invoiceStatusSchema.safeParse({ invoiceId: value(data, "invoiceId"), status: value(data, "status") }); if (!parsed.success) return { error: "Choose a valid invoice status." };
  const invoice = await prisma.sportsInvoice.findFirst({ where: { id: parsed.data.invoiceId, businessId: user.business.id } }); if (!invoice) return { error: "Invoice was not found for this club." };
  await prisma.sportsInvoice.update({ where: { id: invoice.id }, data: { status: parsed.data.status } }); await activity(user.business.id, user.name, "Updated club invoice", invoice.invoiceNumber, { invoiceId: invoice.id, status: parsed.data.status }); revalidatePath("/dashboard/club-payments"); revalidatePath("/dashboard");
  return { success: "Invoice status updated." };
}

const websiteSchema = z.object({ pageId: z.string().min(1), title: z.string().min(2), summary: z.string().optional(), content: z.string().optional(), published: z.boolean() });
export async function saveWebsitePageAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser(); if (!user || !canManage(user)) return { error: "Only club administrators can edit the website." };
  const data = resolve(first, second); const parsed = websiteSchema.safeParse({ pageId: value(data, "pageId"), title: value(data, "title"), summary: value(data, "summary"), content: value(data, "content"), published: data.get("published") === "on" }); if (!parsed.success) return { error: "Add a page title." };
  const page = await prisma.websitePage.findFirst({ where: { id: parsed.data.pageId, businessId: user.business.id } }); if (!page) return { error: "Website page was not found for this club." };
  await prisma.websitePage.update({ where: { id: page.id }, data: { title: parsed.data.title, summary: parsed.data.summary || null, content: parsed.data.content || null, published: parsed.data.published, updatedBy: user.id } }); await activity(user.business.id, user.name, "Updated website page", page.slug, { pageId: page.id, published: parsed.data.published }); revalidatePath("/dashboard/website"); revalidatePath(`/club/${user.business.slug}/${page.slug}`);
  return { success: "Website page saved." };
}

const sponsorSchema = z.object({ name: z.string().min(2), contactName: z.string().optional(), email: z.string().email().optional().or(z.literal("")), tier: z.string().optional(), status: z.string().min(2), notes: z.string().optional() });
export async function saveSponsorAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const user = await clubUser(); if (!user || !canManage(user)) return { error: "Only club administrators can manage sponsors." };
  const data = resolve(first, second); const parsed = sponsorSchema.safeParse({ name: value(data, "name"), contactName: value(data, "contactName"), email: value(data, "email"), tier: value(data, "tier"), status: value(data, "status") || "PROSPECT", notes: value(data, "notes") }); if (!parsed.success) return { error: "Add sponsor details and a valid contact email." };
  const sponsor = await prisma.sponsor.create({ data: { businessId: user.business.id, ...parsed.data, contactName: parsed.data.contactName || null, email: parsed.data.email || null, tier: parsed.data.tier || null, notes: parsed.data.notes || null } }); await activity(user.business.id, user.name, "Added sponsor", sponsor.name, { sponsorId: sponsor.id }); revalidatePath("/dashboard/sponsors");
  return { success: "Sponsor added." };
}

const publicSubmissionSchema = z.object({ formId: z.string().min(1), parentName: z.string().min(2), parentEmail: z.string().email(), parentPhone: z.string().optional(), familyName: z.string().min(2), playerFirstName: z.string().min(2), playerLastName: z.string().min(2), graduationYear: z.coerce.number().int().min(2024).max(2045).optional(), positions: z.string().optional(), notes: z.string().optional() });
export async function submitSportsFormAction(first: FormData | SportsActionResult | null | undefined, second?: FormData) {
  const data = resolve(first, second);
  const parsed = publicSubmissionSchema.safeParse({ formId: value(data, "formId"), parentName: value(data, "parentName"), parentEmail: value(data, "parentEmail"), parentPhone: value(data, "parentPhone"), familyName: value(data, "familyName"), playerFirstName: value(data, "playerFirstName"), playerLastName: value(data, "playerLastName"), graduationYear: value(data, "graduationYear") || undefined, positions: value(data, "positions"), notes: value(data, "notes") });
  if (!parsed.success) return { error: "Complete the parent and player details before submitting." };
  const form = await prisma.sportsForm.findFirst({ where: { id: parsed.data.formId, active: true }, include: { business: { include: { businessType: true } } } });
  if (!form || form.business.businessType.code !== "SPORTS_CLUB") return { error: "This club form is no longer available." };
  const existingCustomer = await prisma.customer.findFirst({ where: { businessId: form.businessId, email: parsed.data.parentEmail } });
  const customer = existingCustomer ?? await prisma.customer.create({ data: { businessId: form.businessId, name: parsed.data.parentName, email: parsed.data.parentEmail, phone: parsed.data.parentPhone || null, source: "Sports form", segment: form.type === "TRYOUT" ? "Tryout interest" : "Active players", tags: ["club", form.type.toLowerCase()] } });
  const family = await prisma.sportsFamily.upsert({ where: { customerId: customer.id }, create: { businessId: form.businessId, customerId: customer.id, familyName: parsed.data.familyName, billingContact: parsed.data.parentName, billingEmail: parsed.data.parentEmail }, update: { familyName: parsed.data.familyName, billingContact: parsed.data.parentName, billingEmail: parsed.data.parentEmail } });
  const player = await prisma.sportsPlayer.create({ data: { businessId: form.businessId, familyId: family.id, firstName: parsed.data.playerFirstName, lastName: parsed.data.playerLastName, graduationYear: parsed.data.graduationYear, positions: parsed.data.positions ? parsed.data.positions.split(",").map((item) => item.trim()).filter(Boolean) : [], notes: parsed.data.notes || null, status: "PROSPECT" } });
  const submission = await prisma.sportsFormSubmission.create({ data: { businessId: form.businessId, formId: form.id, familyId: family.id, playerId: player.id, data: parsed.data } });
  await activity(form.businessId, parsed.data.parentName, "Submitted club form", `${player.firstName} ${player.lastName}`, { formId: form.id, submissionId: submission.id, type: form.type });

  if (Number(form.fee) > 0) {
    const invoice = await prisma.sportsInvoice.create({ data: { businessId: form.businessId, familyId: family.id, playerId: player.id, invoiceNumber: `GBC-FORM-${submission.id.slice(-6).toUpperCase()}`, description: `${form.title} fee`, amount: form.fee, status: isStripePaymentsReady(form.business) && isStripeConfigured() ? "PENDING" : "OPEN" } });
    if (isStripePaymentsReady(form.business) && isStripeConfigured()) {
      try {
        const checkout = await createSportsInvoiceCheckoutSession({ businessId: form.businessId, invoiceId: invoice.id, clubSlug: form.business.slug, amountCents: Math.round(Number(form.fee) * 100), title: form.title, email: parsed.data.parentEmail });
        await prisma.sportsInvoice.update({ where: { id: invoice.id }, data: { stripeCheckoutId: checkout.id } });
        if (checkout.url) return { success: "Submission saved. Continue to secure test-mode payment.", checkoutUrl: checkout.url } as SportsActionResult & { checkoutUrl: string };
      } catch (error) {
        await prisma.activityLog.create({ data: { businessId: form.businessId, actor: "System", action: "Club payment checkout unavailable", entity: invoice.invoiceNumber, metadata: { invoiceId: invoice.id, error: error instanceof Error ? error.message : "Stripe checkout failed" } } });
      }
    }
  }

  return { success: "Submission received. The club will follow up with next steps." };
}
