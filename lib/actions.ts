"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import type { ModuleKey, SubscriptionPlan, UserRole } from "@prisma/client";
import { destroySession, createSession, requireAdmin, requireBusinessUser, requireUser, verifyPassword } from "@/lib/auth";
import { parseContactCsv } from "@/lib/contact-csv";
import { getEmailFromAddress, sendFollowUpEmail } from "@/lib/email";
import { emailSetupMessage, isEmailSendingReady, isStripePaymentsReady, stripeSetupMessage } from "@/lib/integration-gates";
import { prisma } from "@/lib/prisma";
import {
  demoActivityLogWhere,
  demoCampaignWhere,
  demoCustomerWhere,
  demoInquiryWhere,
  demoPaymentWhere,
  demoRegistrationWhere,
  launchReadinessItems
} from "@/lib/dashboard-data";
import { filterCustomersBySegment, getSegmentLabel, getSegmentOptions } from "@/lib/segments";
import { createRegistrationCheckoutSession, createStripeCheckoutSession, createStripeCustomer, createStripePortalSession, isStripeConfigured } from "@/lib/stripe";
import { provisionWorkspaceDefaults } from "@/lib/workspace-provisioning";
import { ensureSupportedBusinessTypes } from "@/lib/business-types";

export type ActionResult = {
  error?: string;
  success?: string;
};

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | ActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

function slugify(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "")
      .slice(0, 48) || "business"
  );
}

async function uniqueBusinessSlug(name: string) {
  const base = slugify(name);
  let slug = base;
  let suffix = 2;

  while (await prisma.business.findUnique({ where: { slug }, select: { id: true } })) {
    slug = `${base}-${suffix}`;
    suffix += 1;
  }

  return slug;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8)
});

export async function loginAction(_previousState: { error?: string } | null, formData: FormData) {
  const parsed = loginSchema.safeParse({
    email: formString(formData, "email").toLowerCase(),
    password: formString(formData, "password")
  });

  if (!parsed.success) {
    return { error: "Use a valid email and password." };
  }

  const user = await prisma.user.findUnique({
    where: {
      email: parsed.data.email.toLowerCase()
    }
  });

  if (!user || !user.isActive || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
    return { error: "Incorrect email or password." };
  }

  await createSession(user.id);
  const requestedNext = formString(formData, "next");
  const safeNext = requestedNext.startsWith("/") && !requestedNext.startsWith("//") ? requestedNext : "";
  const defaultPath = user.role === "ADMIN" ? "/admin" : user.businessId ? "/dashboard" : "/onboarding";
  redirect(safeNext || defaultPath);
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

const onboardingSchema = z.object({
  businessName: z.string().min(2),
  businessType: z.enum(["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"]),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email(),
  phone: z.string().min(7).optional().or(z.literal("")),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  address: z.string().min(4),
  description: z.string().max(500).optional()
});

export async function completeOnboardingAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireUser();
  const formData = resolveFormData(first, second);

  if (user.role === "ADMIN") {
    redirect("/admin");
  }

  if (user.business) {
    redirect("/dashboard");
  }

  const parsed = onboardingSchema.safeParse({
    businessName: formString(formData, "businessName"),
    businessType: formString(formData, "businessType"),
    website: formString(formData, "website"),
    contactEmail: formString(formData, "contactEmail"),
    phone: formString(formData, "phone"),
    brandColor: formString(formData, "brandColor") || "#733038",
    address: formString(formData, "address"),
    description: formString(formData, "description")
  });

  if (!parsed.success) {
    return { error: "Add a business name, type, valid contact email, brand color, and address." } satisfies ActionResult;
  }

  const businessType = await prisma.businessType.upsert({
    where: {
      code: parsed.data.businessType
    },
    update: {},
    create: {
      code: parsed.data.businessType,
      name:
        parsed.data.businessType === "RESTAURANT"
          ? "Restaurant"
          : parsed.data.businessType === "DANCE_STUDIO"
            ? "Dance Studio / Education"
            : parsed.data.businessType === "SPORTS_CLUB"
              ? "Sports Club"
              : "Retail / Ecommerce",
      description:
        parsed.data.businessType === "RESTAURANT"
          ? "Restaurants, hospitality groups, caterers, and experience-led food brands."
          : parsed.data.businessType === "DANCE_STUDIO"
            ? "Dance studios, education programs, classes, events, and parent communication."
            : parsed.data.businessType === "SPORTS_CLUB"
              ? "Club sports organizations managing players, families, teams, dues, schedules, and recruiting."
              : "Retail, ecommerce, boutique, and product-led businesses."
    }
  });

  const slug = await uniqueBusinessSlug(parsed.data.businessName);

  await prisma.$transaction(async (tx) => {
    const business = await tx.business.create({
      data: {
        name: parsed.data.businessName,
        slug,
        description: parsed.data.description || `${parsed.data.businessName} workspace created through Mayke Motion onboarding.`,
        website: parsed.data.website || null,
        contactEmail: parsed.data.contactEmail,
        phone: parsed.data.phone || null,
        address: parsed.data.address,
        brandPrimary: "#14110f",
        brandAccent: parsed.data.brandColor,
        logoUrl: null,
        businessTypeId: businessType.id,
        users: {
          connect: {
            id: user.id
          }
        }
      }
    });

    await provisionWorkspaceDefaults({
      actor: user.name,
      businessId: business.id,
      businessName: business.name,
      businessType: parsed.data.businessType,
      prisma: tx
    });

    await tx.activityLog.create({
      data: {
        businessId: business.id,
        actor: user.name,
        action: "Completed onboarding",
        entity: business.name,
        metadata: {
          businessType: parsed.data.businessType,
          contactEmail: parsed.data.contactEmail
        }
      }
    });
  });

  revalidatePath("/dashboard");
  revalidatePath("/onboarding");
  redirect("/dashboard");
}

const checkoutSchema = z.object({
  plan: z.enum(["STARTER", "GROWTH", "PRO"])
});

async function ensureStripeCustomerForBusiness(user: Awaited<ReturnType<typeof requireBusinessUser>>) {
  if (user.business.stripeCustomerId) {
    return user.business.stripeCustomerId;
  }

  const stripeCustomer = await createStripeCustomer({
    businessId: user.business.id,
    businessName: user.business.name,
    email: user.business.contactEmail ?? user.email
  });

  await prisma.business.update({
    where: {
      id: user.business.id
    },
    data: {
      stripeCustomerId: stripeCustomer.id
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Connected Stripe customer",
      entity: user.business.name,
      metadata: { stripeCustomerId: stripeCustomer.id }
    }
  });

  return stripeCustomer.id;
}

export async function startStripeCheckoutAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);

  if (user.role === "STAFF") {
    return { error: "Only client owners can change subscription plans." } satisfies ActionResult;
  }

  const parsed = checkoutSchema.safeParse({
    plan: formString(formData, "plan")
  });

  if (!parsed.success) {
    return { error: "Choose a valid subscription plan." } satisfies ActionResult;
  }

  let sessionUrl = "";

  try {
    const customerId = await ensureStripeCustomerForBusiness(user);
    const session = await createStripeCheckoutSession({
      businessId: user.business.id,
      customerId,
      plan: parsed.data.plan as SubscriptionPlan
    });

    if (!session.url) {
      return { error: "Stripe did not return a checkout URL." } satisfies ActionResult;
    }

    await prisma.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Started Stripe checkout",
        entity: parsed.data.plan,
        metadata: { checkoutSessionId: session.id, plan: parsed.data.plan }
      }
    });

    sessionUrl = session.url;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Stripe checkout could not be started."
    } satisfies ActionResult;
  }

  redirect(sessionUrl);
}

export async function openStripeCustomerPortalAction(_first?: FormData | ActionResult | null, _second?: FormData) {
  const user = await requireBusinessUser();

  if (user.role === "STAFF") {
    return { error: "Only client owners can manage billing." } satisfies ActionResult;
  }

  let portalUrl = "";

  try {
    const customerId = await ensureStripeCustomerForBusiness(user);
    const session = await createStripePortalSession({ customerId });

    if (!session.url) {
      return { error: "Stripe did not return a portal URL." } satisfies ActionResult;
    }

    await prisma.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Opened Stripe customer portal",
        entity: user.business.name,
        metadata: { portalSessionId: session.id }
      }
    });

    portalUrl = session.url;
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Stripe customer portal could not be opened."
    } satisfies ActionResult;
  }

  redirect(portalUrl);
}

const customerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  segment: z.string().min(2),
  tags: z.string().optional(),
  source: z.string().min(2)
});

function parseTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean);
}

