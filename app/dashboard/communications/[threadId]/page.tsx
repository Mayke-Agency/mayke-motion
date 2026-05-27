import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Mail, MessageSquarePlus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { ReminderForm } from "@/components/forms/ReminderForm";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { TemplateInsertSelect } from "@/components/forms/TemplateInsertSelect";
import { SubmitButton } from "@/components/ui/SubmitButton";
import {
  addConversationNoteAction,
  addInquiryNoteAction,
  saveFollowUpEmailAction,
  sendCustomerFollowUpEmailAction,
  updateInquiryStatusAction
} from "@/lib/actions";
import { requireBusinessUser } from "@/lib/auth";
import { getCommunicationDetail, getMessageTemplates } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";

export default async function CommunicationDetailPage({
  params
}: {
  params: Promise<{ threadId: string }>;
}) {
  const user = await requireBusinessUser();
  const { threadId } = await params;
  const [detail, templates] = await Promise.all([getCommunicationDetail(user.business.id, threadId), getMessageTemplates(user.business.id)]);
  const followUpTemplates = templates.filter((template) => template.type === "FOLLOW_UP");
  const emailReady = isEmailSendingReady(user.business);

  if (!detail) {
    notFound();
  }

  if (detail.type === "inquiry") {
    const inquiry = detail.inquiry;
    const contactName = inquiry.customer?.name ?? inquiry.leadName ?? "New lead";
    const contactEmail = inquiry.customer?.email ?? inquiry.leadEmail ?? "";
    const suggestedBody = `Hi ${contactName.split(" ")[0] ?? "there"},\n\nThank you for reaching out to ${user.business.name}. I wanted to follow up on ${inquiry.subject}.\n\nBest,\n${user.name}`;

    return (
      <>
        <BackLink />
        <PageHeader eyebrow="Message detail" title={inquiry.subject} description={`${contactName} · ${formatDate(inquiry.createdAt)}`} action={<StatusBadge status={inquiry.status === "IN_PROGRESS" ? "OPEN" : inquiry.status} />} />
        <div className="workflow-grid">
          <MessagePanel title="Inbound message" meta={inquiry.source} body={inquiry.message} />
          <ReminderPanel customerId={inquiry.customerId} inquiryId={inquiry.id} title={`Follow up: ${inquiry.subject}`} />
          <StatusPanel inquiryId={inquiry.id} status={inquiry.status} />
          <InquiryNotes inquiryId={inquiry.id} notes={inquiry.notes} />
          <InquiryReply inquiryId={inquiry.id} toEmail={contactEmail} subject={`Re: ${inquiry.subject}`} body={suggestedBody} templates={followUpTemplates} emailReady={emailReady} />
          <FollowUpHistory followUps={inquiry.followUps} />
        </div>
      </>
    );
  }

  if (detail.type === "followup") {
    const followUp = detail.followUp;
    const customer = followUp.customer ?? followUp.inquiry?.customer ?? null;
    const contactName = customer?.name ?? followUp.toEmail;
    const suggestedBody = `Hi ${contactName.split(" ")[0] ?? "there"},\n\nFollowing up on our last message from ${user.business.name}.\n\nBest,\n${user.name}`;

    return (
      <>
        <BackLink />
        <PageHeader eyebrow="Outbound detail" title={followUp.subject} description={`To ${followUp.toEmail} · ${formatDate(followUp.sentAt ?? followUp.createdAt)}`} action={<StatusBadge status={followUp.status} />} />
        <div className="workflow-grid">
          <MessagePanel title="Outbound message" meta={followUp.createdBy?.name ?? "Mayke Motion"} body={followUp.body} />
          <ReminderPanel customerId={customer?.id} inquiryId={followUp.inquiry?.id} title={`Follow up: ${followUp.subject}`} />
          {followUp.inquiry ? <StatusPanel inquiryId={followUp.inquiry.id} status={followUp.inquiry.status} /> : null}
          {followUp.inquiry ? <InquiryNotes inquiryId={followUp.inquiry.id} notes={followUp.inquiry.notes} /> : null}
          {customer?.email ? <CustomerReply customerId={customer.id} toEmail={customer.email} subject={`Re: ${followUp.subject}`} body={suggestedBody} templates={followUpTemplates} emailReady={emailReady} /> : <NoReplyEmail />}
          {followUp.inquiry ? <FollowUpHistory followUps={followUp.inquiry.followUps} /> : <FollowUpHistory followUps={followUp.customer?.followUpEmails ?? [followUp]} />}
        </div>
      </>
    );
  }

  if (detail.type === "conversation") {
    const conversation = detail.conversation;
    const lastInbound = conversation.messages.find((message) => message.direction === "INBOUND");
    const contactEmail = conversation.customer?.email ?? "";

    return (
      <>
        <BackLink />
        <PageHeader eyebrow="Conversation detail" title={conversation.subject} description={`${conversation.customer?.name ?? "Unassigned contact"} · ${formatDate(conversation.updatedAt)}`} action={<StatusBadge status={conversation.status} />} />
        <div className="workflow-grid">
          <MessagePanel title="Latest inbound message" meta={lastInbound?.channel.toLowerCase() ?? "conversation"} body={lastInbound?.body ?? "No inbound message body recorded."} />
          <ReminderPanel customerId={conversation.customerId} messageId={lastInbound?.id} title={`Follow up: ${conversation.subject}`} />
          <ConversationNotes conversationId={conversation.id} messages={conversation.messages} />
          {conversation.customer && contactEmail ? (
            <CustomerReply customerId={conversation.customer.id} toEmail={contactEmail} subject={`Re: ${conversation.subject}`} body={`Hi ${conversation.customer.name.split(" ")[0] ?? "there"},\n\nFollowing up on ${conversation.subject}.\n\nBest,\n${user.name}`} templates={followUpTemplates} emailReady={emailReady} />
          ) : (
            <NoReplyEmail />
          )}
        </div>
      </>
    );
  }

  const message = detail.message;

  return (
    <>
      <BackLink />
      <PageHeader eyebrow="Message detail" title={message.subject ?? "Inbound message"} description={`${message.customer?.name ?? "Unassigned contact"} · ${formatDate(message.createdAt)}`} action={<StatusBadge status={message.direction === "INBOUND" ? "NEW" : "SENT"} />} />
      <div className="workflow-grid">
        <MessagePanel title="Message" meta={message.channel.toLowerCase()} body={message.body} />
        <ReminderPanel customerId={message.customerId} messageId={message.id} title={`Follow up: ${message.subject ?? "message"}`} />
        {message.customer?.email ? (
          <CustomerReply customerId={message.customer.id} toEmail={message.customer.email} subject={`Re: ${message.subject ?? "your message"}`} body={`Hi ${message.customer.name.split(" ")[0] ?? "there"},\n\nFollowing up on your message to ${user.business.name}.\n\nBest,\n${user.name}`} templates={followUpTemplates} emailReady={emailReady} />
        ) : (
          <NoReplyEmail />
        )}
      </div>
    </>
  );
}

