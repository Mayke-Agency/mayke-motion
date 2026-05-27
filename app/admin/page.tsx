import Link from "next/link";
import { Building2, CircleDollarSign, ExternalLink, MessageSquareText, UserPlus, Users } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SetupChecklistCard } from "@/components/dashboard/SetupChecklistCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createAdminClientAction, inviteUserAction, logoutAction } from "@/lib/actions";
import { getAdminActivity, getAdminSnapshot } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";
import { requireAdmin } from "@/lib/auth";

const moduleKeys = ["CRM", "INQUIRIES", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "PRODUCTS", "MENU", "RESERVATIONS", "EDUCATION", "INTEGRATIONS", "BILLING"];
const statuses = ["TRIALING", "ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED", "UNPAID", "INACTIVE"];

export default async function AdminPage() {
  const user = await requireAdmin();
  const [snapshot, activity] = await Promise.all([getAdminSnapshot(), getAdminActivity()]);

  return (
    <main className="main">
      <PageHeader
        eyebrow="Mayke Agency"
        title="Client command"
        description={`Admin view for ${user.name}. Monitor client accounts, users, and demo operating data across Mayke Motion.`}
        action={
          <div className="button-row">
            <Link className="button secondary" href="/admin/feedback">
              <MessageSquareText size={16} />
              Feedback
            </Link>
            <form action={logoutAction}>
              <button className="button secondary" type="submit">
                Sign out
              </button>
            </form>
          </div>
        }
      />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <MetricCard icon={Building2} label="Businesses" value={snapshot.businesses.length.toString()} delta="MVP tenants" />
        <MetricCard icon={Users} label="Users" value={snapshot.users.toString()} delta={`${snapshot.customers} customers`} />
        <MetricCard icon={CircleDollarSign} label="Tracked revenue" value={formatCurrency(snapshot.revenue)} delta="Demo data" />
      </div>

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Client accounts</h2>
              <p>Role-based tenants with isolated business data.</p>
            </div>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th>
                  <th>Type</th>
                  <th>Users</th>
                  <th>Customers</th>
                  <th>Inquiries</th>
                  <th>Campaigns</th>
                  <th>Modules</th>
                  <th>Integrations</th>
                  <th>Setup</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {snapshot.businesses.length ? (
                  snapshot.businesses.map((business) => (
                    <tr key={business.id}>
                      <td>
                        <strong>{business.name}</strong>
                      </td>
                      <td>
                        <StatusBadge status={business.businessType.code} />
                      </td>
                      <td>{business.users.length}</td>
                      <td>{business._count.customers}</td>
                      <td>{business._count.inquiries}</td>
                      <td>{business._count.campaigns}</td>
                      <td>{business._count.modules}</td>
                      <td>{business._count.integrations}</td>
                      <td>
                        <span className="stat-pill">{business.setupChecklist.percent}%</span>
                      </td>
                      <td>
                        <div className="button-row" style={{ justifyContent: "flex-start" }}>
                          <Link className="button ghost" href={`/admin/clients/${business.id}`}>
                            <ExternalLink size={14} />
                            Manage
                          </Link>
                          <Link className="button ghost" href={`/admin/clients/${business.id}/dashboard`}>
                            Dashboard
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={10} message="No client businesses have been created yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Create client</h2>
              <p>Create the workspace, owner login, and starting modules.</p>
            </div>
          </div>
          <div className="panel-body">
            <StatefulForm action={createAdminClientAction}>
              <div className="field">
                <label htmlFor="name">Business name</label>
                <input className="input" id="name" name="name" placeholder="Client brand" required />
              </div>
              <div className="field">
                <label htmlFor="businessTypeId">Business type</label>
                <select className="select" id="businessTypeId" name="businessTypeId" required>
                  {snapshot.businessTypes.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="contactEmail">Primary contact</label>
                <input className="input" id="contactEmail" name="contactEmail" type="text" inputMode="email" placeholder="owner@example.com" required />
              </div>
              <div className="field">
                <label htmlFor="brandPrimary">Brand color</label>
                <input className="input" id="brandPrimary" name="brandPrimary" defaultValue="#14110f" required />
              </div>
              <div className="field">
                <label htmlFor="subscriptionStatus">Account status</label>
                <select className="select" id="subscriptionStatus" name="subscriptionStatus" defaultValue="TRIALING">
                  {statuses.map((status) => (
                    <option key={status} value={status}>
                      {status.toLowerCase().replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>Enabled modules</label>
                <div className="module-grid">
                  {moduleKeys.map((key) => (
                    <label className="module-toggle" key={key}>
                      <input type="checkbox" name="modules" value={key} defaultChecked={["CRM", "INQUIRIES", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "INTEGRATIONS", "BILLING"].includes(key)} />
                      <span>{key.toLowerCase().replaceAll("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>
              <SubmitButton>Create client</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Invite user</h2>
              <p>Invite an owner or staff member to the correct client workspace.</p>
            </div>
            <UserPlus size={20} />
          </div>
          <div className="panel-body">
            <StatefulForm action={inviteUserAction}>
              <div className="field">
                <label htmlFor="inviteBusinessId">Business</label>
                <select className="select" id="inviteBusinessId" name="businessId" required>
                  {snapshot.businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="inviteEmail">Email address</label>
                <input className="input" id="inviteEmail" name="email" type="email" placeholder="user@example.com" required />
              </div>
              <div className="field">
                <label htmlFor="inviteRole">Role</label>
                <select className="select" id="inviteRole" name="role" defaultValue="STAFF">
                  <option value="CLIENT_OWNER">Client owner</option>
                  <option value="STAFF">Staff member</option>
                </select>
              </div>
              <SubmitButton>
                <UserPlus size={16} />
                Create invite
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>

        {snapshot.businesses.map((business) => (
          <SetupChecklistCard key={business.id} {...business.setupChecklist} adminBusinessId={business.id} title={`${business.name} setup`} />
        ))}

        <ActivityFeed items={activity} />
      </div>
    </main>
  );
}