export async function createCustomerAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = customerSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    segment: formString(formData, "segment"),
    tags: formString(formData, "tags"),
    source: formString(formData, "source")
  });

  if (!parsed.success) {
    return { error: "Add a name, valid email if provided, segment, and source." } satisfies ActionResult;
  }

  const customer = await prisma.customer.create({
    data: {
      businessId: user.business.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      segment: parsed.data.segment,
      source: parsed.data.source,
      tags: Array.from(new Set([parsed.data.segment.toLowerCase(), ...parseTags(parsed.data.tags ?? "")]))
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Created customer",
      entity: customer.name,
      metadata: { source: parsed.data.source }
    }
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  return { success: "Customer created." } satisfies ActionResult;
}

const contactImportSchema = z.object({
  businessId: z.string().optional(),
  csv: z.string().min(5)
});

export async function importContactsAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const actor = await requireUser();
  const formData = resolveFormData(first, second);
  const parsed = contactImportSchema.safeParse({
    businessId: formString(formData, "businessId"),
    csv: formString(formData, "csv")
  });

  if (!parsed.success) {
    return { error: "Upload a CSV before importing." } satisfies ActionResult;
  }

  const businessId = actor.role === "ADMIN" ? parsed.data.businessId : actor.businessId;
  if (!businessId) {
    return { error: "Choose a business for this import." } satisfies ActionResult;
  }

  if (actor.role === "STAFF" || (actor.role === "CLIENT_OWNER" && actor.businessId !== businessId)) {
    return { error: "You do not have permission to import contacts for this business." } satisfies ActionResult;
  }

  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { id: true, name: true }
  });

  if (!business) {
    return { error: "Business was not found." } satisfies ActionResult;
  }

  const rows = parseContactCsv(parsed.data.csv);
  if (!rows.length) {
    return { error: "No valid contact rows were found in the CSV." } satisfies ActionResult;
  }

  const existing = await prisma.customer.findMany({
    where: {
      businessId,
      email: {
        in: rows.map((row) => row.email.toLowerCase()).filter(Boolean)
      }
    },
    select: {
      id: true,
      email: true,
      tags: true
    }
  });
  const existingByEmail = new Map(existing.map((customer) => [customer.email?.toLowerCase(), customer]));
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const email = row.email.toLowerCase();
    const name = [row.firstName, row.lastName].filter(Boolean).join(" ").trim() || email || row.phone;

    if (!name) {
      skipped += 1;
      continue;
    }

    const duplicate = email ? existingByEmail.get(email) : null;
    if (duplicate) {
      await prisma.customer.update({
        where: { id: duplicate.id },
        data: {
          name,
          phone: row.phone || undefined,
          source: row.source || "CSV import",
          notes: row.notes || undefined,
          tags: Array.from(new Set([...duplicate.tags, ...row.tags]))
        }
      });
      updated += 1;
    } else {
      const createdCustomer = await prisma.customer.create({
        data: {
          businessId,
          name,
          email: email || null,
          phone: row.phone || null,
          source: row.source || "CSV import",
          segment: row.tags[0] ?? "Imported",
          tags: row.tags,
          notes: row.notes || null
        }
      });
      if (email) {
        existingByEmail.set(email, createdCustomer);
      }
      created += 1;
    }
  }

  await prisma.activityLog.create({
    data: {
      businessId,
      actor: actor.name,
      action: "Imported contacts",
      entity: business.name,
      metadata: {
        created,
        updated,
        skipped,
        total: rows.length
      }
    }
  });

  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard");
  if (actor.role === "ADMIN") {
    revalidatePath("/admin");
    revalidatePath(`/admin/clients/${businessId}`);
  }

  return { success: `Import complete. Created ${created}, updated ${updated}, skipped ${skipped}.` } satisfies ActionResult;
}

const inquirySchema = z.object({
  subject: z.string().min(3),
  message: z.string().min(8),
  kind: z.enum([
    "RESERVATION",
    "CATERING",
    "PRIVATE_EVENT",
    "PRODUCT_QUESTION",
    "REGISTRATION",
    "RECITAL",
    "CLASS_INFO",
    "SUPPORT",
    "WHOLESALE",
    "GENERAL"
  ]),
  source: z.string().min(2),
  customerId: z.string().optional().or(z.literal("")),
  leadName: z.string().optional(),
  leadEmail: z.string().email().optional().or(z.literal("")),
  leadPhone: z.string().optional()
});

async function getScopedInquiry(inquiryId: string, businessId: string) {
  if (!inquiryId) return null;

  return prisma.inquiry.findFirst({
    where: {
      id: inquiryId,
      businessId
    },
    include: {
      customer: true
    }
  });
}

async function getScopedCustomer(customerId: string, businessId: string) {
  if (!customerId) return null;

  return prisma.customer.findFirst({
    where: {
      id: customerId,
      businessId
    }
  });
}

export async function createInquiryAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = inquirySchema.safeParse({
    subject: formString(formData, "subject"),
    message: formString(formData, "message"),
    kind: formString(formData, "kind"),
    source: formString(formData, "source"),
    customerId: formString(formData, "customerId"),
    leadName: formString(formData, "leadName"),
    leadEmail: formString(formData, "leadEmail"),
    leadPhone: formString(formData, "leadPhone")
  });

  if (!parsed.success) {
    return { error: "Add an inquiry type, subject, source, and message." } satisfies ActionResult;
  }

  let customer:
    | {
        id: string;
        name: string;
        email: string | null;
        phone: string | null;
      }
    | null = null;

  if (parsed.data.customerId) {
    customer = await prisma.customer.findFirst({
      where: {
        id: parsed.data.customerId,
        businessId: user.business.id
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true
      }
    });

    if (!customer) {
      return { error: "That customer does not belong to this business." } satisfies ActionResult;
    }
  }

  if (!customer && !parsed.data.leadName && !parsed.data.leadEmail && !parsed.data.leadPhone) {
    return { error: "Add a customer or at least one lead contact detail." } satisfies ActionResult;
  }

  const inquiry = await prisma.inquiry.create({
    data: {
      businessId: user.business.id,
      customerId: parsed.data.customerId || null,
      leadName: parsed.data.leadName || customer?.name || null,
      leadEmail: parsed.data.leadEmail || customer?.email || null,
      leadPhone: parsed.data.leadPhone || customer?.phone || null,
      kind: parsed.data.kind,
      subject: parsed.data.subject,
      message: parsed.data.message,
      source: parsed.data.source,
      requestedAt: parsed.data.kind === "RESERVATION" || parsed.data.kind === "CATERING" ? new Date() : null
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Logged inquiry",
      entity: inquiry.subject,
      metadata: { kind: inquiry.kind }
    }
  });

  revalidatePath("/dashboard/inquiries");
  revalidatePath("/dashboard");
  return { success: "Inquiry created." } satisfies ActionResult;
}

const registrationFormSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  fee: z.coerce.number().min(0)
});

export async function createRegistrationFormAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Registration forms are only available for dance studio workspaces." } satisfies ActionResult;
  }

  const parsed = registrationFormSchema.safeParse({
    title: formString(formData, "title"),
    description: formString(formData, "description"),
    fee: formString(formData, "fee") || "0"
  });

  if (!parsed.success) {
    return { error: "Add a form title and valid registration fee." } satisfies ActionResult;
  }

  const form = await prisma.registrationForm.create({
    data: {
      businessId: user.business.id,
      title: parsed.data.title,
      slug: `${slugify(parsed.data.title)}-${Date.now().toString(36)}`,
      description: parsed.data.description || null,
      fee: parsed.data.fee
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Created registration form",
      entity: form.title,
      metadata: {
        formId: form.id,
        fee: parsed.data.fee
      }
    }
  });

  revalidatePath("/dashboard/registrations");
  return { success: "Registration form created." } satisfies ActionResult;
}

const registrationSubmitSchema = z.object({
  formId: z.string().min(1),
  referralSource: z.string().min(2),
  referralName: z.string().optional(),
  familyLastName: z.string().min(2),
  homeAddress: z.string().min(4),
  city: z.string().min(2),
  state: z.string().min(2),
  zip: z.string().min(3),
  primaryPhone: z.string().min(7),
  emergencyContactInfo: z.string().min(5),
  contact1FirstName: z.string().min(2),
  contact1LastName: z.string().min(2),
  contact1Type: z.string().min(2),
  contact1Phone: z.string().min(7),
  contact1Email: z.string().email(),
  smsConsent: z.boolean(),
  contact2FirstName: z.string().optional(),
  contact2LastName: z.string().optional(),
  contact2Type: z.string().optional(),
  contact2Phone: z.string().optional(),
  contact2Email: z.string().email().optional().or(z.literal("")),
  studentFirstName: z.string().min(2),
  studentLastName: z.string().min(2),
  studentGender: z.string().min(1),
  birthDate: z.coerce.date(),
  studentPhone: z.string().optional(),
  tshirtSize: z.string().min(1),
  gradeLevel: z.string().min(1),
  specialNeeds: z.string().optional(),
  classInterest: z.string().min(2),
  trialClass: z.boolean(),
  notes: z.string().optional()
});

