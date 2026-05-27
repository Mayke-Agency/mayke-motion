import { MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireBusinessUser } from "@/lib/auth";
import { submitPilotFeedbackAction } from "@/lib/actions";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const feedbackTypes = [
  ["BUG", "Bug"],
  ["CONFUSING", "Confusing"],
  ["FEATURE_REQUEST", "Feature Request"],
  ["GENERAL", "General"]
];
const priorities = ["LOW", "MEDIUM", "HIGH", "URGENT"];

export default async function FeedbackPage() {
  const user = await requireBusinessUser();
  const isPilot = ["READY_FOR_PILOT", "LIVE"].includes(user.business.launchStatus);
  const feedback = await prisma.pilotFeedback.findMany({
    where: {
      businessId: user.business.id,
      submittedById: user.id
    },
    include: {
      submittedBy: {
        select: {
          name: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  });

  return (
    <>
      <PageHeader
        eyebrow="Pilot feedback"
        title="Tell Mayke what needs attention"
        description="Share bugs, confusing moments, feature requests, and general pilot notes without leaving the workspace."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Submit feedback</h2>
              <p>Feedback is open for pilot and live client workspaces.</p>
            </div>
            <MessageSquareText size={20} />
          </div>
          <div className="panel-body">
            {isPilot ? (
              <StatefulForm action={submitPilotFeedbackAction}>
                <div className="form-grid">
                  <div className="field">
                    <label htmlFor="type">Type</label>
                    <select className="select" id="type" name="type" defaultValue="BUG">
                      {feedbackTypes.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="priority">Priority</label>
                    <select className="select" id="priority" name="priority" defaultValue="MEDIUM">
                      {priorities.map((priority) => (
                        <option key={priority} value={priority}>
                          {priority.toLowerCase()}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field full">
                    <label htmlFor="area">Page / area</label>
                    <input className="input" id="area" name="area" placeholder="Dashboard, CRM, registrations..." required />
                  </div>
                  <div className="field full">
                    <label htmlFor="message">Message</label>
                    <textarea className="textarea" id="message" name="message" placeholder="What happened, what felt confusing, or what would help?" required />
                  </div>
                </div>
                <SubmitButton>Send feedback</SubmitButton>
              </StatefulForm>
            ) : (
              <EmptyState title="Feedback opens during pilot" description="Mayke can enable pilot feedback by moving this workspace to Ready for Pilot or Live." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Your submissions</h2>
              <p>Feedback from this workspace only.</p>
            </div>
          </div>
          <div className="panel-body">
            {feedback.length ? (
              <div className="timeline-list">
                {feedback.map((item) => (
                  <article className="timeline-item" key={item.id}>
                    <div>
                      <strong>{item.area}</strong>
                      <StatusBadge status={item.status} />
                    </div>
                    <p>
                      {item.type.toLowerCase().replaceAll("_", " ")} · {item.priority.toLowerCase()} · {formatDate(item.createdAt)}
                    </p>
                    <p>{item.message}</p>
                    {item.adminNotes ? <span>Mayke note: {item.adminNotes}</span> : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No feedback yet" description="Submitted pilot feedback will appear here." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
