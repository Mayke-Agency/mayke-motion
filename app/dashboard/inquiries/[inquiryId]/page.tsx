import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageSquarePlus, UserRoundPlus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ReminderForm } from "@/components/forms/ReminderForm";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { TemplateInsertSelect } from "@/components/forms/TemplateInsertSelect";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  addInquiryNoteAction,
  convertInquiryToCustomerAction,
  saveFollowUpEmailAction,
  updateInquiryStatusAction
} from "@/lib/actions";
import { requireBusinessUser } from "@/lib/auth";
import { getInquiryDetail, getMessageTemplates } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";

export default async function InquiryDetailPage({
  params
}: {
  params: Promise<{ inquiryId: string }>;
}) {
  const user = await requireBusinessUser();
  const { inquiryId } = await params;
  const [inquiry, templates] = await Promise.all([getInquiryDetail(user.business.id, inquiryId), getMessageTemplates(user.business.id)]);

  if (!inquiry) {
    notFound();
  }

  const contactName = inquiry.customer?.name ?? inquiry.leadName ?? "New lead";
  const contactEmail = inquiry.customer?.email ?? inquiry.leadEmail ?? "";
  const contactPhone = inquiry.customer?.phone ?? inquiry.leadPhone ?? "";
  const suggestedSubject = `Re: ${inquiry.subject}`;
  const suggestedBody = `Hi ${contactName.split(" ")[0] ?? "there"},\n\nThank you for reaching out to ${user.business.name}. I wanted to follow up on your request: ${inquiry.subject}.\n\n${inquiry.message}\n\nBest,\n${user.name}`;
  const emailReady = isEmailSendingReady(user.business);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/dashboard/inquiries">
          <ArrowLeft size={16} />
          Back to inquiries
        </Link>
      </div>

      <PageHeader
        eyebrow="Inquiry workflow"
        title={inquiry.subject}
        description="Review the request, keep internal context, convert qualified leads, and record follow-up from one place."
        action={<StatusBadge status={inquiry.status} />}
      />

      <div className="workflow-grid">
        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Request detail</h2>
              <p>
                {inquiry.kind.toLowerCase().replaceAll("_", " ")} from {inquiry.source} · {formatDate(inquiry.createdAt)}
              </p>
            </div>
            {inquiry.value ? <span className="stat-pill">{formatCurrency(inquiry.value)}</span> : null}
          </div>
          <div className="panel-body detail-stack">
            <div className="quote-block">{inquiry.message}</div>
            <div className="detail-grid">
              <div>
                <span>Contact</span>
                <strong>{contactName}</strong>
                <p>{contactEmail || contactPhone || "No contact detail captured"}</p>
              </div>
              <div>
                <span>Requested for</span>
                <strong>{formatDate(inquiry.requestedAt)}</strong>
                <p>{inquiry.customer ? "Connected to CRM profile" : "Lead is not yet converted"}</p>
              </div>
              <div>
                <span>Assigned</span>
                <strong>{inquiry.assignedTo ?? "Unassigned"}</strong>
                <p>{inquiry.convertedAt ? `Converted ${formatDate(inquiry.convertedAt)}` : "Ready for qualification"}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Follow-up reminder</h2>
              <p>Create a dated reminder connected to this inquiry.</p>
            </div>
          </div>
          <div className="panel-body">
            <ReminderForm customerId={inquiry.customerId} inquiryId={inquiry.id} title={`Follow up: ${inquiry.subject}`} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Status</h2>
              <p>Move the inquiry as the conversation progresses.</p>
            </div>
          </div>
          <div className="panel-body">
            <StatefulForm action={updateInquiryStatusAction}>
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <div className="field">
                <label htmlFor="status">Pipeline status</label>
                <select className="select" id="status" name="status" defaultValue={inquiry.status}>
                  <option value="NEW">New</option>
                  <option value="IN_PROGRESS">In progress</option>
                  <option value="FOLLOWED_UP">Followed up</option>
                  <option value="CLOSED">Closed</option>
                </select>
              </div>
              <SubmitButton>Update status</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Internal notes</h2>
              <p>Shared context for owners and staff members.</p>
            </div>
            <MessageSquarePlus size={20} />
          </div>
          <div className="panel-body detail-stack">
            <StatefulForm action={addInquiryNoteAction}>
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <div className="field">
                <label htmlFor="body">New note</label>
                <textarea className="textarea" id="body" name="body" placeholder="Add context, next steps, objections, or service notes." required />
              </div>
              <SubmitButton>Add note</SubmitButton>
            </StatefulForm>

            {inquiry.notes.length ? (
              <div className="timeline-list">
                {inquiry.notes.map((note) => (
                  <article className="timeline-item" key={note.id}>
                    <div>
                      <strong>{note.author?.name ?? "Mayke Motion"}</strong>
                      <span>{formatDate(note.createdAt)}</span>
                    </div>
                    <p>{note.body}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No notes yet" description="Add the first internal note so the team has context before follow-up." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>CRM conversion</h2>
              <p>{inquiry.customer ? "This inquiry is linked to a customer profile." : "Convert the lead when it is qualified."}</p>
            </div>
            <UserRoundPlus size={20} />
          </div>
          <div className="panel-body">
            {inquiry.customer ? (
              <div className="profile-card">
                <span>Customer profile</span>
                <strong>{inquiry.customer.name}</strong>
                <p>{inquiry.customer.email ?? inquiry.customer.phone ?? "No contact on file"}</p>
                <Link className="button secondary" href={`/dashboard/customers/${inquiry.customer.id}`}>
                  View profile
                </Link>
              </div>
            ) : (
              <StatefulForm action={convertInquiryToCustomerAction}>
                <input type="hidden" name="inquiryId" value={inquiry.id} />
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input className="input" id="name" name="name" defaultValue={inquiry.leadName ?? ""} required />
                </div>
                <div className="field">
                  <label htmlFor="email">Email</label>
                  <input className="input" id="email" name="email" type="text" inputMode="email" defaultValue={inquiry.leadEmail ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="phone">Phone</label>
                  <input className="input" id="phone" name="phone" defaultValue={inquiry.leadPhone ?? ""} />
                </div>
                <div className="field">
                  <label htmlFor="segment">Segment</label>
                  <input className="input" id="segment" name="segment" defaultValue="New lead" required />
                </div>
                <div className="field">
                  <label htmlFor="source">Source</label>
                  <input className="input" id="source" name="source" defaultValue={inquiry.source} required />
                </div>
                <SubmitButton>Convert to customer</SubmitButton>
              </StatefulForm>
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Follow-up email</h2>
              <p>Draft a response or send it through the configured email provider.</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body">
            {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
            <StatefulForm action={saveFollowUpEmailAction}>
              <input type="hidden" name="inquiryId" value={inquiry.id} />
              <TemplateInsertSelect templates={templates.filter((template) => template.type === "FOLLOW_UP")} />
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="toEmail">Recipient</label>
                  <input className="input" id="toEmail" name="toEmail" type="text" inputMode="email" defaultValue={contactEmail} required />
                </div>
                <div className="field">
                  <label htmlFor="subject">Subject</label>
                  <input className="input" id="subject" name="subject" defaultValue={suggestedSubject} required />
                </div>
                <input type="hidden" name="template" value="saved-template" />
                <div className="field full">
                  <label htmlFor="followUpBody">Message</label>
                  <textarea className="textarea email-composer" id="followUpBody" name="body" defaultValue={suggestedBody} required />
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
              <h2>Follow-up history</h2>
              <p>Drafts and sent messages tied to this inquiry.</p>
            </div>
          </div>
          <div className="panel-body">
            {inquiry.followUps.length ? (
              <div className="timeline-list">
                {inquiry.followUps.map((followUp) => (
                  <article className="timeline-item" key={followUp.id}>
                    <div>
                      <strong>{followUp.subject}</strong>
                      <StatusBadge status={followUp.status} />
                    </div>
                    <p>
                      To {followUp.toEmail} · {followUp.createdBy?.name ?? "Mayke Motion"} ·{" "}
                      {formatDate(followUp.sentAt ?? followUp.createdAt)}
                      {followUp.providerMessageId ? ` · ${followUp.providerMessageId}` : ""}
                      {followUp.errorMessage ? ` · ${followUp.errorMessage}` : ""}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No follow-up yet" description="Draft or send a response to close the loop on this inquiry." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Activity history</h2>
              <p>Status changes, notes, and follow-up actions for this inquiry.</p>
            </div>
          </div>
          <div className="panel-body">
            {inquiry.activityLogs.length ? (
              <div className="timeline-list">
                {inquiry.activityLogs.map((item) => (
                  <article className="timeline-item" key={item.id}>
                    <div>
                      <strong>{item.action}</strong>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                    <p>
                      {item.actor} · {item.entity}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No activity yet" description="Notes, status changes, and follow-up drafts will appear here." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