export async function submitRegistrationAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const formData = resolveFormData(first, second);
  const parsed = registrationSubmitSchema.safeParse({
    formId: formString(formData, "formId"),
    referralSource: formString(formData, "referralSource"),
    referralName: formString(formData, "referralName"),
    familyLastName: formString(formData, "familyLastName"),
    homeAddress: formString(formData, "homeAddress"),
    city: formString(formData, "city"),
    state: formString(formData, "state"),
    zip: formString(formData, "zip"),
    primaryPhone: formString(formData, "primaryPhone"),
    emergencyContactInfo: formString(formData, "emergencyContactInfo"),
    contact1FirstName: formString(formData, "contact1FirstName"),
    contact1LastName: formString(formData, "contact1LastName"),
    contact1Type: formString(formData, "contact1Type"),
    contact1Phone: formString(formData, "contact1Phone"),
    contact1Email: formString(formData, "contact1Email"),
    smsConsent: formData.get("smsConsent") === "on",
    contact2FirstName: formString(formData, "contact2FirstName"),
    contact2LastName: formString(formData, "contact2LastName"),
    contact2Type: formString(formData, "contact2Type"),
    contact2Phone: formString(formData, "contact2Phone"),
    contact2Email: formString(formData, "contact2Email"),
    studentFirstName: formString(formData, "studentFirstName"),
    studentLastName: formString(formData, "studentLastName"),
    studentGender: formString(formData, "studentGender"),
    birthDate: formString(formData, "birthDate"),
    studentPhone: formString(formData, "studentPhone"),
    tshirtSize: formString(formData, "tshirtSize"),
    gradeLevel: formString(formData, "gradeLevel"),
    specialNeeds: formString(formData, "specialNeeds"),
    classInterest: formString(formData, "classInterest"),
    trialClass: formData.get("trialClass") === "on",
    notes: formString(formData, "notes")
  });

  if (!parsed.success || parsed.data.birthDate.toString() === "Invalid Date") {
    return { error: "Complete the required registration fields before submitting." } satisfies ActionResult;
  }

  const form = await prisma.registrationForm.findUnique({
    where: { id: parsed.data.formId },
    include: {
      business: {
        include: {
          businessType: true
        }
      }
    }
  });

  if (!form || !form.active || form.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Registration form is not available." } satisfies ActionResult;
  }

  const fee = Number(form.fee);
  if (fee > 0 && !isStripePaymentsReady(form.business)) {
    return { error: stripeSetupMessage } satisfies ActionResult;
  }

  if (fee > 0 && !isStripeConfigured()) {
    return { error: "Stripe API keys are not configured. Please contact Jete Dance Center to complete registration." } satisfies ActionResult;
  }

  const registration = await prisma.registrationSubmission.create({
    data: {
      businessId: form.businessId,
      formId: form.id,
      paymentStatus: fee > 0 ? "PENDING" : "UNPAID",
      referralSource: parsed.data.referralSource,
      referralName: parsed.data.referralName || null,
      familyLastName: parsed.data.familyLastName,
      homeAddress: parsed.data.homeAddress,
      city: parsed.data.city,
      state: parsed.data.state,
      zip: parsed.data.zip,
      primaryPhone: parsed.data.primaryPhone,
      emergencyContactInfo: parsed.data.emergencyContactInfo,
      contact1FirstName: parsed.data.contact1FirstName,
      contact1LastName: parsed.data.contact1LastName,
      contact1Type: parsed.data.contact1Type,
      contact1Phone: parsed.data.contact1Phone,
      contact1Email: parsed.data.contact1Email,
      smsConsent: parsed.data.smsConsent,
      contact2FirstName: parsed.data.contact2FirstName || null,
      contact2LastName: parsed.data.contact2LastName || null,
      contact2Type: parsed.data.contact2Type || null,
      contact2Phone: parsed.data.contact2Phone || null,
      contact2Email: parsed.data.contact2Email || null,
      studentFirstName: parsed.data.studentFirstName,
      studentLastName: parsed.data.studentLastName,
      studentGender: parsed.data.studentGender,
      birthDate: parsed.data.birthDate,
      studentPhone: parsed.data.studentPhone || null,
      tshirtSize: parsed.data.tshirtSize,
      gradeLevel: parsed.data.gradeLevel,
      specialNeeds: parsed.data.specialNeeds || null,
      classInterest: parsed.data.classInterest,
      trialClass: parsed.data.trialClass,
      notes: parsed.data.notes || null
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: form.businessId,
      actor: `${parsed.data.contact1FirstName} ${parsed.data.contact1LastName}`,
      action: "Submitted registration",
      entity: `${parsed.data.studentFirstName} ${parsed.data.studentLastName}`,
      metadata: {
        registrationId: registration.id,
        formId: form.id,
        paymentStatus: registration.paymentStatus
      }
    }
  });

  if (fee > 0) {
    try {
      const session = await createRegistrationCheckoutSession({
        businessId: form.businessId,
        registrationId: registration.id,
        formSlug: form.slug,
        amountCents: Math.round(fee * 100),
        title: form.title,
        email: parsed.data.contact1Email
      });

      await prisma.registrationSubmission.update({
        where: { id: registration.id },
        data: {
          stripeSessionId: session.id
        }
      });

      if (!session.url) {
        return { error: "Stripe did not return a checkout URL." } satisfies ActionResult;
      }

      redirect(session.url);
    } catch (error) {
      await prisma.registrationSubmission.update({
        where: { id: registration.id },
        data: {
          paymentStatus: "FAILED"
        }
      });
      return { error: error instanceof Error ? error.message : "Payment checkout could not be started." } satisfies ActionResult;
    }
  }

  redirect(`/register/${form.slug}/success?registration=${registration.id}`);
}

const registrationStatusSchema = z.object({
  registrationId: z.string().min(1),
  status: z.enum(["NEW", "REVIEWED", "CONTACTED", "ENROLLED", "NOT_A_FIT"])
});

export async function updateRegistrationStatusAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = registrationStatusSchema.safeParse({
    registrationId: formString(formData, "registrationId"),
    status: formString(formData, "status")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a valid registration status." } satisfies ActionResult;
  }

  const registration = await prisma.registrationSubmission.findFirst({
    where: { id: parsed.data.registrationId, businessId: user.business.id }
  });

  if (!registration) {
    return { error: "Registration was not found for this business." } satisfies ActionResult;
  }

  await prisma.registrationSubmission.update({
    where: { id: registration.id },
    data: { status: parsed.data.status }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Updated registration status",
      entity: `${registration.studentFirstName} ${registration.studentLastName}`,
      metadata: { registrationId: registration.id, from: registration.status, to: parsed.data.status }
    }
  });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  revalidatePath("/dashboard/registrations");
  revalidatePath("/dashboard");
  return { success: "Registration status updated." } satisfies ActionResult;
}

const registrationNoteSchema = z.object({
  registrationId: z.string().min(1),
  body: z.string().min(3)
});

export async function addRegistrationNoteAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = registrationNoteSchema.safeParse({
    registrationId: formString(formData, "registrationId"),
    body: formString(formData, "body")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Write a note before saving." } satisfies ActionResult;
  }

  const registration = await prisma.registrationSubmission.findFirst({
    where: { id: parsed.data.registrationId, businessId: user.business.id }
  });

  if (!registration) {
    return { error: "Registration was not found for this business." } satisfies ActionResult;
  }

  await prisma.registrationNote.create({
    data: {
      businessId: user.business.id,
      registrationId: registration.id,
      authorId: user.id,
      body: parsed.data.body
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Added registration note",
      entity: `${registration.studentFirstName} ${registration.studentLastName}`,
      metadata: { registrationId: registration.id }
    }
  });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  return { success: "Note added." } satisfies ActionResult;
}

const convertRegistrationSchema = z.object({
  registrationId: z.string().min(1)
});

export async function convertRegistrationToCustomerAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = convertRegistrationSchema.safeParse({
    registrationId: formString(formData, "registrationId")
  });

  if (!parsed.success || user.business.businessType.code !== "DANCE_STUDIO") {
    return { error: "Choose a valid registration." } satisfies ActionResult;
  }

  const registration = await prisma.registrationSubmission.findFirst({
    where: { id: parsed.data.registrationId, businessId: user.business.id }
  });

  if (!registration) {
    return { error: "Registration was not found for this business." } satisfies ActionResult;
  }

  if (registration.customerId) {
    return { error: "Registration is already connected to a contact." } satisfies ActionResult;
  }

  const customer = await prisma.customer.create({
    data: {
      businessId: user.business.id,
      name: `${registration.contact1FirstName} ${registration.contact1LastName}`,
      email: registration.contact1Email,
      phone: registration.contact1Phone,
      source: registration.referralSource,
      segment: "Registration family",
      tags: ["registration", "family", registration.classInterest.toLowerCase()],
      notes: `Student: ${registration.studentFirstName} ${registration.studentLastName}. ${registration.notes ?? ""}`.trim(),
      lastContactedAt: new Date()
    }
  });

  await prisma.registrationSubmission.update({
    where: { id: registration.id },
    data: {
      customerId: customer.id,
      status: registration.status === "NEW" ? "REVIEWED" : registration.status
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Converted registration to contact",
      entity: customer.name,
      metadata: { registrationId: registration.id, customerId: customer.id }
    }
  });

  revalidatePath(`/dashboard/registrations/${registration.id}`);
  revalidatePath(`/dashboard/customers/${customer.id}`);
  revalidatePath("/dashboard/customers");
  return { success: "Registration converted to contact." } satisfies ActionResult;
}

const statusSchema = z.object({
  inquiryId: z.string().min(1),
  status: z.enum(["NEW", "IN_PROGRESS", "FOLLOWED_UP", "CLOSED"])
});

export async function updateInquiryStatusAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = statusSchema.safeParse({
    inquiryId: formString(formData, "inquiryId"),
    status: formString(formData, "status")
  });

  if (!parsed.success) {
    return { error: "Choose a valid inquiry status." } satisfies ActionResult;
  }

  const inquiry = await getScopedInquiry(parsed.data.inquiryId, user.business.id);
  if (!inquiry) {
    return { error: "Inquiry not found for this business." } satisfies ActionResult;
  }

  await prisma.inquiry.update({
    where: {
      id: inquiry.id
    },
    data: {
      status: parsed.data.status
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Updated inquiry status",
      entity: inquiry.subject,
      metadata: { from: inquiry.status, to: parsed.data.status, inquiryId: inquiry.id }
    }
  });

  revalidatePath(`/dashboard/inquiries/${inquiry.id}`);
  revalidatePath(`/dashboard/communications/inquiry-${inquiry.id}`);
  revalidatePath("/dashboard/inquiries");
  revalidatePath("/dashboard/communications");
  revalidatePath("/dashboard");
  return { success: "Inquiry status updated." } satisfies ActionResult;
}