function ReminderPanel({ title, customerId, inquiryId, messageId }: { title: string; customerId?: string | null; inquiryId?: string | null; messageId?: string | null }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Follow-up reminder</h2>
          <p>Create a dated reminder connected to this message.</p>
        </div>
      </div>
      <div className="panel-body">
        {customerId || inquiryId || messageId ? (
          <ReminderForm title={title} customerId={customerId} inquiryId={inquiryId} messageId={messageId} />
        ) : (
          <EmptyState title="No reminder target" description="Connect this message to a customer before creating reminders." />
        )}
      </div>
    </section>
  );
}

function BackLink() {
  return (
    <div style={{ marginBottom: 18 }}>
      <Link className="button ghost" href="/dashboard/communications">
        <ArrowLeft size={16} />
        Back to communications
      </Link>
    </div>
  );
}

function MessagePanel({ title, meta, body }: { title: string; meta: string; body: string }) {
  return (
    <section className="panel workflow-main">
      <div className="panel-header">
        <div>
          <h2>{title}</h2>
          <p>{meta}</p>
        </div>
        <Mail size={20} />
      </div>
      <div className="panel-body">
        <div className="quote-block">{body}</div>
      </div>
    </section>
  );
}

function StatusPanel({ inquiryId, status }: { inquiryId: string; status: string }) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Status</h2>
          <p>Keep the communication state current.</p>
        </div>
      </div>
      <div className="panel-body">
        <StatefulForm action={updateInquiryStatusAction}>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <div className="field">
            <label htmlFor="status">Status</label>
            <select className="select" id="status" name="status" defaultValue={status}>
              <option value="NEW">New</option>
              <option value="IN_PROGRESS">Open</option>
              <option value="FOLLOWED_UP">Followed up</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <SubmitButton>Update status</SubmitButton>
        </StatefulForm>
      </div>
    </section>
  );
}

