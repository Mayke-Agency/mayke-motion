import { Palette, PlugZap, Settings, UserPlus, Users } from "lucide-react";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { deactivateStaffUserAction, inviteUserAction, revokeInviteAction } from "@/lib/actions";
import { businessTypeCopy } from "@/lib/business-config";
import { getIntegrations, getModules, getTeamAccess } from "@/lib/dashboard-data";
import { requireBusinessUser } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await requireBusinessUser();
  const business = user.business;
  const copy = businessTypeCopy[business.businessType.code];
  const [integrations, modules, team] = await Promise.all([getIntegrations(business.id), getModules(business.id), getTeamAccess(business.id)]);
  const canInvite = user.role === "CLIENT_OWNER";

  return (
    <>
      <PageHeader
        eyebrow="Workspace settings"
        title="Business profile"
        description="Manage the client profile, brand presentation, and account foundations that future integrations will use."
      />

      <div className="grid cols-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Profile</h2>
              <p>Core business information for routing, reporting, and customer-facing integrations.</p>
            </div>
            <Settings size={20} />
          </div>
          <div className="panel-body form-grid">
            <div className="field">
              <label>Business name</label>
              <input className="input" value={business.name} readOnly />
            </div>
            <div className="field">
              <label>Business type</label>
              <input className="input" value={copy.label} readOnly />
            </div>
            <div className="field full">
              <label>Description</label>
              <textarea className="textarea" value={business.description} readOnly />
            </div>
            <div className="field">
              <label>Website</label>
              <input className="input" value={business.website ?? ""} readOnly />
            </div>
            <div className="field">
              <label>Contact email</label>
              <input className="input" value={business.contactEmail ?? ""} readOnly />
            </div>
            <div className="field">
              <label>Phone</label>
              <input className="input" value={business.phone ?? ""} readOnly />
            </div>
            <div className="field full">
              <label>Address</label>
              <input className="input" value={business.address ?? ""} readOnly />
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Brand system</h2>
              <p>Logo upload and theme controls are staged for a future asset pipeline.</p>
            </div>
            <Palette size={20} />
          </div>
          <div className="panel-body form-grid">
            <div className="field full">
              <label>Logo upload</label>
              <div className="empty-state">Logo upload placeholder</div>
            </div>
            <div className="field">
              <label>Primary color</label>
              <input className="input" value={business.brandPrimary} readOnly />
            </div>
            <div className="field">
              <label>Accent color</label>
              <input className="input" value={business.brandAccent} readOnly />
            </div>
            <div className="field full">
              <label>Account role</label>
              <input className="input" value={user.role.replace("_", " ").toLowerCase()} readOnly />
            </div>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Team access</h2>
              <p>Client owners can invite staff into this business workspace. Staff access is scoped to {business.name}.</p>
            </div>
            <Users size={20} />
          </div>
          <div className="panel-body">
            {canInvite ? (
              <StatefulForm action={inviteUserAction} className="form-grid" key="invite-staff">
                <div className="field">
                  <label htmlFor="invite-email">Email address</label>
                  <input className="input" id="invite-email" name="email" type="email" placeholder="team@example.com" required />
                </div>
                <div className="field">
                  <label htmlFor="invite-role">Role</label>
                  <select className="select" id="invite-role" name="role" defaultValue="STAFF">
                    <option value="STAFF">Staff member</option>
                  </select>
                </div>
                <div className="field" style={{ justifyContent: "end" }}>
                  <SubmitButton>
                    <UserPlus size={16} />
                    Invite staff
                  </SubmitButton>
                </div>
              </StatefulForm>
            ) : null}

            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {team.users.length ? (
                    team.users.map((member) => (
                      <tr key={member.id}>
                        <td>
                          <strong>{member.name}</strong>
                          <p>{member.email}</p>
                        </td>
                        <td>{member.role.replaceAll("_", " ").toLowerCase()}</td>
                        <td>
                          <StatusBadge status={member.isActive ? "ACTIVE" : "INACTIVE"} />
                        </td>
                        <td>
                          {canInvite && member.role === "STAFF" && member.isActive ? (
                            <StatefulForm action={deactivateStaffUserAction} className="button-row">
                              <input type="hidden" name="userId" value={member.id} />
                              <SubmitButton className="button ghost">Deactivate</SubmitButton>
                            </StatefulForm>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow columns={4} message="No users are assigned to this business yet." />
                  )}
                </tbody>
              </table>
            </div>

            <div className="table-wrap" style={{ marginTop: 18 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invite</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {team.invites.length ? (
                    team.invites.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.email}</td>
                        <td>{invite.role.replaceAll("_", " ").toLowerCase()}</td>
                        <td>
                          <StatusBadge status={invite.status} />
                        </td>
                        <td>
                          {canInvite && invite.status === "PENDING" ? (
                            <StatefulForm action={revokeInviteAction} className="button-row">
                              <input type="hidden" name="inviteId" value={invite.id} />
                              <SubmitButton className="button ghost">Revoke</SubmitButton>
                            </StatefulForm>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow columns={4} message="No invites have been created yet." />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Portal modules</h2>
              <p>Mayke-controlled capabilities enabled for this client workspace.</p>
            </div>
            <PlugZap size={20} />
          </div>
          <div className="panel-body">
            <div className="timeline-list">
              {modules.slice(0, 6).map((module) => (
                <article className="timeline-item" key={module.id}>
                  <div>
                    <strong>{module.label}</strong>
                    <span>{module.enabled ? "enabled" : "paused"}</span>
                  </div>
                  <p>{module.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Integration profile</h2>
              <p>Connection readiness for systems Mayke configures on behalf of the client.</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="timeline-list">
              {integrations.slice(0, 6).map((integration) => (
                <article className="timeline-item" key={integration.id}>
                  <div>
                    <strong>{integration.displayName}</strong>
                    <span>{integration.status.toLowerCase().replaceAll("_", " ")}</span>
                  </div>
                  <p>{integration.accountLabel ?? "Prepared for future connection."}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
