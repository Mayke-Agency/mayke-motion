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
  return Boolean(business.emailSenderEmail && business.emailDomain && business.emailVerificationStatus !== "not_configured");
}

export const stripeSetupMessage = "Stripe setup required before payment collection can be used.";
export const emailSetupMessage = "Email setup required before sends can be used. Drafts can still be saved.";
