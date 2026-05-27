import Link from "next/link";
import { ArrowLeft, MessageSquareText } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { updatePilotFeedbackAction } from "@/lib/actions";
import { requireAdmin } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { prisma } from "@/lib/prisma";

const statuses = ["NEW", "REVIEWING", "PLANNED", "RESOLVED", "CLOSED"];

export default async function AdminFeedbackPage() {
  await requireAdmin();
  const feedback = await prisma.pilotFeedback.findMany({
    include: {
      business: {
        select: {
          id: true,
          name: true
        }
      },
      submittedBy: {
        select: {
          name: true,
          email: true
        }
      }
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }]
  });

  return (
    <main className="main">
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/admin">
          <ArrowLeft size={16} />
          Back to admin
        </Link>
      </div>

      <PageHeader
        eyebrow="Pilot feedback"
        title="Feedback inbox"
        description="Review pilot client feedback, assign a status, and keep internal Mayke notes."
        action={<MessageSquareText size={22} />}
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>All client feedback</h2>
            <p>Feedback across pilot and live workspaces.</p>
          </div>
          <StatusBadge status={`${feedback.length} items`} />
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
                    {item.business.name} · {item.type.toLowerCase().replaceAll("_", " ")} · {item.priority.toLowerCase()} · {formatDate(item.createdAt)}
                  </p>
                  <p>{item.message}</p>
                  <span>
                    Submitted by {item.submittedBy?.name ?? "Unknown"} {item.submittedBy?.email ? `(${item.submittedBy.email})` : ""}
                  </span>
                  <StatefulForm action={updatePilotFeedbackAction} className="form-stack" key={`${item.id}-${item.status}-${item.adminNotes ?? ""}`}>
                    <input type="hidden" name="feedbackId" value={item.id} />
                    <div className="form-grid">
                      <div className="field">
                        <label htmlFor={`status-${item.id}`}>Status</label>
                        <select className="select" id={`status-${item.id}`} name="status" defaultValue={item.status}>
                          {statuses.map((status) => (
                            <option key={status} value={status}>
                              {status.toLowerCase().replaceAll("_", " ")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field full">
                        <label htmlFor={`notes-${item.id}`}>Internal admin notes</label>
                        <textarea className="textarea" id={`notes-${item.id}`} name="adminNotes" defaultValue={item.adminNotes ?? ""} placeholder="Mayke-only notes, decision, or next step." />
                      </div>
                    </div>
                    <div className="button-row" style={{ justifyContent: "flex-start" }}>
                      <SubmitButton className="button secondary">Update feedback</SubmitButton>
                      <Link className="button ghost" href={`/admin/clients/${item.business.id}`}>
                        View client
                      </Link>
                    </div>
                  </StatefulForm>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No pilot feedback yet" description="Client submissions will appear here once a pilot or live workspace sends feedback." />
          )}
        </div>
      </section>
    </main>
  );
}
