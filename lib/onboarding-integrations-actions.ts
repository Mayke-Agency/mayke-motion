"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/lib/actions";
import { requireBusinessUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStripeConnectAccountLink, createStripeExpressAccount, retrieveStripeAccount } from "@/lib/stripe";

type SetupActionResult = ActionResult;

function formString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function resolveFormData(first: FormData | SetupActionResult | null | undefined, second?: FormData) {
  if (second) return second;
  if (first instanceof FormData) return first;
  throw new Error("Missing form data.");
}

function requireOwnerOrAdmin(user: Awaited<ReturnType<typeof requireBusinessUser>>) {
  return user.role === "CLIENT_OWNER" || user.role === "ADMIN";
}

async function upsertIntegration(businessId: string, provider: "STRIPE" | "RESEND", data: { status: "CONNECTED" | "NEEDS_ATTENTION" | "DISCONNECTED" | "MOCK"; displayName: string; accountLabel?: string | null; config?: object }) {
  await prisma.integration.upsert({
    where: {
      businessId_provider: {
        businessId,
        provider
      }
    },
    create: {
      businessId,
      provider,
      status: data.status,
      displayName: data.displayName,
      accountLabel: data.accountLabel,
      config: data.config
    },
    update: {
      status: data.status,
      displayName: data.displayName,
      accountLabel: data.accountLabel,
      config: data.config,
      lastSyncedAt: new Date()
    }
  });
}

export async function startStripeConnectOnboardingAction(_first?: FormData | SetupActionResult | null, _second?: FormData) {
  const user = await requireBusinessUser();

  if (!requireOwnerOrAdmin(user)) {
    return { error: "Only client owners can connect Stripe." } satisfies SetupActionResult;
  }

  let accountId = user.business.stripeAccountId;
  let onboardingUrl = "";

  try {
    if (!accountId) {
      const account = await createStripeExpressAccount({
        businessId: user.business.id,
        businessName: user.business.name,
        email: user.business.contactEmail ?? user.email
      });
      accountId = account.id;
      await prisma.business.update({
        where: { id: user.business.id },
        data: {
          stripeAccountId: account.id,
          stripeOnboardingStatus: "created",
          stripeChargesEnabled: Boolean(account.charges_enabled),
          stripePayoutsEnabled: Boolean(account.payouts_enabled)
        }
      });
    }

    const link = await createStripeConnectAccountLink({ accountId });
    await upsertIntegration(user.business.id, "STRIPE", {
      status: "NEEDS_ATTENTION",
      displayName: "Stripe Connect",
      accountLabel: accountId,
      config: { onboardingStatus: "link_created", chargesEnabled: false, payoutsEnabled: false }
    });

    if (!link.url) return { error: "Stripe did not return an onboarding URL." } satisfies SetupActionResult;
    onboardingUrl = link.url;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stripe Connect onboarding could not be started." } satisfies SetupActionResult;
  }

  redirect(onboardingUrl);
}

export async function refreshStripeConnectStatusAction() {
  const user = await requireBusinessUser();

  if (!requireOwnerOrAdmin(user)) {
    return { error: "Only client owners can refresh Stripe status." } satisfies SetupActionResult;
  }

  if (!user.business.stripeAccountId) {
    await prisma.business.update({
      where: { id: user.business.id },
      data: { stripeOnboardingStatus: "not_started" }
    });
    return { error: "Stripe Connect has not been started yet." } satisfies SetupActionResult;
  }

  try {
    const account = await retrieveStripeAccount(user.business.stripeAccountId);
    const connected = Boolean(account.charges_enabled && account.payouts_enabled);
    await prisma.business.update({
      where: { id: user.business.id },
      data: {
        stripeOnboardingStatus: connected ? "complete" : account.details_submitted ? "submitted" : "pending",
        stripeChargesEnabled: Boolean(account.charges_enabled),
        stripePayoutsEnabled: Boolean(account.payouts_enabled)
      }
    });
    await upsertIntegration(user.business.id, "STRIPE", {
      status: connected ? "CONNECTED" : "NEEDS_ATTENTION",
      displayName: "Stripe Connect",
      accountLabel: account.id,
      config: { onboardingStatus: connected ? "complete" : "pending", chargesEnabled: Boolean(account.charges_enabled), payoutsEnabled: Boolean(account.payouts_enabled) }
    });
    revalidatePath("/onboarding/setup");
    revalidatePath("/dashboard/integrations");
    return { success: "Stripe status refreshed." } satisfies SetupActionResult;
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Stripe status could not be refreshed." } satisfies SetupActionResult;
  }
}

const emailSetupSchema = z.object({
  senderName: z.string().min(2),
  senderEmail: z.string().email(),
  domain: z.string().min(3)
});

export async function saveEmailSendingSetupAction(first: FormData | SetupActionResult | null | undefined, second?: FormData) {
  const user = await requireBusinessUser();
  const formData = resolveFormData(first, second);

  if (!requireOwnerOrAdmin(user)) {
    return { error: "Only client owners can configure email sending." } satisfies SetupActionResult;
  }

  const parsed = emailSetupSchema.safeParse({
    senderName: formString(formData, "senderName"),
    senderEmail: formString(formData, "senderEmail"),
    domain: formString(formData, "domain").toLowerCase()
  });

  if (!parsed.success) {
    return { error: "Add sender name, sender email, and sending domain." } satisfies SetupActionResult;
  }

  await prisma.business.update({
    where: { id: user.business.id },
    data: {
      emailSenderName: parsed.data.senderName,
      emailSenderEmail: parsed.data.senderEmail,
      emailDomain: parsed.data.domain,
      emailVerificationStatus: "pending_dns"
    }
  });
  await upsertIntegration(user.business.id, "RESEND", {
    status: "NEEDS_ATTENTION",
    displayName: "Resend Email",
    accountLabel: parsed.data.senderEmail,
    config: {
      senderName: parsed.data.senderName,
      senderEmail: parsed.data.senderEmail,
      domain: parsed.data.domain,
      verificationStatus: "pending_dns"
    }
  });

  revalidatePath("/onboarding/setup");
  revalidatePath("/dashboard/integrations");
  return { success: "Email setup saved. DNS verification is pending." } satisfies SetupActionResult;
}

export async function skipOnboardingIntegrationsAction() {
  redirect("/dashboard");
}