const noteSchema = z.object({
  inquiryId: z.string().min(1),
  body: z.string().min(3)
});

const reminderSchema = z.object({
  title: z.string().min(3),
  dueAt: z.coerce.date(),
  customerId: z.string().optional(),
  inquiryId: z.string().optional(),
  messageId: z.string().optional()
});

export async function createReminderAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = reminderSchema.safeParse({
    title: formString(formData, "title"),
    dueAt: formString(formData, "dueAt"),
    customerId: formString(formData, "customerId"),
    inquiryId: formString(formData, "inquiryId"),
    messageId: formString(formData, "messageId")
  });

  if (!parsed.success || parsed.data.dueAt.toString() === "Invalid Date") {
    return { error: "Add a reminder title and valid due date." } satisfies ActionResult;
  }

  const customerId = parsed.data.customerId || null;
  const inquiryId = parsed.data.inquiryId || null;
  const messageId = parsed.data.messageId || null;

  if (!customerId && !inquiryId && !messageId) {
    return { error: "Connect this reminder to a contact, inquiry, or message." } satisfies ActionResult;
  }

  const [customer, inquiry, message] = await Promise.all([
    customerId ? prisma.customer.findFirst({ where: { id: customerId, businessId: user.business.id }, select: { id: true, name: true } }) : null,
    inquiryId ? prisma.inquiry.findFirst({ where: { id: inquiryId, businessId: user.business.id }, select: { id: true, subject: true, customerId: true } }) : null,
    messageId ? prisma.message.findFirst({ where: { id: messageId, businessId: user.business.id }, select: { id: true, subject: true, customerId: true } }) : null
  ]);

  if ((customerId && !customer) || (inquiryId && !inquiry) || (messageId && !message)) {
    return { error: "Reminder target was not found for this business." } satisfies ActionResult;
  }

  const reminder = await prisma.reminder.create({
    data: {
      businessId: user.business.id,
      title: parsed.data.title,
      dueAt: parsed.data.dueAt,
      customerId: customer?.id ?? inquiry?.customerId ?? message?.customerId ?? null,
      inquiryId: inquiry?.id ?? null,
      messageId: message?.id ?? null,
      createdById: user.id
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Created follow-up reminder",
      entity: reminder.title,
      metadata: {
        reminderId: reminder.id,
        customerId: reminder.customerId,
        inquiryId: reminder.inquiryId,
        messageId: reminder.messageId,
        dueAt: reminder.dueAt.toISOString()
      }
    }
  });

  revalidatePath("/dashboard");
  if (reminder.customerId) revalidatePath(`/dashboard/customers/${reminder.customerId}`);
  if (reminder.inquiryId) {
    revalidatePath(`/dashboard/inquiries/${reminder.inquiryId}`);
    revalidatePath(`/dashboard/communications/inquiry-${reminder.inquiryId}`);
  }
  if (reminder.messageId) revalidatePath("/dashboard/communications");
  return { success: "Reminder created." } satisfies ActionResult;
}

const completeReminderSchema = z.object({
  reminderId: z.string().min(1)
});

export async function completeReminderAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = completeReminderSchema.safeParse({
    reminderId: formString(formData, "reminderId")
  });

  if (!parsed.success) {
    return { error: "Choose a valid reminder." } satisfies ActionResult;
  }

  const reminder = await prisma.reminder.findFirst({
    where: {
      id: parsed.data.reminderId,
      businessId: user.business.id
    }
  });

  if (!reminder) {
    return { error: "Reminder not found for this business." } satisfies ActionResult;
  }

  if (reminder.status === "COMPLETED") {
    return { error: "Reminder is already completed." } satisfies ActionResult;
  }

  const completed = await prisma.reminder.update({
    where: { id: reminder.id },
    data: {
      status: "COMPLETED",
      completedAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Completed follow-up reminder",
      entity: completed.title,
      metadata: {
        reminderId: completed.id,
        customerId: completed.customerId,
        inquiryId: completed.inquiryId,
        messageId: completed.messageId
      }
    }
  });

  revalidatePath("/dashboard");
  if (completed.customerId) revalidatePath(`/dashboard/customers/${completed.customerId}`);
  if (completed.inquiryId) {
    revalidatePath(`/dashboard/inquiries/${completed.inquiryId}`);
    revalidatePath(`/dashboard/communications/inquiry-${completed.inquiryId}`);
  }
  if (completed.messageId) revalidatePath("/dashboard/communications");
  return { success: "Reminder completed." } satisfies ActionResult;
}

export async function addInquiryNoteAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = noteSchema.safeParse({
    inquiryId: formString(formData, "inquiryId"),
    body: formString(formData, "body")
  });

  if (!parsed.success) {
    return { error: "Write a note before saving." } satisfies ActionResult;
  }

  const inquiry = await getScopedInquiry(parsed.data.inquiryId, user.business.id);
  if (!inquiry) {
    return { error: "Inquiry not found for this business." } satisfies ActionResult;
  }

  await prisma.inquiryNote.create({
    data: {
      businessId: user.business.id,
      inquiryId: inquiry.id,
      authorId: user.id,
      body: parsed.data.body
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Added inquiry note",
      entity: inquiry.subject,
      metadata: { inquiryId: inquiry.id }
    }
  });

  revalidatePath(`/dashboard/inquiries/${inquiry.id}`);
  revalidatePath(`/dashboard/communications/inquiry-${inquiry.id}`);
  revalidatePath("/dashboard/communications");
  revalidatePath("/dashboard");
  return { success: "Note added." } satisfies ActionResult;
}

const conversationNoteSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().min(3)
});

export async function addConversationNoteAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = conversationNoteSchema.safeParse({
    conversationId: formString(formData, "conversationId"),
    body: formString(formData, "body")
  });

  if (!parsed.success) {
    return { error: "Write a note before saving." } satisfies ActionResult;
  }

  const conversation = await prisma.conversation.findFirst({
    where: {
      id: parsed.data.conversationId,
      businessId: user.business.id
    },
    select: {
      id: true,
      subject: true,
      customerId: true
    }
  });

  if (!conversation) {
    return { error: "Conversation not found for this business." } satisfies ActionResult;
  }

  await prisma.message.create({
    data: {
      businessId: user.business.id,
      conversationId: conversation.id,
      customerId: conversation.customerId,
      channel: "INTERNAL",
      direction: "INTERNAL",
      subject: "Internal note",
      body: parsed.data.body
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Added conversation note",
      entity: conversation.subject,
      metadata: { conversationId: conversation.id }
    }
  });

  revalidatePath(`/dashboard/communications/conversation-${conversation.id}`);
  revalidatePath("/dashboard/communications");
  return { success: "Note added." } satisfies ActionResult;
}

const convertInquirySchema = z.object({
  inquiryId: z.string().min(1),
  name: z.string().min(2),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional(),
  segment: z.string().min(2),
  source: z.string().min(2)
});

export async function convertInquiryToCustomerAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = convertInquirySchema.safeParse({
    inquiryId: formString(formData, "inquiryId"),
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    phone: formString(formData, "phone"),
    segment: formString(formData, "segment"),
    source: formString(formData, "source")
  });

  if (!parsed.success) {
    return { error: "Add name, segment, source, and a valid email if provided." } satisfies ActionResult;
  }

  const inquiry = await getScopedInquiry(parsed.data.inquiryId, user.business.id);
  if (!inquiry) {
    return { error: "Inquiry not found for this business." } satisfies ActionResult;
  }

  if (inquiry.customerId) {
    return { error: "This inquiry is already connected to a customer." } satisfies ActionResult;
  }

  const customer = await prisma.customer.create({
    data: {
      businessId: user.business.id,
      name: parsed.data.name,
      email: parsed.data.email || null,
      phone: parsed.data.phone || null,
      segment: parsed.data.segment,
      source: parsed.data.source,
      tags: [parsed.data.segment.toLowerCase()],
      lastContactedAt: new Date()
    }
  });

  await prisma.inquiry.update({
    where: {
      id: inquiry.id
    },
    data: {
      customerId: customer.id,
      convertedAt: new Date(),
      status: inquiry.status === "NEW" ? "IN_PROGRESS" : inquiry.status
    }
  });

  await prisma.followUpEmail.updateMany({
    where: {
      businessId: user.business.id,
      inquiryId: inquiry.id,
      customerId: null
    },
    data: {
      customerId: customer.id
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Converted inquiry to customer",
      entity: customer.name,
      metadata: { inquiryId: inquiry.id, customerId: customer.id }
    }
  });

  revalidatePath(`/dashboard/inquiries/${inquiry.id}`);
  revalidatePath(`/dashboard/customers/${customer.id}`);
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/inquiries");
  revalidatePath("/dashboard");
  return { success: "Inquiry converted to customer." } satisfies ActionResult;
}

const followUpSchema = z.object({
  inquiryId: z.string().min(1),
  toEmail: z.string().email(),
  subject: z.string().min(3),
  body: z.string().min(12),
  template: z.string().optional(),
  intent: z.enum(["DRAFT", "SEND"])
});

