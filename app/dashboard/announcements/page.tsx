import { Megaphone } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveAnnouncementAction } from "@/lib/announcement-actions";
import { getAnnouncements, getStudioClasses } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";

export default async function AnnouncementsPage() {
  const user = await requireBusinessUser();

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return (
      <>
        <PageHeader eyebrow="Announcements" title="Announcements" description="Announcements are currently tailored for education and studio communication." />
        <EmptyState title="Not enabled for this workspace" description="Use Marketing for campaign announcements on this business type." />
      </>
    );
  }

  const [announcements, classes] = await Promise.all([getAnnouncements(user.business.id), getStudioClasses(user.business.id)]);
  const emailReady = isEmailSendingReady(user.business);

  return (
    <>
      <PageHeader
        eyebrow="Parent and student communication"
        title="Announcements"
        description="Draft recital reminders, schedule updates, registration nudges, and studio-wide communication."
      />

      <div className="grid cols-3">
      <section className="panel" style={{ gridColumn: "span 2" }}>
        <div className="panel-header">
          <div>
            <h2>Announcement board</h2>
            <p>Drafts and sent studio announcements.</p>
          </div>
          <Megaphone size={20} />
        </div>
        <div className="panel-body">
          {announcements.length ? (
            <div className="timeline-list">
              {announcements.map((announcement) => (
                <article className="timeline-item" key={announcement.id}>
                  <div>
                    <strong>{announcement.title}</strong>
                    <StatusBadge status={announcement.status} />
                  </div>
                  <p>{announcement.body}</p>
                  <p>
                    {announcement.audience} · {announcement.channel.toLowerCase()} · {formatDate(announcement.scheduledAt ?? announcement.createdAt)}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No announcements" description="Recital, registration, and studio-wide announcement drafts will appear here." />
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Create announcement</h2>
            <p>Send email to families by class, enrollment, or payment state.</p>
          </div>
        </div>
        <div className="panel-body">
          {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
          <StatefulForm action={saveAnnouncementAction}>
            <div className="field">
              <label htmlFor="audience">Audience</label>
              <select className="select" id="audience" name="audience" defaultValue="ALL_FAMILIES" required>
                <option value="ALL_FAMILIES">All families</option>
                <option value="SPECIFIC_CLASS">Specific class</option>
                <option value="ACTIVE_STUDENTS">Active students</option>
                <option value="WAITLISTED_STUDENTS">Waitlisted students</option>
                <option value="UNPAID_FAMILIES">Unpaid families</option>
              </select>
            </div>
            <div className="field">
              <label htmlFor="classId">Class for specific-class audience</label>
              <select className="select" id="classId" name="classId" defaultValue="">
                <option value="">No class selected</option>
                {classes.map((studioClass) => (
                  <option value={studioClass.id} key={studioClass.id}>
                    {studioClass.className}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="subject">Subject</label>
              <input className="input" id="subject" name="subject" placeholder="Studio reminder" required />
            </div>
            <div className="field">
              <label htmlFor="body">Message</label>
              <textarea className="textarea email-composer" id="body" name="body" placeholder="Write a polished update for families." required />
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
      </div>
    </>
  );
}
