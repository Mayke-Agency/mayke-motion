import Link from "next/link";
import { Building2, CircleDollarSign, ExternalLink, MessageSquareText, Plus, UserPlus, Users } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SetupChecklistCard } from "@/components/dashboard/SetupChecklistCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { inviteUserAction, logoutAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminActivity, getAdminSnapshot } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";

export default async function AdminPage() {
  const user = await requireAdmin();
  const [snapshot, activity] = await Promise.all([getAdminSnapshot(), getAdminActivity()]);

  return (
    <main className="main">
      <PageHeader
        eyebrow="Mayke Agency"
        title="Client command"
        description={`Admin view for ${user.name}. Monitor client workspaces, access, and operational readiness.`}
        action={
          <div className="button-row">
            <Link className="button" href="/admin/organizations/new">
              <Plus size={16} />
              New organization
            </Link>
            <Link className="button secondary" href="/admin/feedback">
              <MessageSquareText size={16} />
              Feedback
            </Link>
            <form action={logoutAction}>
              <button className="button secondary" type="submit">Sign out</button>
            </form>
          </div>
        }
      />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <MetricCard icon={Building2} label="Organizations" value={snapshot.businesses.length.toString()} delta="Active workspaces" />
        <MetricCard icon={Users} label="Users" value={snapshot.users.toString()} delta={`${snapshot.customers} CRM contacts`} />
        <MetricCard icon={CircleDollarSign} label="Tracked revenue" value={formatCurrency(snapshot.revenue)} delta="Across client workspaces" />
      </div>

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Organizations</h2>
              <p>Isolated workspaces with client-specific modules and setup status.</p>
            </div>
            <Link className="button secondary" href="/admin/organizations/new">
              <Plus size={16} />
              Add client
            </Link>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Business</th><th>Type</th><th>Users</th><th>CRM</th><th>Open inquiries</th><th>Modules</th><th>Setup</th><th></th>
                </tr>
              </thead>
              <tbody>
                {snapshot.businesses.length ? snapshot.businesses.map((business) => (
                  <tr key={business.id}>
                    <td><strong>{business.name}</strong></td>
                    <td><StatusBadge status={business.businessType.code} /></td>
                    <td>{business.users.length}</td>
                    <td>{business._count.customers}</td>
                    <td>{business._count.inquiries}</td>
                    <td>{business._count.modules}</td>
                    <td><span className="stat-pill">{business.setupChecklist.percent}%</span></td>
                    <td>
                      <div className="button-row" style={{ justifyContent: "flex-start" }}>
                        <Link className="button ghost" href={`/admin/clients/${business.id}`}><ExternalLink size={14} />Manage</Link>
                        <Link className="button ghost" href={`/admin/clients/${business.id}/dashboard`}>View</Link>
                      </div>
                    </td>
                  </tr>
                )) : <EmptyTableRow columns={8} message="No client organizations have been created yet." />}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Invite user</h2>
              <p>Add an owner or staff member to a specific workspace.</p>
            </div>
            <UserPlus size={20} />
          </div>
          <div className="panel-body">
            <StatefulForm action={inviteUserAction}>
              <div className="field">
                <label htmlFor="inviteBusinessId">Business</label>
                <select className="select" id="inviteBusinessId" name="businessId" required>
                  {snapshot.businesses.map((business) => <option key={business.id} value={business.id}>{business.name}</option>)}
                </select>
              </div>
              <div className="field">
                <label htmlFor="inviteEmail">Email address</label>
                <input className="input" id="inviteEmail" name="email" type="email" placeholder="user@example.com" required />
              </div>
              <div className="field">
                <label htmlFor="inviteRole">Role</label>
                <select className="select" id="inviteRole" name="role" defaultValue="STAFF">
                  <option value="CLIENT_OWNER">Client owner</option><option value="STAFF">Staff member</option>
                </select>
              </div>
              <SubmitButton><UserPlus size={16} />Create invite</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        {snapshot.businesses.map((business) => <SetupChecklistCard key={business.id} {...business.setupChecklist} adminBusinessId={business.id} title={`${business.name} setup`} />)}
        <ActivityFeed items={activity} />
      </div>
    </main>
  );
}
