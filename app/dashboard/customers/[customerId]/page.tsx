import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ClipboardList, Mail, MessageSquareText, ReceiptText, Send, Sparkle, Tags } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ReminderForm } from "@/components/forms/ReminderForm";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { TemplateInsertSelect } from "@/components/forms/TemplateInsertSelect";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { sendCustomerFollowUpEmailAction } from "@/lib/actions";
import { requireBusinessUser } from "@/lib/auth";
import { getCustomerProfile, getMessageTemplates } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";

export default async function CustomerProfilePage({
  params
}: {
  params: Promise<{ customerId: string }>;
}) {
  const user = await requireBusinessUser();
  const { customerId } = await params;
  const [customer, templates] = await Promise.all([getCustomerProfile(user.business.id, customerId), getMessageTemplates(user.business.id)]);

  if (!customer) {
    notFound();
  }

  const revenue = customer.sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const suggestedSubject = `A quick follow-up from ${user.business.name}`;
  const suggestedBody = `Hi ${customer.name.split(" ")[0] ?? "there"},\n\nI wanted to follow up personally from ${user.business.name} and make sure you have everything you need.\n\nBest,\n${user.name}`;
  const emailReady = isEmailSendingReady(user.business);
  const timelineIcons = {
    Inquiry: ClipboardList,
    Note: MessageSquareText,
    "Follow-up": Mail,
    Campaign: Send,
    Status: Tags,
    Activity: Sparkle
  };

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/dashboard/customers">
          <ArrowLeft size={16} />
          Back to customers
        </Link>
      </div>

      <PageHeader
        eyebrow="Customer CRM"
        title={customer.name}
        description="A single customer view for inquiry history, follow-up, and revenue context."
        action={<span className="role-badge">{customer.segment}</span>}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <section className="panel metric-card">
          <span className="metric-label">Lifetime value</span>
          <strong className="metric-value">{formatCurrency(customer.lifetimeValue)}</strong>
          <span className="metric-delta">{formatCurrency(revenue)} from tracked sales</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Inquiry history</span>
          <strong className="metric-value">{customer.inquiries.length}</strong>
          <span className="metric-delta">All scoped to {user.business.name}</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Follow-ups</span>
          <strong className="metric-value">{customer.followUpEmails.length}</strong>
          <span className="metric-delta">Drafts and sent email records</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Last touch</span>
          <strong className="metric-value compact">{formatDate(customer.lastContactedAt)}</strong>
          <span className="metric-delta">{customer.source}</span>
        </section>
      </div>

      <div className="workflow-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Profile</h2>
              <p>Contact and segmentation data captured from CRM and converted inquiries.</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="profile-card">
              <span>Contact</span>
              <strong>{customer.email ?? customer.phone ?? "No contact on file"}</strong>
              <p>{customer.company ?? "Individual customer"} · {customer.source}</p>
            </div>
            <div className="tag-row" aria-label="Customer tags">
              {customer.tags.length ? customer.tags.map((tag) => <span key={tag}>{tag}</span>) : <span>No tags</span>}
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Follow-up reminder</h2>
              <p>Create a dated reminder connected to this contact.</p>
            </div>
          </div>
          <div className="panel-body">
            <ReminderForm customerId={customer.id} title={`Follow up with ${customer.name}`} />
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Activity timeline</h2>
              <p>Newest interactions across inquiries, notes, follow-ups, campaign sends, and status changes.</p>
            </div>
          </div>
          <div className="panel-body">
            {customer.activityTimeline.length ? (
              <div className="timeline-list">
                {customer.activityTimeline.map((item) => {
                  const Icon = timelineIcons[item.type as keyof typeof timelineIcons] ?? Sparkle;

                  return (
                    <article className="timeline-item" key={item.id}>
                      <div>
                        <span className="role-badge">
                          <Icon size={14} />
                          {item.type}
                        </span>
                        <span>{formatDate(item.date)}</span>
                      </div>
                      {item.href ? (
                        <Link className="table-link" href={item.href}>
                          {item.title}
                        </Link>
                      ) : (
                        <strong>{item.title}</strong>
                      )}
                      <p>{item.description}</p>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState title="No activity yet" description="Inquiries, notes, follow-ups, and campaign sends will appear here." />
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Inquiry history</h2>
              <p>Every request attached to this customer profile.</p>
            </div>
          </div>
          <div className="panel-body table-wrap">
            {customer.inquiries.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Inquiry</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Activity</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {customer.inquiries.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/inquiries/${inquiry.id}`}>
                          {inquiry.subject}
                        </Link>
                      </td>
                      <td>{inquiry.kind.toLowerCase().replaceAll("_", " ")}</td>
                      <td>
                        <StatusBadge status={inquiry.status} />
                      </td>
                      <td>
                        {inquiry._count.notes} notes · {inquiry._count.followUps} follow-ups
                      </td>
                      <td>{formatDate(inquiry.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No inquiry history" description="Converted inquiries and customer-linked requests will appear here." />
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Follow-up timeline</h2>
              <p>Saved drafts and sent email records for this customer.</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body">
            {customer.followUpEmails.length ? (
              <div className="timeline-list">
                {customer.followUpEmails.map((followUp) => (
                  <article className="timeline-item" key={followUp.id}>
                    <div>
                      {followUp.inquiry ? (
                        <Link className="table-link" href={`/dashboard/inquiries/${followUp.inquiry.id}`}>
                          {followUp.subject}
                        </Link>
                      ) : (
                        <strong>{followUp.subject}</strong>
                      )}
                      <StatusBadge status={followUp.status} />
                    </div>
                    <p>
                      {followUp.inquiry?.subject ?? "Customer follow-up"} · {followUp.createdBy?.name ?? "Mayke Motion"} ·{" "}
                      {formatDate(followUp.sentAt ?? followUp.createdAt)}
                      {followUp.providerMessageId ? ` · ${followUp.providerMessageId}` : ""}
                      {followUp.errorMessage ? ` · ${followUp.errorMessage}` : ""}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No follow-up records" description="Follow-up drafts and sent messages from inquiry pages will appear here." />
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Send follow-up</h2>
              <p>Send a direct email to this customer through the configured provider.</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body">
            {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
            <StatefulForm action={sendCustomerFollowUpEmailAction}>
              <input type="hidden" name="customerId" value={customer.id} />
              <TemplateInsertSelect templates={templates.filter((template) => template.type === "FOLLOW_UP")} />
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="toEmail">Recipient</label>
                  <input className="input" id="toEmail" name="toEmail" type="text" inputMode="email" defaultValue={customer.email ?? ""} required />
                </div>
                <div className="field">
                  <label htmlFor="subject">Subject</label>
                  <input className="input" id="subject" name="subject" defaultValue={suggestedSubject} required />
                </div>
                <input type="hidden" name="template" value="saved-template" />
                <div className="field full">
                  <label htmlFor="customerFollowUpBody">Message</label>
                  <textarea className="textarea email-composer" id="customerFollowUpBody" name="body" defaultValue={suggestedBody} required />
                </div>
              </div>
              <div className="button-row">
                <SubmitButton className="button secondary" name="intent" value="DRAFT">
                  Save draft
                </SubmitButton>
                <SubmitButton name="intent" value="SEND" disabled={!emailReady}>
                  Send email
                </SubmitButton>
              </div>
            </StatefulForm>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Sales context</h2>
              <p>Recent purchases or orders attached to this customer.</p>
            </div>
            <ReceiptText size={20} />
          </div>
          <div className="panel-body">
            {customer.sales.length ? (
              <div className="timeline-list">
                {customer.sales.slice(0, 5).map((sale) => (
                  <article className="timeline-item" key={sale.id}>
                    <div>
                      <strong>{sale.saleNumber}</strong>
                      <StatusBadge status={sale.status} />
                    </div>
                    <p>
                      {formatCurrency(sale.total)} · {sale.channel} · {formatDate(sale.placedAt)}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No tracked sales" description="Sales imported from Stripe, Shopify, Toast, or Square will appear here later." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
