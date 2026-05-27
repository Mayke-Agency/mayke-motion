import { AlertTriangle, CreditCard, ExternalLink, LockKeyhole } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { openStripeCustomerPortalAction, startStripeCheckoutAction } from "@/lib/actions";
import { formatSubscriptionStatus, hasDashboardAccess, planDetails } from "@/lib/billing";
import { requireBusinessUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getStripePriceId, isStripeConfigured } from "@/lib/stripe";

export default async function BillingPage({
  searchParams
}: {
  searchParams: Promise<{ success?: string; canceled?: string; restricted?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;
  const business = user.business;
  const stripeConfigured = isStripeConfigured();
  const ownerCanManage = user.role !== "STAFF";
  const accessActive = hasDashboardAccess(business.subscriptionStatus);

  return (
    <>
      <PageHeader
        eyebrow="Billing"
        title="Subscription foundations"
        description="Connect Mayke Motion workspaces to Stripe customers, subscriptions, checkout, and the customer portal."
        action={<StatusBadge status={business.subscriptionStatus} />}
      />

      {params.restricted ? (
        <div className="notice danger" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <span>Your workspace needs an active or trialing subscription before the dashboard can be accessed.</span>
        </div>
      ) : null}

      {params.success ? (
        <div className="notice success" style={{ marginBottom: 16 }}>
          <CreditCard size={18} />
          <span>Stripe returned successfully. Webhooks will finalize subscription state in production.</span>
        </div>
      ) : null}

      {params.canceled ? (
        <div className="notice" style={{ marginBottom: 16 }}>
          <AlertTriangle size={18} />
          <span>Checkout was canceled. Your current subscription settings are unchanged.</span>
        </div>
      ) : null}

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Current plan</h2>
              <p>Subscription state attached to {business.name}.</p>
            </div>
            <CreditCard size={20} />
          </div>
          <div className="panel-body detail-stack">
            <div className="profile-card">
              <span>Plan</span>
              <strong>{planDetails[business.subscriptionPlan].name}</strong>
              <p>{planDetails[business.subscriptionPlan].summary}</p>
            </div>
            <div className="detail-grid" style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
              <div>
                <span>Status</span>
                <strong>{formatSubscriptionStatus(business.subscriptionStatus)}</strong>
                <p>{accessActive ? "Dashboard access is open." : "Dashboard access is restricted."}</p>
              </div>
              <div>
                <span>Stripe customer</span>
                <strong>{business.stripeCustomerId ? "Connected" : "Not connected"}</strong>
                <p>{business.subscriptionCurrentPeriodEnd ? `Renews ${formatDate(business.subscriptionCurrentPeriodEnd)}` : "No renewal date yet"}</p>
              </div>
            </div>
            <StatefulForm action={openStripeCustomerPortalAction}>
              <SubmitButton className="button secondary">
                <ExternalLink size={16} />
                Manage in Stripe
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Billing readiness</h2>
              <p>Server-side Stripe configuration and access policy for this workspace.</p>
            </div>
            <LockKeyhole size={20} />
          </div>
          <div className="panel-body">
            <div className="detail-grid">
              <div>
                <span>Stripe API</span>
                <strong>{stripeConfigured ? "Configured" : "Missing key"}</strong>
                <p>{stripeConfigured ? "Checkout and portal can call Stripe." : "Add STRIPE_SECRET_KEY to enable real billing."}</p>
              </div>
              <div>
                <span>Role access</span>
                <strong>{ownerCanManage ? "Can manage" : "View only"}</strong>
                <p>{ownerCanManage ? "Client owners can start checkout and portal sessions." : "Staff members cannot change billing."}</p>
              </div>
              <div>
                <span>Webhook status</span>
                <strong>Pending</strong>
                <p>Production webhook handling is intentionally staged as the next billing step.</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Choose a plan</h2>
            <p>Checkout uses Stripe price IDs from the environment when available.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="grid cols-3">
            {(Object.keys(planDetails) as Array<keyof typeof planDetails>).map((plan) => {
              const details = planDetails[plan];
              const priceConfigured = Boolean(getStripePriceId(plan));
              const current = business.subscriptionPlan === plan;

              return (
                <article className={`plan-card ${current ? "active" : ""}`} key={plan}>
                  <div>
                    <span>{current ? "Current plan" : priceConfigured ? "Stripe ready" : "Price ID needed"}</span>
                    <h3>{details.name}</h3>
                    <strong>{details.monthlyPrice}<small>/mo</small></strong>
                    <p>{details.summary}</p>
                  </div>
                  <ul>
                    {details.features.map((feature) => (
                      <li key={feature}>{feature}</li>
                    ))}
                  </ul>
                  <StatefulForm action={startStripeCheckoutAction}>
                    <input type="hidden" name="plan" value={plan} />
                    <SubmitButton className={current ? "button secondary" : "button"}>
                      {current ? "Refresh checkout" : `Upgrade to ${details.name}`}
                    </SubmitButton>
                  </StatefulForm>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
