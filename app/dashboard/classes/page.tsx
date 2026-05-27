import Link from "next/link";
import { Archive, BookOpenCheck, Plus } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireBusinessUser } from "@/lib/auth";
import { getStudioClasses } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";
import { archiveStudioClassAction, saveStudioClassAction } from "@/lib/studio-class-actions";

function activeEnrollmentCount(enrollments: { status: string }[]) {
  return enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length;
}

function capacityStatus(enrollmentCount: number, capacity: number) {
  if (enrollmentCount >= capacity) return "FULL";
  if (enrollmentCount >= Math.ceil(capacity * 0.8)) return "ALMOST_FULL";
  return "OPEN";
}

export default async function ClassesPage({
  searchParams
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return (
      <>
        <PageHeader eyebrow="Classes" title="Studio classes" description="Class management is only available for Jete / dance studio accounts." />
        <EmptyState title="Not enabled for this workspace" description="Classes are only available for dance studio clients." />
      </>
    );
  }

  const classes = await getStudioClasses(user.business.id);
  const editingClass = classes.find((studioClass) => studioClass.id === params.edit);

  return (
    <>
      <PageHeader
        eyebrow="Studio operations"
        title="Classes"
        description="Create Jete classes, watch capacity, and connect registration submissions to the right program."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Class roster</h2>
              <p>{classes.length} classes scoped to {user.business.name}.</p>
            </div>
            <BookOpenCheck size={20} />
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Schedule</th>
                  <th>Instructor</th>
                  <th>Registrations</th>
                  <th>Capacity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {classes.length ? (
                  classes.map((studioClass) => {
                    const enrollmentCount = activeEnrollmentCount(studioClass.enrollments);
                    return (
                      <tr key={studioClass.id}>
                        <td>
                          <Link className="table-link" href={`/dashboard/classes/${studioClass.id}`}>
                            {studioClass.className}
                          </Link>
                          <div style={{ color: "var(--muted)", marginTop: 4 }}>
                            {studioClass.ageRange} · {studioClass.level} · {formatCurrency(studioClass.price)}
                          </div>
                        </td>
                        <td>{studioClass.dayTime}</td>
                        <td>{studioClass.instructor}</td>
                        <td>{enrollmentCount}</td>
                        <td>
                          <StatusBadge status={studioClass.active ? capacityStatus(enrollmentCount, studioClass.capacity) : "INACTIVE"} />
                          <div style={{ color: "var(--muted)", marginTop: 4 }}>
                            {enrollmentCount}/{studioClass.capacity}
                          </div>
                        </td>
                        <td>
                          <div className="button-row">
                            <Link className="button ghost" href={`/dashboard/classes?edit=${studioClass.id}`}>
                              Edit
                            </Link>
                            {!studioClass.archivedAt ? (
                              <StatefulForm action={archiveStudioClassAction} className="">
                                <input type="hidden" name="classId" value={studioClass.id} />
                                <SubmitButton className="button ghost">
                                  <Archive size={14} />
                                  Archive
                                </SubmitButton>
                              </StatefulForm>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <EmptyTableRow columns={6} message="No classes have been created yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{editingClass ? "Edit class" : "Create class"}</h2>
              <p>{editingClass ? "Update the selected Jete class." : "Add a class families can select during registration."}</p>
            </div>
            <Plus size={20} />
          </div>
          <div className="panel-body">
            <StatefulForm action={saveStudioClassAction}>
              {editingClass ? <input type="hidden" name="classId" value={editingClass.id} /> : null}
              <div className="field">
                <label htmlFor="className">Class name</label>
                <input className="input" id="className" name="className" defaultValue={editingClass?.className ?? ""} placeholder="Ballet Foundations" required />
              </div>
              <div className="field">
                <label htmlFor="ageRange">Age range</label>
                <input className="input" id="ageRange" name="ageRange" defaultValue={editingClass?.ageRange ?? ""} placeholder="Ages 6-8" required />
              </div>
              <div className="field">
                <label htmlFor="level">Level</label>
                <input className="input" id="level" name="level" defaultValue={editingClass?.level ?? ""} placeholder="Beginner" required />
              </div>
              <div className="field">
                <label htmlFor="dayTime">Day/time</label>
                <input className="input" id="dayTime" name="dayTime" defaultValue={editingClass?.dayTime ?? ""} placeholder="Tuesdays 4:00 PM" required />
              </div>
              <div className="field">
                <label htmlFor="instructor">Instructor</label>
                <input className="input" id="instructor" name="instructor" defaultValue={editingClass?.instructor ?? ""} placeholder="Avery Stone" required />
              </div>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="capacity">Capacity</label>
                  <input className="input" id="capacity" name="capacity" type="number" min="1" defaultValue={editingClass?.capacity ?? 12} required />
                </div>
                <div className="field">
                  <label htmlFor="price">Price / registration fee</label>
                  <input className="input" id="price" name="price" type="number" min="0" step="0.01" defaultValue={editingClass ? Number(editingClass.price) : 0} required />
                </div>
              </div>
              <label className="module-toggle">
                <input type="checkbox" name="active" defaultChecked={editingClass?.active ?? true} />
                <span>Active</span>
              </label>
              <SubmitButton>{editingClass ? "Save class" : "Create class"}</SubmitButton>
            </StatefulForm>
          </div>
        </section>
      </div>
    </>
  );
}