export async function saveFollowUpEmailAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = followUpSchema.safeParse({
    inquiryId: formString(formData, "inquiryId"),
    toEmail: formString(formData, "toEmail"),
    subject: formString(formData, "subject"),
    body: formString(formData, "body"),
    template: formString(formData, "template"),
    intent: formString(formData, "intent")
  });

  if (!parsed.success) {
    return { error: "Add recipient email, subject, and message." } satisfies ActionResult;
  }

  const inquiry = await getScopedInquiry(parsed.data.inquiryId, user.business.id);
  if (!inquiry) {
    return { error: "Inquiry not found for this business." } satisfies ActionResult;
  }

  const isSend = parsed.data.intent === "SEND";
  if (isSend && !isEmailSendingReady(user.business)) {
    return { error: emailSetupMessage } satisfies ActionResult;
  }

  let providerResult:
    | {
        provider: "resend";
        providerMessageId: string;
        fromEmail: string;
      }
    | null = null;
  let sendError = "";

  if (isSend) {
    try {
      providerResult = await sendFollowUpEmail({
        to: parsed.data.toEmail,
        subject: parsed.data.subject,
        body: parsed.data.body,
        replyTo: user.email
      });
    } catch (error) {
      sendError = error instanceof Error ? error.message : "Email could not be sent.";
    }
  }

  const status = isSend ? (sendError ? "FAILED" : "SENT") : "DRAFT";
  const followUp = await prisma.followUpEmail.create({
    data: {
      businessId: user.business.id,
      inquiryId: inquiry.id,
      customerId: inquiry.customerId,
      createdById: user.id,
      toEmail: parsed.data.toEmail,
      fromEmail: providerResult?.fromEmail ?? getEmailFromAddress(),
      subject: parsed.data.subject,
      body: parsed.data.body,
      status,
      provider: providerResult?.provider,
      providerMessageId: providerResult?.providerMessageId,
      errorMessage: sendError || null,
      sentAt: status === "SENT" ? new Date() : null
    }
  });

  if (status === "SENT" && inquiry.customerId) {
    await prisma.customer.update({
      where: {
        id: inquiry.customerId
      },
      data: {
        lastContactedAt: new Date()
      }
    });
  }

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action:
        status === "SENT"
          ? "Sent follow-up email"
          : status === "FAILED"
            ? "Failed follow-up email"
            : "Drafted follow-up email",
      entity: inquiry.subject,
      metadata: {
        inquiryId: inquiry.id,
        followUpId: followUp.id,
        toEmail: parsed.data.toEmail,
        template: parsed.data.template || null,
        provider: providerResult?.provider ?? "resend",
        error: sendError || null
      }
    }
  });

  revalidatePath(`/dashboard/inquiries/${inquiry.id}`);
  revalidatePath(`/dashboard/communications/inquiry-${inquiry.id}`);
  if (inquiry.customerId) revalidatePath(`/dashboard/customers/${inquiry.customerId}`);
  revalidatePath("/dashboard/communications");
  revalidatePath("/dashboard");
  if (sendError) {
    return { error: sendError } satisfies ActionResult;
  }

  return { success: status === "SENT" ? "Follow-up email sent." : "Follow-up draft saved." } satisfies ActionResult;
}

const customerFollowUpSchema = z.object({
  customerId: z.string().min(1),
  toEmail: z.string().email(),
  subject: z.string().min(3),
  body: z.string().min(12),
  template: z.string().optional(),
  intent: z.enum(["DRAFT", "SEND"])
});

export async function sendCustomerFollowUpEmailAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = customerFollowUpSchema.safeParse({
    customerId: formString(formData, "customerId"),
    toEmail: formString(formData, "toEmail"),
    subject: formString(formData, "subject"),
    body: formString(formData, "body"),
    template: formString(formData, "template"),
    intent: formString(formData, "intent")
  });

  if (!parsed.success) {
    return { error: "Add recipient email, subject, and message." } satisfies ActionResult;
  }

  const customer = await getScopedCustomer(parsed.data.customerId, user.business.id);
  if (!customer) {
    return { error: "Customer not found for this business." } satisfies ActionResult;
  }

  const isSend = parsed.data.intent === "SEND";
  if (isSend && !isEmailSendingReady(user.business)) {
    return { error: emailSetupMessage } satisfies ActionResult;
  }

  let providerResult:
    | {
        provider: "resend";
        providerMessageId: string;
        fromEmail: string;
      }
    | null = null;
  let sendError = "";

  if (isSend) {
    try {
      providerResult = await sendFollowUpEmail({
        to: parsed.data.toEmail,
        subject: parsed.data.subject,
        body: parsed.data.body,
        replyTo: user.email
      });
    } catch (error) {
      sendError = error instanceof Error ? error.message : "Email could not be sent.";
    }
  }

  const status = isSend ? (sendError ? "FAILED" : "SENT") : "DRAFT";
  const followUp = await prisma.followUpEmail.create({
    data: {
      businessId: user.business.id,
      inquiryId: null,
      customerId: customer.id,
      createdById: user.id,
      toEmail: parsed.data.toEmail,
      fromEmail: providerResult?.fromEmail ?? getEmailFromAddress(),
      subject: parsed.data.subject,
      body: parsed.data.body,
      status,
      provider: providerResult?.provider,
      providerMessageId: providerResult?.providerMessageId,
      errorMessage: sendError || null,
      sentAt: status === "SENT" ? new Date() : null
    }
  });

  if (status === "SENT") {
    await prisma.customer.update({
      where: {
        id: customer.id
      },
      data: {
        lastContactedAt: new Date()
      }
    });
  }

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action:
        status === "SENT"
          ? "Sent customer follow-up email"
          : status === "FAILED"
            ? "Failed customer follow-up email"
            : "Drafted customer follow-up email",
      entity: customer.name,
      metadata: {
        customerId: customer.id,
        followUpId: followUp.id,
        toEmail: parsed.data.toEmail,
        template: parsed.data.template || null,
        provider: providerResult?.provider ?? "resend",
        error: sendError || null
      }
    }
  });

  revalidatePath(`/dashboard/customers/${customer.id}`);
  revalidatePath("/dashboard/customers");
  revalidatePath("/dashboard/communications");
  revalidatePath("/dashboard");

  if (sendError) {
    return { error: sendError } satisfies ActionResult;
  }

  return { success: status === "SENT" ? "Customer follow-up email sent." : "Customer follow-up draft saved." } satisfies ActionResult;
}

const campaignSchema = z.object({
  campaignId: z.string().optional(),
  name: z.string().min(3),
  subject: z.string().min(3),
  channel: z.enum(["EMAIL", "SMS", "EMAIL_SMS"]),
  audience: z.string().min(2),
  status: z.enum(["DRAFT", "READY", "SENT"]),
  body: z.string().min(12)
});

export async function createCampaignAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = campaignSchema.safeParse({
    campaignId: formString(formData, "campaignId"),
    name: formString(formData, "name"),
    subject: formString(formData, "subject"),
    channel: formString(formData, "channel"),
    audience: formString(formData, "audience"),
    status: formString(formData, "status") || "DRAFT",
    body: formString(formData, "body")
  });

  if (!parsed.success) {
    return { error: "Add campaign name, audience, status, subject, and message." } satisfies ActionResult;
  }

  const customers = await prisma.customer.findMany({
    where: {
      businessId: user.business.id
    }
  });
  const audienceCustomers = filterCustomersBySegment(customers, parsed.data.audience).slice(0, 24);
  const audienceLabel = getSegmentLabel(user.business.businessType.code, parsed.data.audience);

  const existingCampaign = parsed.data.campaignId
    ? await prisma.campaign.findFirst({
        where: {
          id: parsed.data.campaignId,
          businessId: user.business.id
        }
      })
    : null;

  if (parsed.data.campaignId && !existingCampaign) {
    return { error: "Campaign not found for this business." } satisfies ActionResult;
  }

  const status = parsed.data.status === "SENT" && existingCampaign?.status !== "SENT" ? "READY" : parsed.data.status;
  const campaignData = {
    name: parsed.data.name,
    subject: parsed.data.subject,
    channel: parsed.data.channel,
    audience: audienceLabel,
    body: parsed.data.body,
    status,
    sentAt: status === "SENT" ? (existingCampaign?.sentAt ?? new Date()) : null
  };

  const campaign = existingCampaign
    ? await prisma.campaign.update({
        where: {
          id: existingCampaign.id
        },
        data: campaignData
      })
    : await prisma.campaign.create({
        data: {
          businessId: user.business.id,
          ...campaignData
        }
      });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: existingCampaign ? "Updated campaign draft" : "Created campaign draft",
      entity: campaign.name,
      metadata: {
        channel: campaign.channel,
        audience: campaign.audience,
        status: campaign.status,
        estimatedAudience: audienceCustomers.length
      }
    }
  });

  revalidatePath("/dashboard/marketing");
  revalidatePath("/dashboard");
  return { success: existingCampaign ? "Campaign updated." : "Campaign draft saved." } satisfies ActionResult;
}

const sendCampaignSchema = z.object({
  campaignId: z.string().min(1)
});

