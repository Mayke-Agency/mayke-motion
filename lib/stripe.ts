import "server-only";

import type { SubscriptionPlan } from "@prisma/client";
import { planDetails } from "@/lib/billing";

type StripeCustomerInput = {
  businessId: string;
  businessName: string;
  email: string | null;
};

type StripeCustomer = {
  id: string;
};

type StripeSession = {
  id: string;
  url: string | null;
};

type StripeAccount = {
  id: string;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  details_submitted?: boolean;
};

function stripeSecretKey() {
  return process.env.STRIPE_SECRET_KEY ?? "";
}

function appUrl() {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NODE_ENV === "production") {
    throw new Error("APP_URL is required in production for Stripe redirects.");
  }
  return "http://localhost:3000";
}

export function isStripeConfigured() {
  return Boolean(stripeSecretKey());
}

export function getStripePriceId(plan: SubscriptionPlan) {
  return process.env[planDetails[plan].envPriceKey] ?? "";
}

function encodeForm(data: Record<string, string | number | boolean | null | undefined>) {
  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(data)) {
    if (value !== null && value !== undefined && value !== "") {
      body.append(key, String(value));
    }
  }

  return body;
}

async function stripeRequest<T>(path: string, body?: URLSearchParams, method: "GET" | "POST" = "POST") {
  const secretKey = stripeSecretKey();

  if (!secretKey) {
    throw new Error("Stripe is not configured. Add STRIPE_SECRET_KEY to the environment.");
  }

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body: method === "POST" ? body : undefined
  });

  const payload = (await response.json().catch(() => null)) as (T & { error?: { message?: string } }) | null;

  if (!response.ok || !payload) {
    throw new Error(payload?.error?.message ?? "Stripe request failed.");
  }

  return payload as T;
}

export async function createStripeExpressAccount(input: {
  businessId: string;
  businessName: string;
  email: string | null;
}) {
  return stripeRequest<StripeAccount>(
    "accounts",
    encodeForm({
      type: "express",
      country: "US",
      email: input.email,
      business_type: "company",
      "business_profile[name]": input.businessName,
      "capabilities[card_payments][requested]": true,
      "capabilities[transfers][requested]": true,
      "metadata[businessId]": input.businessId
    })
  );
}

export async function createStripeConnectAccountLink(input: {
  accountId: string;
}) {
  return stripeRequest<StripeSession>(
    "account_links",
    encodeForm({
      account: input.accountId,
      type: "account_onboarding",
      refresh_url: `${appUrl()}/onboarding/stripe/refresh`,
      return_url: `${appUrl()}/onboarding/stripe/return`
    })
  );
}

export async function retrieveStripeAccount(accountId: string) {
  return stripeRequest<StripeAccount>(`accounts/${accountId}`, undefined, "GET");
}

export async function createStripeCustomer(input: StripeCustomerInput) {
  return stripeRequest<StripeCustomer>(
    "customers",
    encodeForm({
      name: input.businessName,
      email: input.email,
      "metadata[businessId]": input.businessId
    })
  );
}

export async function createStripeCheckoutSession(input: {
  businessId: string;
  customerId: string;
  plan: SubscriptionPlan;
}) {
  const priceId = getStripePriceId(input.plan);

  if (!priceId) {
    throw new Error(`Stripe price ID is not configured for the ${planDetails[input.plan].name} plan.`);
  }

  // TODO: Handle checkout.session.completed and customer.subscription.* webhooks in production.
  return stripeRequest<StripeSession>(
    "checkout/sessions",
    encodeForm({
      mode: "subscription",
      customer: input.customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      success_url: `${appUrl()}/dashboard/billing?success=checkout`,
      cancel_url: `${appUrl()}/dashboard/billing?canceled=checkout`,
      "metadata[businessId]": input.businessId,
      "metadata[plan]": input.plan,
      "subscription_data[metadata][businessId]": input.businessId,
      "subscription_data[metadata][plan]": input.plan
    })
  );
}

export async function createStripePortalSession(input: {
  customerId: string;
}) {
  return stripeRequest<StripeSession>(
    "billing_portal/sessions",
    encodeForm({
      customer: input.customerId,
      return_url: `${appUrl()}/dashboard/billing?success=portal`
    })
  );
}

export async function createRegistrationCheckoutSession(input: {
  businessId: string;
  registrationId: string;
  formSlug: string;
  amountCents: number;
  title: string;
  email: string;
}) {
  if (input.amountCents <= 0) {
    throw new Error("Registration fee must be greater than $0 to start checkout.");
  }

  // TODO: Confirm registration payment status via checkout.session.completed webhook in production.
  return stripeRequest<StripeSession>(
    "checkout/sessions",
    encodeForm({
      mode: "payment",
      customer_email: input.email,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": input.amountCents,
      "line_items[0][price_data][product_data][name]": input.title,
      success_url: `${appUrl()}/register/${input.formSlug}/success?registration=${input.registrationId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/register/${input.formSlug}?payment=canceled`,
      "metadata[businessId]": input.businessId,
      "metadata[registrationId]": input.registrationId,
      "payment_intent_data[metadata][businessId]": input.businessId,
      "payment_intent_data[metadata][registrationId]": input.registrationId
    })
  );
}

export async function createSportsInvoiceCheckoutSession(input: {
  businessId: string;
  invoiceId: string;
  clubSlug: string;
  amountCents: number;
  title: string;
  email: string;
}) {
  if (input.amountCents <= 0) throw new Error("Invoice amount must be greater than $0 to start checkout.");

  return stripeRequest<StripeSession>(
    "checkout/sessions",
    encodeForm({
      mode: "payment",
      customer_email: input.email,
      "line_items[0][quantity]": 1,
      "line_items[0][price_data][currency]": "usd",
      "line_items[0][price_data][unit_amount]": input.amountCents,
      "line_items[0][price_data][product_data][name]": input.title,
      success_url: `${appUrl()}/club/${input.clubSlug}?payment=success`,
      cancel_url: `${appUrl()}/club/${input.clubSlug}?payment=canceled`,
      "metadata[businessId]": input.businessId,
      "metadata[sportsInvoiceId]": input.invoiceId,
      "payment_intent_data[metadata][businessId]": input.businessId,
      "payment_intent_data[metadata][sportsInvoiceId]": input.invoiceId
    })
  );
}
