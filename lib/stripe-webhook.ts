import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import type { RegistrationPaymentStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type StripeEvent = {
  id: string;
  type: string;
  data: {
    object: StripeObject;
  };
};

type StripeObject = {
  id: string;
  amount_total?: number;
  amount_received?: number;
  metadata?: Record<string, string | undefined>;
  payment_intent?: string | null;
};

type PaymentUpdateInput = {
  actor: string;
  amountCents?: number;
  businessId?: string;
  note: string;
  paymentIntentId?: string;
  registrationId?: string;
  sessionId?: string;
  status: RegistrationPaymentStatus;
};

type SportsInvoicePaymentInput = {
  actor: string;
  amountCents?: number;
  businessId?: string;
  invoiceId?: string;
  note: string;
  paymentIntentId?: string;
  sessionId?: string;
  status: "PAID" | "PENDING" | "PAST_DUE";
};

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifyStripeWebhookPayload(payload: string, signatureHeader: string | null) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) throw new Error("Stripe webhook secret is not configured.");
  if (!signatureHeader) throw new Error("Missing Stripe signature header.");

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signatures = signatureHeader
    .split(",")
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));

  if (!timestamp || !signatures.length) throw new Error("Invalid Stripe signature header.");

  const expected = createHmac("sha256", secret).update(`${timestamp}.${payload}`).digest("hex");
  if (!signatures.some((signature) => safeEqual(signature, expected))) {
    throw new Error("Stripe webhook signature verification failed.");
  }

  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) {
    throw new Error("Stripe webhook timestamp is outside the allowed tolerance.");
  }

  return JSON.parse(payload) as StripeEvent;
}

async function findRegistration(input: PaymentUpdateInput) {
  if (input.registrationId && input.businessId) {
    return prisma.registrationSubmission.findFirst({
      where: {
        id: input.registrationId,
        businessId: input.businessId
      },
      include: {
        form: true,
        familyProfile: { include: { students: { orderBy: [{ createdAt: "desc" }] } } },
        classEnrollment: true
      }
    });
  }

  if (input.registrationId) {
    return prisma.registrationSubmission.findUnique({
      where: { id: input.registrationId },
      include: {
        form: true,
        familyProfile: { include: { students: { orderBy: [{ createdAt: "desc" }] } } },
        classEnrollment: true
      }
    });
  }

  if (input.sessionId) {
    return prisma.registrationSubmission.findFirst({
      where: { stripeSessionId: input.sessionId },
      include: {
        form: true,
        familyProfile: { include: { students: { orderBy: [{ createdAt: "desc" }] } } },
        classEnrollment: true
      }
    });
  }

  if (input.paymentIntentId) {
    return prisma.registrationSubmission.findFirst({
      where: { stripePaymentIntentId: input.paymentIntentId },
      include: {
        form: true,
        familyProfile: { include: { students: { orderBy: [{ createdAt: "desc" }] } } },
        classEnrollment: true
      }
    });
  }

  return null;
}

async function updateRegistrationPayment(input: PaymentUpdateInput) {
  const registration = await findRegistration(input);
  if (!registration) return null;
  if (input.businessId && registration.businessId !== input.businessId) return null;

  const student =
    registration.familyProfile?.students.find((item) => item.firstName === registration.studentFirstName && item.lastName === registration.studentLastName) ??
    registration.familyProfile?.students[0];
  const amount = input.amountCents !== undefined ? input.amountCents / 100 : Number(registration.form.fee);

  await prisma.$transaction([
    prisma.registrationSubmission.update({
      where: { id: registration.id },
      data: {
        paymentStatus: input.status,
        stripeSessionId: input.sessionId ?? registration.stripeSessionId,
        stripePaymentIntentId: input.paymentIntentId ?? registration.stripePaymentIntentId
      }
    }),
    prisma.paymentRecord.create({
      data: {
        businessId: registration.businessId,
        registrationId: registration.id,
        familyProfileId: registration.familyProfileId,
        studentProfileId: student?.id,
        classId: registration.classId,
        classEnrollmentId: registration.classEnrollment?.id,
        amount,
        status: input.status,
        source: "stripe",
        note: input.note
      }
    }),
    prisma.activityLog.create({
      data: {
        businessId: registration.businessId,
        actor: input.actor,
        action: "Updated payment from Stripe webhook",
        entity: `${registration.studentFirstName} ${registration.studentLastName}`,
        metadata: {
          registrationId: registration.id,
          from: registration.paymentStatus,
          to: input.status,
          sessionId: input.sessionId ?? null,
          paymentIntentId: input.paymentIntentId ?? null
        }
      }
    })
  ]);

  return registration.businessId;
}