export async function sendCampaignAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  const parsed = sendCampaignSchema.safeParse({
    campaignId: formString(formData, "campaignId")
  });

  if (!parsed.success) {
    return { error: "Choose a campaign to send." } satisfies ActionResult;
  }

  if (!isEmailSendingReady(user.business)) {
    return { error: emailSetupMessage } satisfies ActionResult;
  }

  if (!process.env.RESEND_API_KEY) {
    return { error: "Email provider API key is not configured. Add RESEND_API_KEY before sending campaigns." } satisfies ActionResult;
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: parsed.data.campaignId,
      businessId: user.business.id
    }
  });

  if (!campaign) {
    return { error: "Campaign not found for this business." } satisfies ActionResult;
  }

  if (!campaign.audience) {
    return { error: "Choose an audience segment before sending this campaign." } satisfies ActionResult;
  }

  if (campaign.status === "SENT") {
    return { error: "This campaign has already been sent." } satisfies ActionResult;
  }

  const segmentKey = getSegmentOptions(user.business.businessType.code).find(
    (option) => option.label === campaign.audience || option.key === campaign.audience
  )?.key;

  if (!segmentKey) {
    return { error: "This campaign needs a saved segment audience before it can be sent." } satisfies ActionResult;
  }

  const customers = await prisma.customer.findMany({
    where: {
      businessId: user.business.id,
      OR: [{ email: { not: null } }]
    }
  });
  const recipients = filterCustomersBySegment(customers, segmentKey).filter((customer) => customer.email);

  if (!recipients.length) {
    return { error: "This audience segment has no recipients with email addresses." } satisfies ActionResult;
  }

  await prisma.campaignEvent.deleteMany({
    where: {
      campaignId: campaign.id
    }
  });

  let sentCount = 0;
  let failedCount = 0;

  for (const recipient of recipients) {
    try {
      const result = await sendFollowUpEmail({
        to: recipient.email as string,
        subject: campaign.subject,
        body: campaign.body,
        replyTo: user.email
      });
      sentCount += 1;
      await prisma.campaignEvent.create({
        data: {
          campaignId: campaign.id,
          customerId: recipient.id,
          status: "SENT",
          providerId: result.providerMessageId
        }
      });
    } catch {
      failedCount += 1;
      await prisma.campaignEvent.create({
        data: {
          campaignId: campaign.id,
          customerId: recipient.id,
          status: "FAILED"
        }
      });
    }
  }

  await prisma.campaign.update({
    where: {
      id: campaign.id
    },
    data: {
      status: "SENT",
      sentAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: user.business.id,
      actor: user.name,
      action: "Sent campaign",
      entity: campaign.name,
      metadata: {
        campaignId: campaign.id,
        audience: campaign.audience,
        totalRecipients: recipients.length,
        sentCount,
        failedCount
      }
    }
  });

  revalidatePath("/dashboard/marketing");
  revalidatePath("/dashboard");
  return { success: `Campaign sent. Total recipients: ${recipients.length}. Sent: ${sentCount}. Failed: ${failedCount}.` } satisfies ActionResult;
}

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

const templateSchema = z.object({
  templateId: z.string().optional(),
  businessId: z.string().optional(),
  name: z.string().min(2),
  type: z.enum(["FOLLOW_UP", "CAMPAIGN", "ANNOUNCEMENT"]),
  businessType: z.enum(["RESTAURANT", "RETAIL", "DANCE_STUDIO", "SPORTS_CLUB"]),
  subject: z.string().min(3),
  body: z.string().min(8)
});

function canManageTemplates(actor: { role: UserRole; businessId: string | null }, businessId: string) {
  return actor.role === "ADMIN" || (actor.role === "CLIENT_OWNER" && actor.businessId === businessId);
}

export async function upsertMessageTemplateAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const actor = await requireUser();
  const formData = resolveFormData(first, second);
  const parsed = templateSchema.safeParse({
    templateId: formString(formData, "templateId"),
    businessId: actor.role === "ADMIN" ? formString(formData, "businessId") : actor.businessId ?? "",
    name: formString(formData, "name"),
    type: formString(formData, "type"),
    businessType: formString(formData, "businessType"),
    subject: formString(formData, "subject"),
    body: formString(formData, "body")
  });

  if (!parsed.success || !parsed.data.businessId) {
    return { error: "Add a name, type, business type, subject, and message." } satisfies ActionResult;
  }

  if (!canManageTemplates(actor, parsed.data.businessId)) {
    return { error: "You do not have permission to manage templates for this business." } satisfies ActionResult;
  }

  const business = await prisma.business.findUnique({
    where: { id: parsed.data.businessId },
    select: { id: true, name: true }
  });

  if (!business) {
    return { error: "Business was not found." } satisfies ActionResult;
  }

  if (parsed.data.templateId) {
    const existing = await prisma.messageTemplate.findFirst({
      where: {
        id: parsed.data.templateId,
        businessId: business.id
      }
    });

    if (!existing) {
      return { error: "Template was not found for this business." } satisfies ActionResult;
    }

    await prisma.messageTemplate.update({
      where: { id: existing.id },
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        businessType: parsed.data.businessType,
        subject: parsed.data.subject,
        body: parsed.data.body
      }
    });
  } else {
    await prisma.messageTemplate.create({
      data: {
        businessId: business.id,
        name: parsed.data.name,
        type: parsed.data.type,
        businessType: parsed.data.businessType,
        subject: parsed.data.subject,
        body: parsed.data.body
      }
    });
  }

  await prisma.activityLog.create({
    data: {
      businessId: business.id,
      actor: actor.name,
      action: parsed.data.templateId ? "Updated message template" : "Created message template",
      entity: parsed.data.name,
      metadata: {
        type: parsed.data.type,
        businessType: parsed.data.businessType
      }
    }
  });

  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard/marketing");
  revalidatePath("/dashboard/inquiries");
  revalidatePath("/dashboard/customers");
  if (actor.role === "ADMIN") revalidatePath(`/admin/clients/${business.id}`);
  return { success: parsed.data.templateId ? "Template updated." : "Template created." } satisfies ActionResult;
}

const deleteTemplateSchema = z.object({
  templateId: z.string().min(1),
  businessId: z.string().optional()
});

export async function deleteMessageTemplateAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const actor = await requireUser();
  const formData = resolveFormData(first, second);
  const parsed = deleteTemplateSchema.safeParse({
    templateId: formString(formData, "templateId"),
    businessId: actor.role === "ADMIN" ? formString(formData, "businessId") : actor.businessId ?? ""
  });

  if (!parsed.success || !parsed.data.businessId) {
    return { error: "Choose a template to delete." } satisfies ActionResult;
  }

  if (!canManageTemplates(actor, parsed.data.businessId)) {
    return { error: "You do not have permission to delete templates for this business." } satisfies ActionResult;
  }

  const template = await prisma.messageTemplate.findFirst({
    where: {
      id: parsed.data.templateId,
      businessId: parsed.data.businessId
    }
  });

  if (!template) {
    return { error: "Template was not found for this business." } satisfies ActionResult;
  }

  await prisma.messageTemplate.delete({
    where: { id: template.id }
  });

  await prisma.activityLog.create({
    data: {
      businessId: template.businessId,
      actor: actor.name,
      action: "Deleted message template",
      entity: template.name,
      metadata: {
        type: template.type
      }
    }
  });

  revalidatePath("/dashboard/templates");
  revalidatePath("/dashboard/marketing");
  if (actor.role === "ADMIN") revalidatePath(`/admin/clients/${template.businessId}`);
  return { success: "Template deleted." } satisfies ActionResult;
}

const inviteUserSchema = z.object({
  email: z.string().email(),
  role: z.enum(["CLIENT_OWNER", "STAFF"]),
  businessId: z.string().optional()
});

function canManageBusinessUsers(actor: { role: UserRole; businessId: string | null }, businessId: string, invitedRole?: UserRole) {
  if (actor.role === "ADMIN") return true;
  if (actor.role === "CLIENT_OWNER" && actor.businessId === businessId) {
    return !invitedRole || invitedRole === "STAFF";
  }
  return false;
}

export async function inviteUserAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const actor = await requireUser();
  const formData = resolveFormData(first, second);
  const parsed = inviteUserSchema.safeParse({
    email: formString(formData, "email").toLowerCase(),
    role: formString(formData, "role"),
    businessId: actor.role === "ADMIN" ? formString(formData, "businessId") : actor.businessId ?? undefined
  });

  if (!parsed.success || !parsed.data.businessId) {
    return { error: "Add a valid email, role, and business." } satisfies ActionResult;
  }

  if (!canManageBusinessUsers(actor, parsed.data.businessId, parsed.data.role)) {
    return { error: "You do not have permission to invite users for this business." } satisfies ActionResult;
  }

  const business = await prisma.business.findUnique({
    where: { id: parsed.data.businessId },
    select: { id: true, name: true }
  });

  if (!business) {
    return { error: "Business account was not found." } satisfies ActionResult;
  }

  const [existingUser, existingInvite] = await Promise.all([
    prisma.user.findUnique({ where: { email: parsed.data.email } }),
    prisma.userInvite.findFirst({
      where: {
        businessId: business.id,
        email: parsed.data.email,
        status: "PENDING"
      }
    })
  ]);

  if (existingUser?.businessId === business.id && existingUser.isActive) {
    return { error: "That user already has access to this business." } satisfies ActionResult;
  }

  if (existingUser?.businessId && existingUser.businessId !== business.id) {
    return { error: "That email is already assigned to another business." } satisfies ActionResult;
  }

  if (existingInvite) {
    return { error: "That email already has a pending invite for this business." } satisfies ActionResult;
  }

  await prisma.userInvite.create({
    data: {
      businessId: business.id,
      email: parsed.data.email,
      role: parsed.data.role,
      invitedById: actor.id,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14)
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: business.id,
      actor: actor.name,
      action: "Invited user",
      entity: parsed.data.email,
      metadata: {
        role: parsed.data.role
      }
    }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${business.id}`);
  return { success: `Invite created for ${parsed.data.email}.` } satisfies ActionResult;
}

export async function revokeInviteAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const actor = await requireUser();
  const formData = resolveFormData(first, second);
  const inviteId = formString(formData, "inviteId");
  const invite = await prisma.userInvite.findUnique({
    where: { id: inviteId },
    include: {
      business: {
        select: { id: true, name: true }
      }
    }
  });

  if (!invite) {
    return { error: "Invite was not found." } satisfies ActionResult;
  }

  if (!canManageBusinessUsers(actor, invite.businessId, invite.role)) {
    return { error: "You do not have permission to revoke this invite." } satisfies ActionResult;
  }

  if (invite.status !== "PENDING") {
    return { error: "Only pending invites can be revoked." } satisfies ActionResult;
  }

  await prisma.userInvite.update({
    where: { id: invite.id },
    data: {
      status: "EXPIRED",
      expiresAt: new Date()
    }
  });

  await prisma.activityLog.create({
    data: {
      businessId: invite.businessId,
      actor: actor.name,
      action: "Revoked invite",
      entity: invite.email,
      metadata: {
        role: invite.role
      }
    }
  });

  revalidatePath("/dashboard/settings");
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${invite.businessId}`);
  return { success: `Invite revoked for ${invite.email}.` } satisfies ActionResult;
}

