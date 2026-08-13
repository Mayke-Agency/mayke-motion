import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Download, ExternalLink, FileText, PlugZap, Settings2, Trash2 } from "lucide-react";
import { ActivityFeed } from "@/components/dashboard/ActivityFeed";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { SetupChecklistCard } from "@/components/dashboard/SetupChecklistCard";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ContactImportForm } from "@/components/forms/ContactImportForm";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { deactivateStaffUserAction, deleteMessageTemplateAction, deleteOrganizationAction, removeDemoDataAction, revokeInviteAction, updateAdminClientAction, updateLaunchReadinessAction, upsertMessageTemplateAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient } from "@/lib/dashboard-data";

const moduleKeys = ["CRM", "INQUIRIES", "CAMPAIGNS", "ANALYTICS", "COMMUNICATIONS", "PRODUCTS", "MENU", "RESERVATIONS", "EDUCATION", "SPORTS", "INTEGRATIONS", "BILLING"];
const statuses = ["TRIALING", "ACTIVE", "PAST_DUE", "INCOMPLETE", "CANCELED", "UNPAID", "INACTIVE"];
const launchStatuses = ["NOT_STARTED", "IN_PROGRESS", "READY_FOR_PILOT", "LIVE"];

export default async function AdminClientPage({
  params
}: {
  params: Promise<{ businessId: string }>;
}) {
  await requireAdmin();
  const { businessId } = await params;
  const { business, businessTypes } = await getAdminClient(businessId);

  if (!business) {
    notFound();
  }

  const owner = business.users.find((user) => user.role === "CLIENT_OWNER") ?? business.users[0];
  const enabledModules = new Set<string>(business.modules.filter((module) => module.enabled).map((module) => module.key));
  const launch = business.launchReadiness;
  const demoCleanup = business.demoCleanup;

  return (
    <main className="main">
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/admin">
          <ArrowLeft size={16} />
          Back to admin
        </Link>
      </div>

      <PageHeader
        eyebrow="Client management"
        title={business.name}
        description="Manage the client workspace, module access, contact details, and basic account status."
        action={<StatusBadge status={business.subscriptionStatus} />}
      />

      <div className="grid cols-4" id="client-dashboard" style={{ marginBottom: 16 }}>
        <MetricCard icon={Settings2} label="Customers" value={business._count.customers.toString()} delta="CRM records" />
        <MetricCard icon={Settings2} label="Inquiries" value={business._count.inquiries.toString()} delta="Lead workflow" />
        <MetricCard icon={Settings2} label="Campaigns" value={business._count.campaigns.toString()} delta="Marketing records" />
        <MetricCard icon={Settings2} label="Follow-ups" value={business._count.followUpEmails.toString()} delta="Communication history" />
      </div>

      <div style={{ marginBottom: 16 }}>
        <SetupChecklistCard {...business.setupChecklist} adminBusinessId={business.id} title={`${business.name} setup`} />
      </div>

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 3" }}>
          <div className="panel-header">
            <div>
              <h2>Launch readiness</h2>
              <p>Mayke-only checklist for deciding when this workspace is ready to test or launch.</p>
            </div>
            <StatusBadge status={launch.status} />
          </div>
          <div className="panel-body">
            <StatefulForm action={updateLaunchReadinessAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <div className="detail-grid" style={{ marginBottom: 16 }}>
                <div>
                  <span>Checklist</span>
                  <strong>{launch.completedCount}/{launch.totalCount}</strong>
                  <p>{launch.paymentsEnabled ? "Payment checks are required." : "Payment checks are not required."}</p>
                </div>
                <div>
                  <span>Status</span>
                  <strong>{launch.status.toLowerCase().replaceAll("_", " ")}</strong>
                  <p>Manual Mayke launch gate.</p>
                </div>
                <div>
                  <span>Blockers</span>
                  <strong>{launch.notes ? "Noted" : "None"}</strong>
                  <p>{launch.notes || "No launch blockers recorded."}</p>
                </div>
              </div>
              <div className="field">
                <label htmlFor="launchStatus">Launch status</label>
                <select className="select" id="launchStatus" name="launchStatus" defaultValue={launch.status}>
                  {launchStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status.toLowerCase().replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              </div>
              <div className="module-grid">
                {launch.items.map((item) => (
                  <label className="module-toggle" key={item.key}>
                    <input type="checkbox" name="launchItem" value={item.key} defaultChecked={item.complete} />
                    <span>
                      {item.label}
                      <small style={{ display: "block", color: "var(--muted)", marginTop: 4 }}>
                        {item.detail} {item.computedComplete ? "Auto-passing." : "Needs review."}
                      </small>
                    </span>
                  </label>
                ))}
              </div>
              <div className="field">
                <label htmlFor="launchNotes">Launch blockers / notes</label>
                <textarea className="textarea" id="launchNotes" name="launchNotes" defaultValue={launch.notes} placeholder="Record blockers, final QA notes, or launch dependencies." />
              </div>
              <SubmitButton>Save launch readiness</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel danger-zone" style={{ gridColumn: "span 3" }}>
          <div className="panel-header">
            <div>
              <h2>Delete organization</h2>
              <p>Permanently remove this client workspace, its users, and all tenant-scoped records. This cannot be undone.</p>
            </div>
            <Trash2 size={20} />
          </div>
          <div className="panel-body">
            <StatefulForm action={deleteOrganizationAction} className="detail-stack">
              <input type="hidden" name="businessId" value={business.id} />
              <div className="field">
                <label htmlFor="confirmOrganizationDeletion">Type {business.name} to confirm</label>
                <input className="input" id="confirmOrganizationDeletion" name="confirmName" autoComplete="off" placeholder={business.name} required />
              </div>
              <div className="button-row" style={{ justifyContent: "flex-start" }}>
                <SubmitButton className="button danger">
                  <Trash2 size={16} />
                  Delete organization permanently
                </SubmitButton>
              </div>
            </StatefulForm>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 3" }}>
          <div className="panel-header">
            <div>
              <h2>Demo Data Cleanup</h2>
              <p>Remove only CRM, inquiry, campaign, registration, payment, and activity records marked as demo or test.</p>
            </div>
            <StatusBadge status={demoCleanup.total ? "IN_PROGRESS" : "READY_FOR_PILOT"} />
          </div>
          <div className="panel-body">
            <div className="detail-grid" style={{ marginBottom: 16 }}>
              <div>
                <span>Contacts</span>
                <strong>{demoCleanup.contacts}</strong>
                <p>Marked demo/test CRM records.</p>
              </div>
              <div>
                <span>Inquiries</span>
                <strong>{demoCleanup.inquiries}</strong>
                <p>Marked demo/test lead records.</p>
              </div>
              <div>
                <span>Campaigns</span>
                <strong>{demoCleanup.campaigns}</strong>
                <p>Marked demo/test marketing records.</p>
              </div>
              <div>
                <span>Registrations</span>
                <strong>{demoCleanup.registrations}</strong>
                <p>Marked demo/test Jete submissions.</p>
              </div>
              <div>
                <span>Payments</span>
                <strong>{demoCleanup.payments}</strong>
                <p>Marked demo/test payment records.</p>
              </div>
              <div>
                <span>Activity logs</span>
                <strong>{demoCleanup.activityLogs}</strong>
                <p>Marked demo/test activity only.</p>
              </div>
            </div>
            {demoCleanup.total ? (
              <StatefulForm action={removeDemoDataAction} className="detail-stack">
                <input type="hidden" name="businessId" value={business.id} />
                <div className="field">
                  <label htmlFor="confirmDemoCleanup">Type REMOVE DEMO DATA to confirm</label>
                  <input className="input" id="confirmDemoCleanup" name="confirm" placeholder="REMOVE DEMO DATA" />
                </div>
                <SubmitButton className="button secondary">
                  <Trash2 size={16} />
                  Remove demo data
                </SubmitButton>
              </StatefulForm>
            ) : (
              <EmptyState title="No marked demo data found" description="Real client records and unmarked seed data will remain untouched." />
            )}
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Client settings</h2>
              <p>Edit only the core account controls Mayke needs during MVP testing.</p>
            </div>
            <Link className="button secondary" href={`/admin/clients/${business.id}/dashboard`}>
              <ExternalLink size={16} />
              View client dashboard
            </Link>
          </div>
          <div className="panel-body">
            <StatefulForm action={updateAdminClientAction}>
              <input type="hidden" name="businessId" value={business.id} />
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="name">Business name</label>
                  <input className="input" id="name" name="name" defaultValue={business.name} required />
                </div>
                <div className="field">
                  <label htmlFor="businessTypeId">Business type</label>
                  <select className="select" id="businessTypeId" name="businessTypeId" defaultValue={business.businessTypeId}>
                    {businessTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="contactEmail">Primary contact</label>
                  <input className="input" id="contactEmail" name="contactEmail" type="text" inputMode="email" defaultValue={business.contactEmail ?? owner?.email ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="brandPrimary">Brand color</label>
                  <input className="input" id="brandPrimary" name="brandPrimary" type="text" defaultValue={business.brandPrimary} required />
                </div>
                <div className="field full">
                  <label htmlFor="subscriptionStatus">Account status</label>
                  <select className="select" id="subscriptionStatus" name="subscriptionStatus" defaultValue={business.subscriptionStatus}>
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.toLowerCase().replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label>Enabled modules</label>
                <div className="module-grid">
                  {moduleKeys.map((key) => (
                    <label className="module-toggle" key={key}>
                      <input type="checkbox" name="modules" value={key} defaultChecked={enabledModules.has(key)} />
                      <span>{key.toLowerCase().replaceAll("_", " ")}</span>
                    </label>
                  ))}
                </div>
              </div>

              <SubmitButton>Save client settings</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Team access</h2>
              <p>Users and pending invites scoped to this workspace.</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="profile-card">
              <span>{owner?.role.replaceAll("_", " ").toLowerCase() ?? "No owner"}</span>
              <strong>{owner?.name ?? "Unassigned"}</strong>
              <p>{business.contactEmail ?? owner?.email ?? "No contact email"}</p>
            </div>
            <div className="table-wrap" style={{ marginTop: 16 }}>
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
                  {business.users.length ? (
                    business.users.map((member) => (
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
                          {member.role === "STAFF" && member.isActive ? (
                            <StatefulForm action={deactivateStaffUserAction} className="button-row">
                              <input type="hidden" name="userId" value={member.id} />
                              <SubmitButton className="button ghost">Deactivate</SubmitButton>
                            </StatefulForm>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow columns={4} message="No users assigned yet." />
                  )}
                </tbody>
              </table>
            </div>
            <div className="table-wrap" style={{ marginTop: 16 }}>
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
                  {business.userInvites.length ? (
                    business.userInvites.map((invite) => (
                      <tr key={invite.id}>
                        <td>{invite.email}</td>
                        <td>{invite.role.replaceAll("_", " ").toLowerCase()}</td>
                        <td>
                          <StatusBadge status={invite.status} />
                        </td>
                        <td>
                          {invite.status === "PENDING" ? (
                            <StatefulForm action={revokeInviteAction} className="button-row">
                              <input type="hidden" name="inviteId" value={invite.id} />
                              <SubmitButton className="button ghost">Revoke</SubmitButton>
                            </StatefulForm>
                          ) : null}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <EmptyTableRow columns={4} message="No invites created yet." />
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Module status</h2>
              <p>Current client feature access.</p>
            </div>
          </div>
          <div className="panel-body">
            {business.modules.length ? (
              <div className="tag-row">
                {business.modules.map((module) => (
                  <span key={module.id}>
                    {module.label}: {module.enabled ? "enabled" : "off"}
                  </span>
                ))}
              </div>
            ) : (
              <EmptyState title="No modules configured" description="Saving client settings will create the module records." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Integration status</h2>
              <p>Owner-configured payment and email readiness.</p>
            </div>
            <PlugZap size={20} />
          </div>
          <div className="panel-body detail-stack">
            <div className="profile-card">
              <span>stripe connect</span>
              <strong>{business.stripeOnboardingStatus.replaceAll("_", " ")}</strong>
              <p>{business.stripeAccountId ?? "No Express account"}</p>
            </div>
            <div className="profile-card">
              <span>resend email</span>
              <strong>{business.emailVerificationStatus.replaceAll("_", " ")}</strong>
              <p>{business.emailSenderEmail ?? "No sender configured"}</p>
            </div>
            {business.integrations.length ? (
              <div className="timeline-list">
                {business.integrations.map((integration) => (
                  <article className="timeline-item" key={integration.id}>
                    <div>
                      <strong>{integration.displayName}</strong>
                      <StatusBadge status={integration.status} />
                    </div>
                    <p>{integration.accountLabel ?? integration.provider.toLowerCase()}</p>
                  </article>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Contact import</h2>
              <p>Import or export CRM contacts for this client only.</p>
            </div>
            <Download size={20} />
          </div>
          <div className="panel-body detail-stack">
            <ContactImportForm businessId={business.id} />
            <a className="button secondary" href={`/admin/clients/${business.id}/contacts/export`}>
              <Download size={16} />
              Export contacts
            </a>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Message templates</h2>
              <p>Reusable follow-up, campaign, and announcement copy for this client.</p>
            </div>
            <FileText size={20} />
          </div>
          <div className="panel-body detail-stack">
            <StatefulForm action={upsertMessageTemplateAction} className="form-grid">
              <input type="hidden" name="businessId" value={business.id} />
              <div className="field">
                <label htmlFor="template-name">Name</label>
                <input className="input" id="template-name" name="name" required />
              </div>
              <div className="field">
                <label htmlFor="template-type">Type</label>
                <select className="select" id="template-type" name="type" defaultValue="FOLLOW_UP">
                  <option value="FOLLOW_UP">Follow-up</option>
                  <option value="CAMPAIGN">Campaign</option>
                  <option value="ANNOUNCEMENT">Announcement</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="template-business-type">Business type</label>
                <select className="select" id="template-business-type" name="businessType" defaultValue={business.businessType.code}>
                  {businessTypes.map((type) => (
                    <option key={type.id} value={type.code}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="template-subject">Subject</label>
                <input className="input" id="template-subject" name="subject" required />
              </div>
              <div className="field full">
                <label htmlFor="template-body">Message body</label>
                <textarea className="textarea" id="template-body" name="body" required />
              </div>
              <SubmitButton>Create template</SubmitButton>
            </StatefulForm>

            {business.messageTemplates.length ? (
              <div className="timeline-list">
                {business.messageTemplates.map((template) => (
                  <article className="timeline-item" key={template.id}>
                    <div>
                      <strong>{template.name}</strong>
                      <StatusBadge status={template.type} />
                    </div>
                    <p>{template.subject}</p>
                    <StatefulForm action={deleteMessageTemplateAction} className="button-row">
                      <input type="hidden" name="businessId" value={business.id} />
                      <input type="hidden" name="templateId" value={template.id} />
                      <SubmitButton className="button ghost">
                        <Trash2 size={14} />
                        Delete
                      </SubmitButton>
                    </StatefulForm>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No templates yet" description="Create a template for this client's follow-ups and campaigns." />
            )}
          </div>
        </section>

        <ActivityFeed items={business.activityLogs} />
      </div>
    </main>
  );
}
