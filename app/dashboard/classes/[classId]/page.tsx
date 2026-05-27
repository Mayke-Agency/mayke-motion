import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { requireBusinessUser } from "@/lib/auth";
import { getStudioClassDetail } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";

function activeEnrollmentCount(enrollments: { status: string }[]) {
  return enrollments.filter((enrollment) => enrollment.status === "ACTIVE").length;
}

function capacityStatus(enrollmentCount: number, capacity: number) {
  if (enrollmentCount >= capacity) return "FULL";
  if (enrollmentCount >= Math.ceil(capacity * 0.8)) return "ALMOST_FULL";
  return "OPEN";
}

export default async function ClassDetailPage({
  params
}: {
  params: Promise<{ classId: string }>;
}) {
  const user = await requireBusinessUser();
  const { classId } = await params;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    notFound();
  }

  const studioClass = await getStudioClassDetail(user.business.id, classId);
  if (!studioClass) notFound();

  const enrollmentCount = activeEnrollmentCount(studioClass.enrollments);
  const recentAttendance = studioClass.attendanceRecords;
  const attendanceSessions = new Set(recentAttendance.map((record) => record.classDate.toISOString().slice(0, 10))).size;

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/dashboard/classes">
          <ArrowLeft size={16} />
          Back to classes
        </Link>
      </div>

      <PageHeader
        eyebrow="Class detail"
        title={studioClass.className}
        description={`${studioClass.ageRange} · ${studioClass.level} · ${studioClass.dayTime}`}
        action={<StatusBadge status={capacityStatus(enrollmentCount, studioClass.capacity)} />}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <section className="panel metric-card">
          <span className="metric-label">Active enrollment</span>
          <strong className="metric-value">{enrollmentCount}/{studioClass.capacity}</strong>
          <span className="metric-delta">Capacity count</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Waitlist</span>
          <strong className="metric-value">{studioClass.enrollments.filter((enrollment) => enrollment.status === "WAITLISTED").length}</strong>
          <span className="metric-delta">Queued students</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Instructor</span>
          <strong className="metric-value compact">{studioClass.instructor}</strong>
          <span className="metric-delta">{studioClass.dayTime}</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Price</span>
          <strong className="metric-value">{formatCurrency(studioClass.price)}</strong>
          <span className="metric-delta">{studioClass.active ? "Active" : "Inactive"}</span>
        </section>
      </div>

      <section className="panel" style={{ marginBottom: 16 }}>
        <div className="panel-header">
          <div>
            <h2>Attendance summary</h2>
            <p>{attendanceSessions} recent class sessions recorded.</p>
          </div>
        </div>
        <div className="panel-body">
          <div className="tag-row" aria-label="Recent attendance counts">
            {["PRESENT", "ABSENT", "LATE", "EXCUSED"].map((status) => (
              <span key={status}>{status.toLowerCase()} · {recentAttendance.filter((record) => record.status === status).length}</span>
            ))}
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Enrolled students</h2>
            <p>Active, waitlisted, dropped, and completed enrollment records.</p>
          </div>
          <UsersRound size={20} />
        </div>
        <div className="panel-body table-wrap">
          {studioClass.enrollments.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Family</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Registration</th>
                  <th>Enrolled</th>
                </tr>
              </thead>
              <tbody>
                {studioClass.enrollments.map((enrollment) => (
                  <tr key={enrollment.id}>
                    <td>
                      <strong>{enrollment.studentProfile.firstName} {enrollment.studentProfile.lastName}</strong>
                      <div style={{ color: "var(--muted)", marginTop: 4 }}>{enrollment.studentProfile.gradeLevel}</div>
                    </td>
                    <td>
                      <Link className="table-link" href={`/dashboard/families/${enrollment.studentProfile.familyProfile.id}`}>
                        {enrollment.studentProfile.familyProfile.familyLastName} family
                      </Link>
                    </td>
                    <td>
                      <StatusBadge status={enrollment.status} />
                    </td>
                    <td>
                      {enrollment.registration ? <StatusBadge status={enrollment.registration.paymentStatus} /> : "No registration"}
                    </td>
                    <td>
                      {enrollment.registration ? (
                        <Link className="table-link" href={`/dashboard/registrations/${enrollment.registration.id}`}>
                          View registration
                        </Link>
                      ) : (
                        "Manual enrollment"
                      )}
                    </td>
                    <td>{formatDate(enrollment.enrolledAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState title="No enrolled students yet" description="Students enrolled from registration or family profiles will appear here." />
          )}
        </div>
      </section>
    </>
  );
}