export async function deactivateStaffUserAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const actor = await requireUser();
  const formData = resolveFormData(first, second);
  const userId = formString(formData, "userId");
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      businessId: true,
      isActive: true
    }
  });

  if (!target || !target.businessId) {
    return { error: "Staff user was not found." } satisfies ActionResult;
  }

  if (target.id === actor.id || target.role !== "STAFF") {
    return { error: "Only staff users can be deactivated here." } satisfies ActionResult;
  }

  if (!canManageBusinessUsers(actor, target.businessId, "STAFF")) {
    return { error: "You do not have permission to deactivate this staff user." } satisfies ActionResult;
  }

  if (!target.isActive) {
    return { error: "That staff user is already inactive." } satisfies ActionResult;
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: target.id },
      data: { isActive: false }
    }),
    prisma.session.deleteMany({
      where: { userId: target.id }
    }),
    prisma.activityLog.create({
      data: {
        businessId: target.businessId,
        actor: actor.name,
        action: "Deactivated staff user",
        entity: target.email,
        metadata: {
          userId: target.id
        }
      }
    })
  ]);

  revalidatePath("/dashboard/settings");
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${target.businessId}`);
  return { success: `${target.name} has been deactivated.` } satisfies ActionResult;
}

const adminClientSchema = z.object({
  businessId: z.string().min(1),
  name: z.string().min(2),
  businessTypeId: z.string().min(1),
  contactEmail: z.string().email().optional().or(z.literal("")),
  brandPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  subscriptionStatus: z.enum(["TRIALING", "ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED", "UNPAID", "INACTIVE"])
});

const createOrganizationSchema = z.object({
  name: z.string().min(2).max(120),
  slug: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase letters, numbers, and hyphens only."),
  businessTypeId: z.string().min(1),
  website: z.string().url().optional().or(z.literal("")),
  contactEmail: z.string().email(),
  phone: z.string().max(40).optional().or(z.literal("")),
  address: z.string().min(2).max(160),
  city: z.string().min(2).max(80),
  state: z.string().min(2).max(80),
  zip: z.string().min(3).max(20),
  timezone: z.string().min(3).max(80),
  brandPrimary: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  firstName: z.string().min(1).max(80),
  lastName: z.string().min(1).max(80),
  adminEmail: z.string().email(),
  initialPassword: z.string().min(12).max(128)
});
const launchStatusValues = ["NOT_STARTED", "IN_PROGRESS", "READY_FOR_PILOT", "LIVE"] as const;
const launchReadinessSchema = z.object({
  businessId: z.string().min(1),
  launchStatus: z.enum(launchStatusValues),
  launchNotes: z.string().max(2000).optional()
});
const demoCleanupSchema = z.object({
  businessId: z.string().min(1),
  confirm: z.string()
});
const feedbackTypeValues = ["BUG", "CONFUSING", "FEATURE_REQUEST", "GENERAL"] as const;
const feedbackPriorityValues = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;
const feedbackStatusValues = ["NEW", "REVIEWING", "PLANNED", "RESOLVED", "CLOSED"] as const;
const pilotFeedbackSchema = z.object({
  type: z.enum(feedbackTypeValues),
  area: z.string().min(2).max(120),
  message: z.string().min(10).max(2000),
  priority: z.enum(feedbackPriorityValues)
});
const adminFeedbackSchema = z.object({
  feedbackId: z.string().min(1),
  status: z.enum(feedbackStatusValues),
  adminNotes: z.string().max(2000).optional()
});

function launchChecklistWithDemoCleanup(value: unknown) {
  const current =
    value && typeof value === "object" && !Array.isArray(value) && "items" in value && typeof (value as { items?: unknown }).items === "object" && !Array.isArray((value as { items?: unknown }).items)
      ? (value as { items: Record<string, unknown> }).items
      : {};

  return {
    items: Object.fromEntries(launchReadinessItems.map((item) => [item.key, item.key === "demoDataRemoved" ? true : Boolean(current[item.key])]))
  };
}

export async function createOrganizationAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const admin = await requireAdmin();
  const formData = resolveFormData(first, second);
  const parsed = createOrganizationSchema.safeParse({
    name: formString(formData, "name"),
    slug: formString(formData, "slug"),
    businessTypeId: formString(formData, "businessTypeId"),
    website: formString(formData, "website"),
    contactEmail: formString(formData, "contactEmail"),
    phone: formString(formData, "phone"),
    address: formString(formData, "address"),
    city: formString(formData, "city"),
    state: formString(formData, "state"),
    zip: formString(formData, "zip"),
    timezone: formString(formData, "timezone") || "America/New_York",
    brandPrimary: formString(formData, "brandPrimary") || "#241915",
    firstName: formString(formData, "firstName"),
    lastName: formString(formData, "lastName"),
    adminEmail: formString(formData, "adminEmail").toLowerCase(),
    initialPassword: formString(formData, "initialPassword")
  });

  if (!parsed.success) {
    return { error: "Complete the organization, primary contact, and client owner details with a 12-character password." } satisfies ActionResult;
  }

  await ensureSupportedBusinessTypes(prisma);

  const [businessType, existingBusiness, existingUser] = await Promise.all([
    prisma.businessType.findUnique({ where: { id: parsed.data.businessTypeId } }),
    prisma.business.findUnique({ where: { slug: parsed.data.slug } }),
    prisma.user.findUnique({ where: { email: parsed.data.adminEmail }, select: { id: true } })
  ]);

  if (!businessType) {
    return { error: "Choose a valid business type." } satisfies ActionResult;
  }

  if (existingUser) {
    return { error: "A Mayke Motion user already uses that client owner email." } satisfies ActionResult;
  }

  if (existingBusiness) {
    return { error: "That workspace slug is already in use." } satisfies ActionResult;
  }

  const passwordHash = await bcrypt.hash(parsed.data.initialPassword, 12);
  let businessId = "";

  try {
    const business = await prisma.$transaction(async (tx) => {
      const created = await tx.business.create({
        data: {
          name: parsed.data.name,
          slug: parsed.data.slug,
          description: `${parsed.data.name} workspace managed by Mayke Agency.`,
          website: parsed.data.website || null,
          contactEmail: parsed.data.contactEmail,
          phone: parsed.data.phone || null,
          address: `${parsed.data.address}, ${parsed.data.city}, ${parsed.data.state} ${parsed.data.zip}`,
          timezone: parsed.data.timezone,
          brandPrimary: parsed.data.brandPrimary,
          brandAccent: "#733038",
          businessTypeId: businessType.id
        }
      });

      await tx.user.create({
        data: {
          email: parsed.data.adminEmail,
          name: `${parsed.data.firstName} ${parsed.data.lastName}`,
          passwordHash,
          role: "CLIENT_OWNER",
          title: "Owner",
          businessId: created.id,
          sportsRole: businessType.code === "SPORTS_CLUB" ? "CLUB_OWNER" : null
        }
      });

      await provisionWorkspaceDefaults({
        actor: admin.name,
        businessId: created.id,
        businessName: created.name,
        businessType: businessType.code,
        prisma: tx
      });

      await tx.activityLog.create({
        data: {
          businessId: created.id,
          actor: admin.name,
          action: "Created client workspace",
          entity: created.name,
          metadata: { businessType: businessType.code, primaryContact: parsed.data.contactEmail }
        }
      });

      return created;
    });
    businessId = business.id;
  } catch {
    return { error: "The workspace could not be created. Confirm the organization slug and owner email are unique." } satisfies ActionResult;
  }

  revalidatePath("/admin");
  redirect(`/admin/clients/${businessId}`);
}

export async function updateAdminClientAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const admin = await requireAdmin();
  const formData = resolveFormData(first, second);
  const parsed = adminClientSchema.safeParse({
    businessId: formString(formData, "businessId"),
    name: formString(formData, "name"),
    businessTypeId: formString(formData, "businessTypeId"),
    contactEmail: formString(formData, "contactEmail"),
    brandPrimary: formString(formData, "brandPrimary"),
    subscriptionStatus: formString(formData, "subscriptionStatus")
  });

  if (!parsed.success) {
    return { error: "Add a business name, business type, valid brand color, and account status." } satisfies ActionResult;
  }

  const business = await prisma.business.findUnique({
    where: {
      id: parsed.data.businessId
    }
  });

  if (!business) {
    return { error: "Client business was not found." } satisfies ActionResult;
  }

  const businessType = await prisma.businessType.findUnique({
    where: {
      id: parsed.data.businessTypeId
    }
  });

  if (!businessType) {
    return { error: "Choose a valid business type." } satisfies ActionResult;
  }

  const selectedModules = new Set(formData.getAll("modules").filter((value): value is ModuleKey => typeof value === "string" && value in moduleLabels));
  const moduleKeys = Object.keys(moduleLabels) as ModuleKey[];

  await prisma.business.update({
    where: {
      id: business.id
    },
    data: {
      name: parsed.data.name,
      businessTypeId: parsed.data.businessTypeId,
      contactEmail: parsed.data.contactEmail || null,
      brandPrimary: parsed.data.brandPrimary,
      subscriptionStatus: parsed.data.subscriptionStatus
    }
  });

  await Promise.all(
    moduleKeys.map((key) =>
      prisma.module.upsert({
        where: {
          businessId_key: {
            businessId: business.id,
            key
          }
        },
        update: {
          enabled: selectedModules.has(key),
          label: moduleLabels[key].label,
          description: moduleLabels[key].description
        },
        create: {
          businessId: business.id,
          key,
          enabled: selectedModules.has(key),
          label: moduleLabels[key].label,
          description: moduleLabels[key].description
        }
      })
    )
  );

  await prisma.activityLog.create({
    data: {
      businessId: business.id,
      actor: admin.name,
      action: "Updated client settings",
      entity: parsed.data.name,
      metadata: {
        businessType: businessType.code,
        enabledModules: Array.from(selectedModules),
        subscriptionStatus: parsed.data.subscriptionStatus
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${business.id}`);
  return { success: "Client settings updated." } satisfies ActionResult;
}

