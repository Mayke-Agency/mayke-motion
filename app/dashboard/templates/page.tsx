import { FileText, Plus, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { deleteMessageTemplateAction, upsertMessageTemplateAction } from "@/lib/actions";
import { requireBusinessUser } from "@/lib/auth";
import { getMessageTemplates } from "@/lib/dashboard-data";

export default async function TemplatesPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;
  const templates = await getMessageTemplates(user.business.id);
  const editingTemplate = params.edit ? templates.find((template) => template.id === params.edit) : null;
  const canManage = user.role === "CLIENT_OWNER";

  return (
    <>
      <PageHeader
        eyebrow="Message system"
        title="Templates"
        description="Save polished follow-up, campaign, and announcement messages for reuse across Mayke Motion."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Template library</h2>
              <p>{templates.length} saved templates scoped to {user.business.name}.</p>
            </div>
            <FileText size={20} />
          </div>
          <div className="panel-body">
            {templates.length ? (
              <div className="timeline-list">
                {templates.map((template) => (
                  <article className="timeline-item" key={template.id}>
                    <div>
                      <strong>{template.name}</strong>
                      <StatusBadge status={template.type} />
                    </div>
                    <p>{template.subject}</p>
                    <p>{template.body}</p>
                    <div className="button-row">
                      {canManage ? (
                        <>
                          <a className="button ghost" href={`/dashboard/templates?edit=${template.id}`}>
                            Edit
                          </a>
                          <StatefulForm action={deleteMessageTemplateAction} className="button-row">
                            <input type="hidden" name="templateId" value={template.id} />
                            <SubmitButton className="button ghost">
                              <Trash2 size={14} />
                              Delete
                            </SubmitButton>
                          </StatefulForm>
                        </>
                      ) : null}
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No templates yet" description="Client owners can create reusable follow-up and campaign copy here." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{editingTemplate ? "Edit template" : "Create template"}</h2>
              <p>{canManage ? "Reusable copy for follow-ups and campaigns." : "Staff can use templates but cannot manage them."}</p>
            </div>
          </div>
          <div className="panel-body">
            {canManage ? (
              <StatefulForm action={upsertMessageTemplateAction}>
                {editingTemplate ? <input type="hidden" name="templateId" value={editingTemplate.id} /> : null}
                <input type="hidden" name="businessType" value={user.business.businessType.code} />
                <div className="field">
                  <label htmlFor="name">Name</label>
                  <input className="input" id="name" name="name" defaultValue={editingTemplate?.name ?? ""} required />
                </div>
                <div className="field">
                  <label htmlFor="type">Type</label>
                  <select className="select" id="type" name="type" defaultValue={editingTemplate?.type ?? "FOLLOW_UP"}>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="CAMPAIGN">Campaign</option>
                    <option value="ANNOUNCEMENT">Announcement</option>
                  </select>
                </div>
                <div className="field">
                  <label>Business type</label>
                  <input className="input" value={user.business.businessType.name} readOnly />
                </div>
                <div className="field">
                  <label htmlFor="subject">Subject</label>
                  <input className="input" id="subject" name="subject" defaultValue={editingTemplate?.subject ?? ""} required />
                </div>
                <div className="field">
                  <label htmlFor="body">Message body</label>
                  <textarea className="textarea" id="body" name="body" defaultValue={editingTemplate?.body ?? ""} required />
                </div>
                <SubmitButton>
                  <Plus size={16} />
                  {editingTemplate ? "Save template" : "Create template"}
                </SubmitButton>
              </StatefulForm>
            ) : (
              <EmptyState title="View-only access" description="Ask a client owner or Mayke admin to create or edit templates." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
