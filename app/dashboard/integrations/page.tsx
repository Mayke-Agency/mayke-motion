import Link from "next/link";
import { ArrowRight, Boxes, CheckCircle2, Mail, PlugZap } from "lucide-react";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getIntegrations, getModules } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function IntegrationsPage() {
  const user = await requireBusinessUser();
  const [integrations, modules] = await Promise.all([getIntegrations(user.business.id), getModules(user.business.id)]);
  const business = user.business;

  return (
    <>
      <PageHeader
        eyebrow="Integrations"
        title="Connected systems"
        description="Mayke-managed integration readiness for commerce, hospitality, messaging, payments, and CRM systems."
      />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Stripe Connect</h2>
              <p>{business.stripeAccountId ?? "No Express account connected."}</p>
            </div>
            <PlugZap size={20} />
          </div>
          <div className="panel-body detail-stack">
            <StatusBadge status={business.stripeOnboardingStatus} />
            <p className="metric-delta">
              Charges {business.stripeChargesEnabled ? "enabled" : "pending"} · payouts {business.stripePayoutsEnabled ? "enabled" : "pending"}
            </p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Email sending</h2>
              <p>{business.emailSenderEmail ?? "Sender not configured."}</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body detail-stack">
            <StatusBadge status={business.emailVerificationStatus} />
            <p className="metric-delta">{business.emailDomain ?? "Add a sending domain in setup."}</p>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Setup controls</h2>
              <p>{user.role === "STAFF" ? "Read-only for staff." : "Owners can connect payment and email systems."}</p>
            </div>
          </div>
          <div className="panel-body">
            <Link className="button secondary" href="/onboarding/setup">
              Open setup
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      </div>

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Integration status</h2>
              <p>Mock and connected states are staged here before production API syncs go live.</p>
            </div>
            <PlugZap size={20} />
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Integration</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Last sync</th>
                </tr>
              </thead>
              <tbody>
                {integrations.length ? (
                  integrations.map((integration) => (
                    <tr key={integration.id}>
                      <td>
                        <strong>{integration.displayName}</strong>
                        <div style={{ color: "var(--muted)", marginTop: 4 }}>{integration.accountLabel ?? "Prepared by Mayke Agency"}</div>
                      </td>
                      <td>{integration.provider.toLowerCase()}</td>
                      <td>
                        <StatusBadge status={integration.status} />
                      </td>
                      <td>{formatDate(integration.lastSyncedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={4} message="No integrations have been configured for this workspace." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Enabled modules</h2>
              <p>Client-specific portal capabilities controlled by Mayke.</p>
            </div>
            <Boxes size={20} />
          </div>
          <div className="panel-body">
            <div className="timeline-list">
              {modules.map((module) => (
                <article className="timeline-item" key={module.id}>
                  <div>
                    <strong>{module.label}</strong>
                    {module.enabled ? <CheckCircle2 size={16} /> : <StatusBadge status="paused" />}
                  </div>
                  <p>{module.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
