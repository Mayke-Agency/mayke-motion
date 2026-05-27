import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, Mail, NotebookText, Phone, ReceiptText, UsersRound } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { requireBusinessUser } from "@/lib/auth";
import { getFamilyProfile } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";

export default async function FamilyProfilePage({
  params
}: {
  params: Promise<{ familyId: string }>;
}) {
  const user = await requireBusinessUser();
  const { familyId } = await params;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    notFound();
  }

  const family = await getFamilyProfile(user.business.id, familyId);

  if (!family) {
    notFound();
  }

  const paidCount = family.registrations.filter((registration) => registration.paymentStatus === "PAID").length;
  const openBalanceCount = family.registrations.filter((registration) => registration.paymentStatus !== "PAID").length;
  const latestRegistration = family.registrations[0];

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/dashboard/registrations">
          <ArrowLeft size={16} />
          Back to registrations
        </Link>
      </div>

      <PageHeader
        eyebrow="Family profile"
        title={`${family.familyLastName} Family`}
        description={`Student records, guardians, registrations, and communication history for ${user.business.name}.`}
        action={<span className="role-badge">{family.customer.segment}</span>}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <section className="panel metric-card">
          <span className="metric-label">Students</span>
          <strong className="metric-value">{family.students.length}</strong>
          <span className="metric-delta">Connected student records</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Registrations</span>
          <strong className="metric-value">{family.registrations.length}</strong>
          <span className="metric-delta">{latestRegistration ? formatDate(latestRegistration.createdAt) : "No submissions"}</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Payment status</span>
          <strong className="metric-value">{paidCount}/{family.registrations.length}</strong>
          <span className="metric-delta">{openBalanceCount ? `${openBalanceCount} not paid` : "All paid"}</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Messages</span>
          <strong className="metric-value">{family.customer.followUpEmails.length}</strong>
          <span className="metric-delta">Follow-ups on record</span>
        </section>
      </div>

      <div className="workflow-grid">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Guardians</h2>
              <p>Primary family contact information.</p>
            </div>
            <UsersRound size={20} />
          </div>
          <div className="panel-body detail-stack">
            <div className="profile-card">
              <span>Primary guardian</span>
              <strong>{family.contact1Name}</strong>
              <p>{family.contact1Type} · {family.contact1Phone} · {family.contact1Email}</p>
            </div>
            <div className="profile-card">
              <span>Secondary guardian</span>
              <strong>{family.contact2Name || "Not provided"}</strong>
              <p>{family.contact2Type || "No type"} · {family.contact2Phone || "No phone"} · {family.contact2Email || "No email"}</p>
            </div>
            <div className="profile-card">
              <span>Address</span>
              <strong>{family.homeAddress}</strong>
              <p>{family.city}, {family.state} {family.zip}</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Emergency</h2>
              <p>Safety and consent details.</p>
            </div>
            <Phone size={20} />
          </div>
          <div className="panel-body">
            <div className="quote-block">
              <p>{family.emergencyContactInfo}</p>
              <p>Primary phone: {family.primaryPhone}</p>
              <p>SMS consent: {family.smsConsent ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Student profiles</h2>
              <p>Students created from converted registrations.</p>
            </div>
            <GraduationCap size={20} />
          </div>
          <div className="panel-body">
            {family.students.length ? (
              <div className="timeline-list">
                {family.students.map((student) => (
                  <article className="timeline-item" key={student.id}>
                    <div>
                      <strong>{student.firstName} {student.lastName}</strong>
                      <span>{student.gradeLevel}</span>
                    </div>
                    <p>
                      {student.gender} · born {formatDate(student.birthDate)} · shirt {student.tshirtSize}
                    </p>
                    <p>{student.currentClassInterest} · {student.specialNeeds || "No special needs listed"}</p>
                    {student.enrollments.length ? (
                      <div className="tag-row" aria-label={`${student.firstName} enrollments`}>
                        {student.enrollments.map((enrollment) => (
                          <span key={enrollment.id}>
                            {enrollment.studioClass.className} · {enrollment.status.toLowerCase()}
                            {enrollment.registration ? ` · ${enrollment.registration.paymentStatus.toLowerCase()}` : ""}
                          </span>
                        ))}
                      </div>
                    ) : null}
                    {student.attendanceRecords.length ? (
                      <div className="timeline-list" style={{ marginTop: 12 }}>
                        {student.attendanceRecords.slice(0, 4).map((record) => (
                          <article className="timeline-item" key={record.id}>
                            <div>
                              <strong>{record.studioClass.className}</strong>
                              <StatusBadge status={record.status} />
                            </div>
                            <p>{formatDate(record.classDate)}</p>
                          </article>
                        ))}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No student records" description="Converted registrations will create student profiles here." />
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Registration and class history</h2>
              <p>Submissions, class interests, enrollment state, and payment status.</p>
            </div>
            <ReceiptText size={20} />
          </div>
          <div className="panel-body table-wrap">
            {family.registrations.length ? (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Payment</th>
                    <th>Fee</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {family.registrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/registrations/${registration.id}`}>
                          {registration.studentFirstName} {registration.studentLastName}
                        </Link>
                      </td>
                      <td>{registration.studioClass?.className ?? registration.classInterest}</td>
                      <td>
                        <StatusBadge status={registration.status} />
                      </td>
                      <td>
                        <StatusBadge status={registration.paymentStatus} />
                        {registration.paymentRecords[0] ? (
                          <div style={{ color: "var(--muted)", marginTop: 4 }}>Updated {formatDate(registration.paymentRecords[0].recordedAt)}</div>
                        ) : null}
                      </td>
                      <td>{formatCurrency(registration.form.fee)}</td>
                      <td>{formatDate(registration.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <EmptyState title="No registration history" description="Registration submissions connected to this family will appear here." />
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Notes</h2>
              <p>Family notes and internal registration review notes.</p>
            </div>
            <NotebookText size={20} />
          </div>
          <div className="panel-body">
            {family.notes ? (
              <div className="quote-block">
                <p>{family.notes}</p>
              </div>
            ) : null}
            {family.registrations.some((registration) => registration.internalNotes.length) ? (
              <div className="timeline-list">
                {family.registrations.flatMap((registration) =>
                  registration.internalNotes.map((note) => (
                    <article className="timeline-item" key={note.id}>
                      <div>
                        <strong>{note.author?.name ?? "Mayke Motion"}</strong>
                        <span>{formatDate(note.createdAt)}</span>
                      </div>
                      <p>{registration.studentFirstName} {registration.studentLastName} · {note.body}</p>
                    </article>
                  ))
                )}
              </div>
            ) : !family.notes ? (
              <EmptyState title="No notes yet" description="Registration notes and family context will appear here." />
            ) : null}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Communication history</h2>
              <p>Follow-up emails and campaign touches connected to this family contact.</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body">
            {family.customer.followUpEmails.length || family.customer.campaignEvents.length ? (
              <div className="timeline-list">
                {family.customer.followUpEmails.map((followUp) => (
                  <article className="timeline-item" key={followUp.id}>
                    <div>
                      <strong>{followUp.subject}</strong>
                      <StatusBadge status={followUp.status} />
                    </div>
                    <p>{followUp.createdBy?.name ?? "Mayke Motion"} · {formatDate(followUp.sentAt ?? followUp.createdAt)}</p>
                  </article>
                ))}
                {family.customer.campaignEvents.map((event) => (
                  <article className="timeline-item" key={event.id}>
                    <div>
                      <strong>{event.campaign.name}</strong>
                      <StatusBadge status={event.status} />
                    </div>
                    <p>{event.campaign.subject} · {formatDate(event.occurredAt)}</p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No communication history" description="Follow-ups and campaign activity will appear once sent." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