async function updateSportsInvoicePayment(input: SportsInvoicePaymentInput) {
  const invoice = input.invoiceId
    ? await prisma.sportsInvoice.findFirst({ where: { id: input.invoiceId, ...(input.businessId ? { businessId: input.businessId } : {}) }, include: { family: true, player: true } })
    : input.sessionId
      ? await prisma.sportsInvoice.findFirst({ where: { stripeCheckoutId: input.sessionId }, include: { family: true, player: true } })
      : input.paymentIntentId
        ? await prisma.sportsInvoice.findFirst({ where: { stripePaymentIntentId: input.paymentIntentId }, include: { family: true, player: true } })
        : null;
  if (!invoice) return null;
  const amount = input.amountCents !== undefined ? input.amountCents / 100 : Number(invoice.amount);
  await prisma.$transaction([
    prisma.sportsInvoice.update({ where: { id: invoice.id }, data: { status: input.status, stripeCheckoutId: input.sessionId ?? invoice.stripeCheckoutId, stripePaymentIntentId: input.paymentIntentId ?? invoice.stripePaymentIntentId } }),
    prisma.sportsFamily.update({ where: { id: invoice.familyId }, data: { paymentStatus: input.status === "PAID" ? "PAID" : "OPEN" } }),
    prisma.activityLog.create({ data: { businessId: invoice.businessId, actor: input.actor, action: "Updated club invoice from Stripe webhook", entity: invoice.invoiceNumber, metadata: { invoiceId: invoice.id, amount, status: input.status, note: input.note } } })
  ]);
  return invoice.businessId;
}

export async function processStripeWebhookEvent(event: StripeEvent) {
  const existing = await prisma.stripeWebhookEvent.findUnique({
    where: { stripeEventId: event.id }
  });
  if (existing) return { duplicate: true, businessId: existing.businessId };

  let businessId: string | null = null;
  const object = event.data.object;
  const metadata = object.metadata ?? {};

  if (event.type === "checkout.session.completed") {
    businessId =
      (await updateRegistrationPayment({
        actor: "Stripe webhook",
        amountCents: object.amount_total,
        businessId: metadata.businessId,
        note: `Stripe checkout.session.completed · ${event.id}`,
        paymentIntentId: typeof object.payment_intent === "string" ? object.payment_intent : undefined,
        registrationId: metadata.registrationId,
        sessionId: object.id,
        status: "PAID"
      })) ??
      (await updateSportsInvoicePayment({ actor: "Stripe webhook", amountCents: object.amount_total, businessId: metadata.businessId, invoiceId: metadata.sportsInvoiceId, sessionId: object.id, paymentIntentId: typeof object.payment_intent === "string" ? object.payment_intent : undefined, status: "PAID", note: `Stripe checkout.session.completed · ${event.id}` })) ?? null;
  }

  if (event.type === "payment_intent.succeeded") {
    businessId =
      (await updateRegistrationPayment({
        actor: "Stripe webhook",
        amountCents: object.amount_received,
        businessId: metadata.businessId,
        note: `Stripe payment_intent.succeeded · ${event.id}`,
        paymentIntentId: object.id,
        registrationId: metadata.registrationId,
        status: "PAID"
      })) ??
      (await updateSportsInvoicePayment({ actor: "Stripe webhook", amountCents: object.amount_received, businessId: metadata.businessId, invoiceId: metadata.sportsInvoiceId, paymentIntentId: object.id, status: "PAID", note: `Stripe payment_intent.succeeded · ${event.id}` })) ?? null;
  }

  if (event.type === "payment_intent.payment_failed") {
    businessId =
      (await updateRegistrationPayment({
        actor: "Stripe webhook",
        amountCents: object.amount_received,
        businessId: metadata.businessId,
        note: `Stripe payment_intent.payment_failed · ${event.id}`,
        paymentIntentId: object.id,
        registrationId: metadata.registrationId,
        status: "FAILED"
      })) ??
      (await updateSportsInvoicePayment({ actor: "Stripe webhook", amountCents: object.amount_received, businessId: metadata.businessId, invoiceId: metadata.sportsInvoiceId, paymentIntentId: object.id, status: "PAST_DUE", note: `Stripe payment_intent.payment_failed · ${event.id}` })) ?? null;
  }

  await prisma.stripeWebhookEvent.create({
    data: {
      stripeEventId: event.id,
      type: event.type,
      businessId
    }
  });

  return { duplicate: false, businessId };
}
