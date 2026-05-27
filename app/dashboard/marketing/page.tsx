import Link from "next/link";
import { Megaphone, Pencil, Plus } from "lucide-react";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { CampaignSendForm } from "@/components/forms/CampaignSendForm";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { TemplateInsertSelect } from "@/components/forms/TemplateInsertSelect";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCampaignAction, sendCampaignAction } from "@/lib/actions";
import { getCustomers, getMarketing, getMessageTemplates } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";
import { getSegmentCounts } from "@/lib/segments";

export default async function MarketingPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;
  const [campaigns, customers, templates] = await Promise.all([getMarketing(user.business.id), getCustomers(user.business.id), getMessageTemplates(user.business.id)]);
  const segmentCounts = getSegmentCounts(customers, user.business.businessType.code);
  const editingCampaign = params.edit ? campaigns.find((campaign) => campaign.id === params.edit) : null;
  const selectedAudience = segmentCounts.find((segment) => segment.label === editingCampaign?.audience)?.key ?? "all";
  const emailReady = isEmailSendingReady(user.business);

  return (
    <>
      <PageHeader
        eyebrow="Lifecycle marketing"
        title="Campaigns"
        description="Build email and SMS campaigns for customer retention, launch moments, reservations, and high-value follow-up."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Campaign performance</h2>
              <p>Draft, ready, and sent campaign records scoped to this workspace.</p>
            </div>
            <Megaphone size={20} />
          </div>
          <div className="panel-body table-wrap">
            {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
            <table className="data-table">
              <thead>
                <tr>
                  <th>Campaign</th>
                  <th>Channel</th>
                  <th>Audience</th>
                  <th>Recipients</th>
                  <th>Status</th>
                  <th>Sent</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {campaigns.length ? (
                  campaigns.map((campaign) => {
                    const segmentCount = segmentCounts.find((segment) => segment.label === campaign.audience)?.count ?? 0;
                    const sentCount = campaign.events.filter((event) => event.status === "SENT").length;
                    const failedCount = campaign.events.filter((event) => event.status === "FAILED").length;
                    const recipientCount = campaign.status === "SENT" ? campaign.events.length : segmentCount;

                    return (
                      <tr key={campaign.id}>
                        <td>
                          <strong>{campaign.name}</strong>
                          <div style={{ color: "var(--muted)", marginTop: 4 }}>{campaign.subject}</div>
                        </td>
                        <td>{campaign.channel.replace("_", " + ")}</td>
                        <td>{campaign.audience}</td>
                        <td>
                          {recipientCount}
                          {campaign.status === "SENT" ? (
                            <div style={{ color: "var(--muted)", marginTop: 4 }}>
                              {sentCount} sent · {failedCount} failed
                            </div>
                          ) : null}
                        </td>
                        <td>
                          <StatusBadge status={campaign.status} />
                        </td>
                        <td>{formatDate(campaign.sentAt)}</td>
                        <td>
                          <div className="button-row" style={{ justifyContent: "flex-start" }}>
                            <Link className="button ghost" href={`/dashboard/marketing?edit=${campaign.id}`}>
                              <Pencil size={14} />
                              Edit
                            </Link>
                            {campaign.status !== "SENT" ? (
                              <CampaignSendForm
                                action={sendCampaignAction}
                                campaignId={campaign.id}
                                campaignName={campaign.name}
                                emailReady={emailReady}
                                recipientCount={recipientCount}
                              />
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <EmptyTableRow columns={7} message="No campaigns have been created yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{editingCampaign ? "Edit campaign" : "Campaign builder"}</h2>
              <p>Save a draft against one of the current customer segments.</p>
            </div>
          </div>
          <div className="panel-body">
            <StatefulForm action={createCampaignAction}>
              {editingCampaign ? <input type="hidden" name="campaignId" value={editingCampaign.id} /> : null}
              <TemplateInsertSelect templates={templates.filter((template) => template.type === "CAMPAIGN")} />
              <div className="field">
                <label htmlFor="name">Campaign name</label>
                <input className="input" id="name" name="name" placeholder="VIP spring push" defaultValue={editingCampaign?.name ?? ""} required />
              </div>
              <div className="field">
                <label htmlFor="channel">Channel</label>
                <select className="select" id="channel" name="channel" defaultValue={editingCampaign?.channel ?? "EMAIL"}>
                  <option value="EMAIL">Email</option>
                  <option value="SMS">SMS</option>
                  <option value="EMAIL_SMS">Email + SMS</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="audience">Audience</label>
                <select className="select" id="audience" name="audience" defaultValue={selectedAudience} required>
                  {segmentCounts.map((segment) => (
                    <option key={segment.key} value={segment.key}>
                      {segment.label} ({segment.count})
                    </option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor="status">Status</label>
                <select className="select" id="status" name="status" defaultValue={editingCampaign?.status === "SENT" ? "SENT" : editingCampaign?.status === "READY" ? "READY" : "DRAFT"}>
                  <option value="DRAFT">Draft</option>
                  <option value="READY">Ready</option>
                  {editingCampaign?.status === "SENT" ? <option value="SENT">Sent</option> : null}
                </select>
              </div>
              <div className="field">
                <label htmlFor="subject">Subject</label>
                <input className="input" id="subject" name="subject" defaultValue={editingCampaign?.subject ?? ""} required />
              </div>
              <div className="field">
                <label htmlFor="body">Message</label>
                <textarea className="textarea" id="body" name="body" defaultValue={editingCampaign?.body ?? ""} required />
              </div>
              <SubmitButton>
                <Plus size={16} />
                {editingCampaign ? "Save campaign" : "Save draft"}
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Preview</h2>
              <p>{editingCampaign ? editingCampaign.audience : "Choose a segment and draft the message."}</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="quote-block">
              <strong>{editingCampaign?.subject ?? "Subject line preview"}</strong>
              <p style={{ marginBottom: 0 }}>{editingCampaign?.body ?? "Your campaign message preview will appear here when editing an existing draft."}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
