type IntegrationBusiness = {
  stripeAccountId?: string | null;
  stripeChargesEnabled?: boolean;
  stripePayoutsEnabled?: boolean;
  emailSenderEmail?: string | null;
  emailDomain?: string | null;
  emailVerificationStatus?: string | null;
};

export function isStripePaymentsReady(business: IntegrationBusiness) {
  return Boolean(business.stripeAccountId && business.stripeChargesEnabled && business.stripePayoutsEnabled);
}

export function isEmailSendingReady(business: IntegrationBusiness) {
  const readyStatuses = new Set(["verified", "connected", "complete"]);
  return Boolean(business.emailSenderEmail && business.emailDomain && readyStatuses.has(business.emailVerificationStatus ?? ""));
}

export const stripeSetupMessage = "Stripe setup required before payment collection can be used.";
export const emailSetupMessage = "Email setup required before sends can be used. Drafts can still be saved.";