export async function updateLaunchReadinessAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const admin = await requireAdmin();
  const formData = resolveFormData(first, second);
  const parsed = launchReadinessSchema.safeParse({
    businessId: formString(formData, "businessId"),
    launchStatus: formString(formData, "launchStatus"),
    launchNotes: formString(formData, "launchNotes")
  });

  if (!parsed.success) {
    return { error: "Choose a launch status and keep notes under 2,000 characters." } satisfies ActionResult;
  }

  const business = await prisma.business.findUnique({
    where: { id: parsed.data.businessId },
    select: { id: true, name: true }
  });

  if (!business) {
    return { error: "Client business was not found." } satisfies ActionResult;
  }

  const checked = new Set(formData.getAll("launchItem").filter((value): value is string => typeof value === "string"));
  const items = Object.fromEntries(launchReadinessItems.map((item) => [item.key, checked.has(item.key)]));

  await prisma.$transaction([
    prisma.business.update({
      where: { id: business.id },
      data: {
        launchStatus: parsed.data.launchStatus,
        launchChecklist: { items },
        launchNotes: parsed.data.launchNotes || null
      }
    }),
    prisma.activityLog.create({
      data: {
        businessId: business.id,
        actor: admin.name,
        action: "Updated launch readiness",
        entity: business.name,
        metadata: {
          launchStatus: parsed.data.launchStatus,
          checkedItems: Object.entries(items)
            .filter(([, complete]) => complete)
            .map(([key]) => key)
        }
      }
    })
  ]);

  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${business.id}`);
  return { success: "Launch readiness saved." } satisfies ActionResult;
}

export async function removeDemoDataAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const admin = await requireAdmin();
  const formData = resolveFormData(first, second);
  const parsed = demoCleanupSchema.safeParse({
    businessId: formString(formData, "businessId"),
    confirm: formString(formData, "confirm")
  });

  if (!parsed.success || parsed.data.confirm !== "REMOVE DEMO DATA") {
    return { error: "Type REMOVE DEMO DATA to confirm cleanup." } satisfies ActionResult;
  }

  const business = await prisma.business.findUnique({
    where: { id: parsed.data.businessId },
    select: { id: true, name: true, launchChecklist: true }
  });

  if (!business) {
    return { error: "Client business was not found." } satisfies ActionResult;
  }

  const deleted = await prisma.$transaction(async (tx) => {
    const payments = await tx.paymentRecord.deleteMany({ where: demoPaymentWhere(business.id) });
    const registrations = await tx.registrationSubmission.deleteMany({ where: demoRegistrationWhere(business.id) });
    const campaigns = await tx.campaign.deleteMany({ where: demoCampaignWhere(business.id) });
    const inquiries = await tx.inquiry.deleteMany({ where: demoInquiryWhere(business.id) });
    const contacts = await tx.customer.deleteMany({ where: demoCustomerWhere(business.id) });
    const activityLogs = await tx.activityLog.deleteMany({ where: demoActivityLogWhere(business.id) });
    const summary = {
      contacts: contacts.count,
      inquiries: inquiries.count,
      campaigns: campaigns.count,
      registrations: registrations.count,
      payments: payments.count,
      activityLogs: activityLogs.count
    };

    await tx.business.update({
      where: { id: business.id },
      data: {
        launchChecklist: launchChecklistWithDemoCleanup(business.launchChecklist)
      }
    });

    await tx.activityLog.create({
      data: {
        businessId: business.id,
        actor: admin.name,
        action: "Removed demo data",
        entity: business.name,
        metadata: summary
      }
    });

    return summary;
  });

  const total = deleted.contacts + deleted.inquiries + deleted.campaigns + deleted.registrations + deleted.payments + deleted.activityLogs;
  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${business.id}`);
  return { success: `Demo cleanup complete. Removed ${total} marked record${total === 1 ? "" : "s"}.` } satisfies ActionResult;
}

export async function submitPilotFeedbackAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);

  if (!["READY_FOR_PILOT", "LIVE"].includes(user.business.launchStatus)) {
    return { error: "Feedback is only open for pilot or live workspaces." } satisfies ActionResult;
  }

  const parsed = pilotFeedbackSchema.safeParse({
    type: formString(formData, "type"),
    area: formString(formData, "area"),
    message: formString(formData, "message"),
    priority: formString(formData, "priority")
  });

  if (!parsed.success) {
    return { error: "Choose a type and priority, then add the page or area and a clear message." } satisfies ActionResult;
  }

  await prisma.$transaction([
    prisma.pilotFeedback.create({
      data: {
        businessId: user.business.id,
        submittedById: user.id,
        type: parsed.data.type,
        area: parsed.data.area,
        message: parsed.data.message,
        priority: parsed.data.priority
      }
    }),
    prisma.activityLog.create({
      data: {
        businessId: user.business.id,
        actor: user.name,
        action: "Submitted pilot feedback",
        entity: parsed.data.area,
        metadata: {
          type: parsed.data.type,
          priority: parsed.data.priority
        }
      }
    })
  ]);

  revalidatePath("/dashboard/feedback");
  revalidatePath("/admin/feedback");
  return { success: "Feedback sent to Mayke. Thank you." } satisfies ActionResult;
}

export async function updatePilotFeedbackAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const admin = await requireAdmin();
  const formData = resolveFormData(first, second);
  const parsed = adminFeedbackSchema.safeParse({
    feedbackId: formString(formData, "feedbackId"),
    status: formString(formData, "status"),
    adminNotes: formString(formData, "adminNotes")
  });

  if (!parsed.success) {
    return { error: "Choose a valid status and keep notes under 2,000 characters." } satisfies ActionResult;
  }

  const feedback = await prisma.pilotFeedback.findUnique({
    where: { id: parsed.data.feedbackId },
    include: { business: { select: { id: true, name: true } } }
  });

  if (!feedback) {
    return { error: "Feedback item was not found." } satisfies ActionResult;
  }

  await prisma.$transaction([
    prisma.pilotFeedback.update({
      where: { id: feedback.id },
      data: {
        status: parsed.data.status,
        adminNotes: parsed.data.adminNotes || null
      }
    }),
    prisma.activityLog.create({
      data: {
        businessId: feedback.businessId,
        actor: admin.name,
        action: "Updated pilot feedback",
        entity: feedback.area,
        metadata: {
          status: parsed.data.status,
          feedbackId: feedback.id
        }
      }
    })
  ]);

  revalidatePath("/admin/feedback");
  revalidatePath(`/admin/clients/${feedback.business.id}`);
  return { success: "Feedback updated." } satisfies ActionResult;
}

const catalogSchema = z.object({
  name: z.string().min(2),
  description: z.string().min(8),
  category: z.string().min(2),
  price: z.coerce.number().positive()
});

export async function createProductAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  if (user.business.businessType.code !== "RETAIL") {
    return { error: "Product actions are only available for retail businesses." } satisfies ActionResult;
  }

  const parsed = catalogSchema.extend({ inventory: z.coerce.number().int().min(0) }).safeParse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    category: formString(formData, "category"),
    price: formString(formData, "price"),
    inventory: formString(formData, "inventory")
  });

  if (!parsed.success) {
    return { error: "Add name, description, category, positive price, and inventory." } satisfies ActionResult;
  }

  await prisma.product.create({
    data: {
      businessId: user.business.id,
      ...parsed.data
    }
  });

  revalidatePath("/dashboard/products");
  return { success: "Product created." } satisfies ActionResult;
}

export async function createMenuItemAction(first: FormData | ActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);
  if (user.business.businessType.code !== "RESTAURANT") {
    return { error: "Menu actions are only available for restaurant businesses." } satisfies ActionResult;
  }

  const parsed = catalogSchema.safeParse({
    name: formString(formData, "name"),
    description: formString(formData, "description"),
    category: formString(formData, "category"),
    price: formString(formData, "price")
  });

  if (!parsed.success) {
    return { error: "Add name, description, category, and a positive price." } satisfies ActionResult;
  }

  await prisma.menuItem.create({
    data: {
      businessId: user.business.id,
      ...parsed.data,
      popularityScore: 72
    }
  });

  revalidatePath("/dashboard/menu");
  return { success: "Menu item created." } satisfies ActionResult;
}
