import { ClipboardCheck, Search } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveAttendanceAction } from "@/lib/attendance-actions";
import { requireBusinessUser } from "@/lib/auth";
import { getAttendanceClasses, getClassAttendanceSession } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";

const statuses = ["PRESENT", "ABSENT", "LATE", "EXCUSED"];

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateOnly(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

export default async function AttendancePage({
  searchParams
}: {
  searchParams: Promise<{ classId?: string; classDate?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return (
      <>
        <PageHeader eyebrow="Attendance" title="Attendance" description="Attendance tracking is only available for Jete / dance studio accounts." />
        <EmptyState title="Not enabled for this workspace" description="Attendance is scoped to dance studio class enrollments." />
      </>
    );
  }

  const classes = await getAttendanceClasses(user.business.id);
  const selectedClassId = params.classId ?? classes[0]?.id ?? "";
  const selectedDate = params.classDate ?? todayInputValue();
  const session = selectedClassId ? await getClassAttendanceSession(user.business.id, selectedClassId, dateOnly(selectedDate)) : null;
  const existingRecords = new Map(session?.attendanceRecords.map((record) => [record.studentProfileId, record]) ?? []);
  const counts = Object.fromEntries(statuses.map((status) => [status, session?.attendanceRecords.filter((record) => record.status === status).length ?? 0]));

  return (
    <>
      <PageHeader
        eyebrow="Studio attendance"
        title="Attendance"
        description="Mark attendance for active Jete class enrollments."
        action={<ClipboardCheck size={20} />}
      />

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2>Class session</h2>
            <p>Select a class and date to load active students.</p>
          </div>
        </div>
        <div className="panel-body">
          <form style={{ display: "flex", gap: 8, flexWrap: "wrap" }} action="/dashboard/attendance">
            <select className="select" name="classId" defaultValue={selectedClassId} aria-label="Class">
              {classes.map((studioClass) => (
                <option value={studioClass.id} key={studioClass.id}>
                  {studioClass.className} · {studioClass.enrollments.length} active
                </option>
              ))}
            </select>
            <input className="input" name="classDate" type="date" defaultValue={selectedDate} aria-label="Class date" />
            <button className="button secondary" type="submit">
              <Search size={16} />
              Load
            </button>
          </form>
        </div>
      </section>

      {session ? (
        <>
          <div className="grid cols-4" style={{ marginBottom: 16 }}>
            <section className="panel metric-card">
              <span className="metric-label">Present</span>
              <strong className="metric-value">{counts.PRESENT}</strong>
              <span className="metric-delta">{formatDate(dateOnly(selectedDate))}</span>
            </section>
            <section className="panel metric-card">
              <span className="metric-label">Absent</span>
              <strong className="metric-value">{counts.ABSENT}</strong>
              <span className="metric-delta">Marked absent</span>
            </section>
            <section className="panel metric-card">
              <span className="metric-label">Late</span>
              <strong className="metric-value">{counts.LATE}</strong>
              <span className="metric-delta">Arrived late</span>
            </section>
            <section className="panel metric-card">
              <span className="metric-label">Excused</span>
              <strong className="metric-value">{counts.EXCUSED}</strong>
              <span className="metric-delta">Excused absences</span>
            </section>
          </div>

          <section className="panel">
            <div className="panel-header">
              <div>
                <h2>{session.className}</h2>
                <p>{session.dayTime} · {session.instructor} · {session.enrollments.length} active students</p>
              </div>
            </div>
            <div className="panel-body table-wrap">
              {session.enrollments.length ? (
                <StatefulForm action={saveAttendanceAction}>
                  <input type="hidden" name="classId" value={session.id} />
                  <input type="hidden" name="classDate" value={selectedDate} />
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Student</th>
                        <th>Family</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {session.enrollments.map((enrollment) => {
                        const existing = existingRecords.get(enrollment.studentProfileId);
                        return (
                          <tr key={enrollment.id}>
                            <td>
                              <strong>{enrollment.studentProfile.firstName} {enrollment.studentProfile.lastName}</strong>
                              <div style={{ color: "var(--muted)", marginTop: 4 }}>{enrollment.studentProfile.gradeLevel}</div>
                              <input type="hidden" name="studentProfileId" value={enrollment.studentProfileId} />
                              <input type="hidden" name="classEnrollmentId" value={enrollment.id} />
                            </td>
                            <td>{enrollment.studentProfile.familyProfile.familyLastName} family</td>
                            <td>
                              <select className="select" name="status" defaultValue={existing?.status ?? "PRESENT"} aria-label={`${enrollment.studentProfile.firstName} attendance status`}>
                                {statuses.map((status) => (
                                  <option value={status} key={status}>
                                    {status.toLowerCase().replaceAll("_", " ")}
                                  </option>
                                ))}
                              </select>
                              {existing ? (
                                <div style={{ marginTop: 8 }}>
                                  <StatusBadge status={existing.status} />
                                </div>
                              ) : null}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  <div style={{ marginTop: 16 }}>
                    <SubmitButton>Save attendance</SubmitButton>
                  </div>
                </StatefulForm>
              ) : (
                <EmptyState title="No active students" description="Enroll students in this class before taking attendance." />
              )}
            </div>
          </section>
        </>
      ) : (
        <section className="panel">
          <div className="panel-body">
            <EmptyState title="No classes available" description="Create a class and active enrollment before tracking attendance." />
          </div>
        </section>
      )}
    </>
  );
}
