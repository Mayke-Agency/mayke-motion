import Link from "next/link";
import { ArrowRight, CheckCircle2, Mail, PlugZap, ShieldCheck, SkipForward, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireBusinessUser } from "@/lib/auth";
import { getModules, getTeamAccess } from "@/lib/dashboard-data";
import { saveEmailSendingSetupAction, startStripeConnectOnboardingAction, refreshStripeConnectStatusAction } from "@/lib/onboarding-integrations-actions";

function checklistItem(label: string, complete: boolean, detail: string) {
  return (
    <article className="timeline-item" key={label}>
      <div>
        <strong>{label}</strong>
        {complete ? <CheckCircle2 size={16} /> : <StatusBadge status="pending" />}
      </div>
      <p>{detail}</p>
    </article>
  );
}

export default async function OnboardingSetupPage() {
  const user = await requireBusinessUser();
  const [modules, team] = await Promise.all([getModules(user.business.id), getTeamAccess(user.business.id)]);
  const business = user.business;
  const canEdit = user.role === "CLIENT_OWNER" || user.role === "ADMIN";
  const profileComplete = Boolean(business.name && business.contactEmail && business.address);
  const modulesSelected = modules.some((module) => module.enabled);
  const stripeConnected = Boolean(business.stripeAccountId && business.stripeChargesEnabled && business.stripePayoutsEnabled);
  const emailConfigured = Boolean(business.emailSenderEmail && business.emailDomain);
  const staffInvited = team.users.length > 1 || team.invites.length > 0;

  return (
    <main className="main">
      <PageHeader
        eyebrow="Workspace setup"
        title="Connect the systems that power daily operations."
        description="Finish the high-trust setup pieces for payments, outbound email, team access, and module readiness. You can skip anything that is not ready yet."
        action={
          <Link className="button secondary" href="/dashboard">
            Go to dashboard
            <ArrowRight size={16} />
          </Link>
        }
      />

      <div className="grid cols-3">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Setup checklist</h2>
              <p>Visible to owners while the workspace is getting production-ready.</p>
            </div>
            <ShieldCheck size={20} />
          </div>
          <div className="panel-body">
            <div className="timeline-list">
              {[
                checklistItem("Business profile complete", profileComplete, profileComplete ? business.name : "Add contact and location details."),
                checklistItem("Modules selected", modulesSelected, `${modules.filter((module) => module.enabled).length} enabled module${modules.filter((module) => module.enabled).length === 1 ? "" : "s"}.`),
                checklistItem("Stripe connected", stripeConnected, business.stripeAccountId ? `Account ${business.stripeAccountId}` : "Connect Express onboarding when payments are needed."),
                checklistItem("Email configured", emailConfigured, business.emailSenderEmail ?? "Add a verified sending identity."),
                checklistItem("Staff invited", staffInvited, staffInvited ? "Team access has started." : "Invite staff later from Settings.")
              ]}
            </div>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Stripe Connect</h2>
              <p>Use Stripe Express onboarding. Mayke Motion never collects bank, tax, or KYC details directly.</p>
            </div>
            <PlugZap size={20} />
          </div>
          <div className="panel-body detail-stack">
            <div className="grid cols-3">
              <div className="profile-card">
                <span>onboarding</span>
                <strong>{business.stripeOnboardingStatus.replaceAll("_", " ")}</strong>
                <p>{business.stripeAccountId ?? "No Stripe account connected yet."}</p>
              </div>
              <div className="profile-card">
                <span>charges</span>
                <strong>{business.stripeChargesEnabled ? "Enabled" : "Not enabled"}</strong>
                <p>Card payment capability</p>
              </div>
              <div className="profile-card">
                <span>payouts</span>
                <strong>{business.stripePayoutsEnabled ? "Enabled" : "Not enabled"}</strong>
                <p>Stripe payout capability</p>
              </div>
            </div>
            {canEdit ? (
              <div className="button-row">
                <StatefulForm action={startStripeConnectOnboardingAction} className="button-row">
                  <SubmitButton>
                    <PlugZap size={16} />
                    Connect Stripe
                  </SubmitButton>
                </StatefulForm>
                <StatefulForm action={refreshStripeConnectStatusAction} className="button-row">
                  <SubmitButton className="button secondary">Refresh status</SubmitButton>
                </StatefulForm>
              </div>
            ) : (
              <p className="metric-delta">Staff can view integration status, but only owners can edit payment setup.</p>
            )}
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Email sending</h2>
              <p>Configure the sender identity Mayke Motion will use for follow-ups, campaigns, and announcements.</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body">
            {canEdit ? (
              <StatefulForm action={saveEmailSendingSetupAction}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="senderName">Sender name</label>
                    <input className="input" id="senderName" name="senderName" defaultValue={business.emailSenderName ?? business.name} required />
                  </div>
                  <div className="field">
                    <label htmlFor="senderEmail">Sender email</label>
                    <input className="input" id="senderEmail" name="senderEmail" type="email" defaultValue={business.emailSenderEmail ?? business.contactEmail ?? ""} required />
                  </div>
                  <div className="field full">
                    <label htmlFor="domain">Sending domain</label>
                    <input className="input" id="domain" name="domain" placeholder="example.com" defaultValue={business.emailDomain ?? ""} required />
                  </div>
                </div>
                <SubmitButton>
                  <Mail size={16} />
                  Save email setup
                </SubmitButton>
              </StatefulForm>
            ) : (
              <p className="metric-delta">Staff can view email setup, but only owners can edit sender settings.</p>
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>DNS verification</h2>
              <p>Placeholder instructions for Resend domain verification.</p>
            </div>
            <StatusBadge status={business.emailVerificationStatus} />
          </div>
          <div className="panel-body detail-stack">
            <div className="profile-card">
              <span>domain</span>
              <strong>{business.emailDomain ?? "Not configured"}</strong>
              <p>{business.emailSenderEmail ?? "Add sender details to generate DNS instructions."}</p>
            </div>
            <div className="timeline-list">
              <article className="timeline-item">
                <div>
                  <strong>TXT record</strong>
                  <StatusBadge status="pending" />
                </div>
                <p>Name: resend._domainkey.{business.emailDomain ?? "yourdomain.com"}</p>
                <p>Value: resend-verification-placeholder</p>
              </article>
              <article className="timeline-item">
                <div>
                  <strong>SPF / DKIM</strong>
                  <StatusBadge status="pending" />
                </div>
                <p>Final DNS values will be copied from the client&apos;s Resend domain screen.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 3" }}>
          <div className="panel-header">
            <div>
              <h2>Team access</h2>
              <p>{team.users.length} active user{team.users.length === 1 ? "" : "s"} and {team.invites.length} pending invite{team.invites.length === 1 ? "" : "s"}.</p>
            </div>
            <Users size={20} />
          </div>
          <div className="panel-body">
            <div className="button-row">
              <Link className="button secondary" href="/dashboard/settings">
                Manage staff
                <ArrowRight size={16} />
              </Link>
              <Link className="button ghost" href="/dashboard">
                <SkipForward size={16} />
                Skip for now
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