function InquiryNotes({
  inquiryId,
  notes
}: {
  inquiryId: string;
  notes: { id: string; body: string; createdAt: Date; author?: { name: string } | null }[];
}) {
  return (
    <section className="panel workflow-main">
      <div className="panel-header">
        <div>
          <h2>Internal notes</h2>
          <p>Private team context for this message.</p>
        </div>
        <MessageSquarePlus size={20} />
      </div>
      <div className="panel-body detail-stack">
        <StatefulForm action={addInquiryNoteAction}>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <div className="field">
            <label htmlFor="body">New note</label>
            <textarea className="textarea" id="body" name="body" placeholder="Add internal context or next steps." required />
          </div>
          <SubmitButton>Add note</SubmitButton>
        </StatefulForm>
        {notes.length ? (
          <div className="timeline-list">
            {notes.map((note) => (
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
          <EmptyState title="No notes yet" description="Add a note before replying or closing the loop." />
        )}
      </div>
    </section>
  );
}

function ConversationNotes({
  conversationId,
  messages
}: {
  conversationId: string;
  messages: { id: string; body: string; subject: string | null; direction: string; createdAt: Date }[];
}) {
  return (
    <section className="panel workflow-main">
      <div className="panel-header">
        <div>
          <h2>Message history</h2>
          <p>Inbound, outbound, and internal notes.</p>
        </div>
      </div>
      <div className="panel-body detail-stack">
        <StatefulForm action={addConversationNoteAction}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <div className="field">
            <label htmlFor="conversation-note">Internal note</label>
            <textarea className="textarea" id="conversation-note" name="body" placeholder="Add private team context." required />
          </div>
          <SubmitButton>Add note</SubmitButton>
        </StatefulForm>
        {messages.length ? (
          <div className="timeline-list">
            {messages.map((message) => (
              <article className="timeline-item" key={message.id}>
                <div>
                  <strong>{message.subject ?? message.direction.toLowerCase()}</strong>
                  <StatusBadge status={message.direction} />
                </div>
                <p>{formatDate(message.createdAt)}</p>
                <p>{message.body}</p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No messages yet" description="Conversation messages will appear here." />
        )}
      </div>
    </section>
  );
}

function InquiryReply({ inquiryId, toEmail, subject, body, templates, emailReady }: { inquiryId: string; toEmail: string; subject: string; body: string; templates: { id: string; name: string; subject: string; body: string }[]; emailReady: boolean }) {
  return (
    <section className="panel workflow-main">
      <div className="panel-header">
        <div>
          <h2>Reply</h2>
          <p>Draft or send a follow-up email.</p>
        </div>
      </div>
      <div className="panel-body">
        {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
        <StatefulForm action={saveFollowUpEmailAction}>
          <input type="hidden" name="inquiryId" value={inquiryId} />
          <ReplyFields toEmail={toEmail} subject={subject} body={body} templates={templates} emailReady={emailReady} />
        </StatefulForm>
      </div>
    </section>
  );
}

function CustomerReply({ customerId, toEmail, subject, body, templates, emailReady }: { customerId: string; toEmail: string; subject: string; body: string; templates: { id: string; name: string; subject: string; body: string }[]; emailReady: boolean }) {
  return (
    <section className="panel workflow-main">
      <div className="panel-header">
        <div>
          <h2>Reply</h2>
          <p>Draft or send a customer follow-up email.</p>
        </div>
      </div>
      <div className="panel-body">
        {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
        <StatefulForm action={sendCustomerFollowUpEmailAction}>
          <input type="hidden" name="customerId" value={customerId} />
          <ReplyFields toEmail={toEmail} subject={subject} body={body} templates={templates} emailReady={emailReady} />
        </StatefulForm>
      </div>
    </section>
  );
}

function ReplyFields({ toEmail, subject, body, templates, emailReady }: { toEmail: string; subject: string; body: string; templates: { id: string; name: string; subject: string; body: string }[]; emailReady: boolean }) {
  return (
    <>
      <TemplateInsertSelect templates={templates} />
      <div className="form-grid">
        <div className="field">
          <label htmlFor="toEmail">Recipient</label>
          <input className="input" id="toEmail" name="toEmail" type="email" defaultValue={toEmail} required />
        </div>
        <div className="field">
          <label htmlFor="subject">Subject</label>
          <input className="input" id="subject" name="subject" defaultValue={subject} required />
        </div>
        <input type="hidden" name="template" value="communication-hub" />
        <div className="field full">
          <label htmlFor="followUpBody">Message</label>
          <textarea className="textarea email-composer" id="followUpBody" name="body" defaultValue={body} required />
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
    </>
  );
}

function FollowUpHistory({
  followUps
}: {
  followUps: { id: string; subject: string; toEmail: string; status: string; sentAt: Date | null; createdAt: Date; createdBy?: { name: string } | null }[];
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Message history</h2>
          <p>Follow-ups connected to this contact.</p>
        </div>
      </div>
      <div className="panel-body">
        {followUps.length ? (
          <div className="timeline-list">
            {followUps.map((followUp) => (
              <article className="timeline-item" key={followUp.id}>
                <div>
                  <strong>{followUp.subject}</strong>
                  <StatusBadge status={followUp.status} />
                </div>
                <p>
                  To {followUp.toEmail} · {followUp.createdBy?.name ?? "Mayke Motion"} · {formatDate(followUp.sentAt ?? followUp.createdAt)}
                </p>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState title="No follow-up history yet" description="Replies and drafts will appear here." />
        )}
      </div>
    </section>
  );
}

function NoReplyEmail() {
  return (
    <section className="panel">
      <div className="panel-body">
        <EmptyState title="No recipient email" description="Add an email to the connected customer profile before sending a reply." />
      </div>
    </section>
  );
}
