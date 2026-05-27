import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, GraduationCap, Mail, MessageSquarePlus, UserRoundPlus } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { saveClassEnrollmentAction } from "@/lib/enrollment-actions";
import { updateRegistrationPaymentStatusAction } from "@/lib/payment-actions";
import { addRegistrationNoteAction, convertRegistrationToCustomerAction, sendRegistrationFollowUpEmailAction, updateRegistrationStatusAction } from "@/lib/registration-actions";
import { requireBusinessUser } from "@/lib/auth";
import { getRegistrationDetail } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { emailSetupMessage, isEmailSendingReady } from "@/lib/integration-gates";

export default async function RegistrationDetailPage({
  params
}: {
  params: Promise<{ registrationId: string }>;
}) {
  const user = await requireBusinessUser();
  const { registrationId } = await params;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    notFound();
  }

  const registration = await getRegistrationDetail(user.business.id, registrationId);

  if (!registration) {
    notFound();
  }

  const selectedClassName = registration.studioClass?.className ?? registration.classInterest;
  const followUpSubject = `Following up on ${registration.studentFirstName}'s Jete registration`;
  const followUpBody = `Hi ${registration.contact1FirstName},\n\nThank you for submitting ${registration.studentFirstName}'s registration for ${selectedClassName}. Our team has reviewed the details and would love to help with next steps.\n\nPlease reply here with any questions, or let us know the best time to connect.\n\nWarmly,\nJete Dance Center`;
  const enrollment = registration.classEnrollment;
  const emailReady = isEmailSendingReady(user.business);

  return (
    <>
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href="/dashboard/registrations">
          <ArrowLeft size={16} />
          Back to registrations
        </Link>
      </div>

      <PageHeader
        eyebrow="Registration detail"
        title={`${registration.studentFirstName} ${registration.studentLastName}`}
        description={`${registration.form.title} · submitted ${formatDate(registration.createdAt)}`}
        action={<StatusBadge status={registration.status} />}
      />

      <div className="workflow-grid">
        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Student and class</h2>
              <p>{selectedClassName}</p>
            </div>
            <StatusBadge status={registration.paymentStatus} />
          </div>
          <div className="panel-body detail-grid">
            <div>
              <span>Student</span>
              <strong>{registration.studentFirstName} {registration.studentLastName}</strong>
              <p>{registration.studentGender} · born {formatDate(registration.birthDate)}</p>
            </div>
            <div>
              <span>Grade / shirt</span>
              <strong>{registration.gradeLevel}</strong>
              <p>T-shirt {registration.tshirtSize}</p>
            </div>
            <div>
              <span>Trial class</span>
              <strong>{registration.trialClass ? "Yes" : "No"}</strong>
              <p>{registration.specialNeeds || "No special needs listed"}</p>
            </div>
            <div>
              <span>Payment</span>
              <strong>{registration.paymentStatus.toLowerCase()}</strong>
              <p>{registration.stripeSessionId ?? "No Stripe session"}</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Status</h2>
              <p>Manage the registration pipeline.</p>
            </div>
          </div>
          <div className="panel-body">
            <StatefulForm action={updateRegistrationStatusAction}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <div className="field">
                <label htmlFor="status">Status</label>
                <select className="select" id="status" name="status" defaultValue={registration.status}>
                  <option value="NEW">New</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="CONTACTED">Contacted</option>
                  <option value="ENROLLED">Enrolled</option>
                  <option value="NOT_A_FIT">Not a fit</option>
                </select>
              </div>
              <SubmitButton>Update status</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Follow-up email</h2>
              <p>Send the family a next-step message.</p>
            </div>
            <Mail size={20} />
          </div>
          <div className="panel-body">
            {!emailReady ? <IntegrationGateNotice kind="email" message={emailSetupMessage} /> : null}
            <StatefulForm action={sendRegistrationFollowUpEmailAction}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <div className="field">
                <label htmlFor="toEmail">Recipient</label>
                <input className="input" id="toEmail" name="toEmail" type="email" defaultValue={registration.contact1Email} required />
              </div>
              <div className="field">
                <label htmlFor="subject">Subject</label>
                <input className="input" id="subject" name="subject" defaultValue={followUpSubject} required />
              </div>
              <div className="field">
                <label htmlFor="followUpBody">Message</label>
                <textarea className="textarea" id="followUpBody" name="body" defaultValue={followUpBody} required />
              </div>
              <SubmitButton disabled={!emailReady}>Send follow-up</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Enrollment</h2>
              <p>{enrollment ? `${enrollment.studentProfile.firstName} is ${enrollment.status.toLowerCase()} in ${enrollment.studioClass.className}.` : "Move a converted student into a class."}</p>
            </div>
            <GraduationCap size={20} />
          </div>
          <div className="panel-body">
            {registration.familyProfile?.students.length ? (
              <StatefulForm action={saveClassEnrollmentAction}>
                <input type="hidden" name="registrationId" value={registration.id} />
                <div className="field">
                  <label htmlFor="studentProfileId">Student</label>
                  <select className="select" id="studentProfileId" name="studentProfileId" defaultValue={enrollment?.studentProfile.id ?? registration.familyProfile.students[0]?.id} required>
                    {registration.familyProfile.students.map((student) => (
                      <option value={student.id} key={student.id}>
                        {student.firstName} {student.lastName}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="classId">Class</label>
                  <select className="select" id="classId" name="classId" defaultValue={enrollment?.studioClass.id ?? registration.studioClass?.id ?? ""} required>
                    <option value="">Choose a class</option>
                    {registration.business.studioClasses.map((studioClass) => {
                      const activeCount = studioClass.enrollments.filter((item) => item.status === "ACTIVE").length;
                      return (
                        <option value={studioClass.id} key={studioClass.id}>
                          {studioClass.className} · {activeCount}/{studioClass.capacity}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="enrollmentStatus">Enrollment status</label>
                  <select className="select" id="enrollmentStatus" name="status" defaultValue={enrollment?.status ?? "ACTIVE"}>
                    <option value="ACTIVE">Active</option>
                    <option value="WAITLISTED">Waitlisted</option>
                    <option value="DROPPED">Dropped</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
                <SubmitButton>{enrollment ? "Update enrollment" : "Enroll student"}</SubmitButton>
              </StatefulForm>
            ) : (
              <EmptyState title="Convert registration first" description="Create the family/student profile before enrolling the student." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment</h2>
              <p>Manual registration payment status.</p>
            </div>
            <StatusBadge status={registration.paymentStatus} />
          </div>
          <div className="panel-body">
            <StatefulForm action={updateRegistrationPaymentStatusAction}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <div className="field">
                <label htmlFor="paymentStatus">Payment status</label>
                <select className="select" id="paymentStatus" name="status" defaultValue={registration.paymentStatus}>
                  <option value="UNPAID">Unpaid</option>
                  <option value="PENDING">Pending</option>
                  <option value="PAID">Paid</option>
                  <option value="FAILED">Failed</option>
                  <option value="REFUNDED">Refunded</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="paymentNote">Payment note</label>
                <textarea className="textarea" id="paymentNote" name="note" placeholder="Manual payment, comp, refund note, or Stripe context." />
              </div>
              <SubmitButton>Update payment</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Family contacts</h2>
              <p>{registration.familyLastName} family · {registration.homeAddress}, {registration.city}, {registration.state} {registration.zip}</p>
            </div>
          </div>
          <div className="panel-body detail-grid">
            <div>
              <span>Contact 1</span>
              <strong>{registration.contact1FirstName} {registration.contact1LastName}</strong>
              <p>{registration.contact1Type} · {registration.contact1Phone} · {registration.contact1Email}</p>
            </div>
            <div>
              <span>Contact 2</span>
              <strong>{[registration.contact2FirstName, registration.contact2LastName].filter(Boolean).join(" ") || "Not provided"}</strong>
              <p>{registration.contact2Email || registration.contact2Phone || "No secondary contact"}</p>
            </div>
            <div>
              <span>Emergency</span>
              <strong>{registration.emergencyContactInfo}</strong>
              <p>Primary phone {registration.primaryPhone}</p>
            </div>
            <div>
              <span>Referral</span>
              <strong>{registration.referralSource}</strong>
              <p>{registration.referralName || "No referral name"}</p>
            </div>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Convert to family</h2>
              <p>{registration.familyProfile ? "This registration is connected to a family profile." : "Create a family and student profile."}</p>
            </div>
            <UserRoundPlus size={20} />
          </div>
          <div className="panel-body">
            {registration.familyProfile ? (
              <Link className="button secondary" href={`/dashboard/families/${registration.familyProfile.id}`}>
                View family profile
              </Link>
            ) : (
              <StatefulForm action={convertRegistrationToCustomerAction}>
                <input type="hidden" name="registrationId" value={registration.id} />
                <SubmitButton>Convert to family</SubmitButton>
              </StatefulForm>
            )}
          </div>
        </section>

        <section className="panel workflow-main">
          <div className="panel-header">
            <div>
              <h2>Internal notes</h2>
              <p>Private Jete team notes for this registration.</p>
            </div>
            <MessageSquarePlus size={20} />
          </div>
          <div className="panel-body detail-stack">
            <StatefulForm action={addRegistrationNoteAction}>
              <input type="hidden" name="registrationId" value={registration.id} />
              <div className="field">
                <label htmlFor="body">New note</label>
                <textarea className="textarea" id="body" name="body" placeholder="Placement notes, follow-up needs, or payment context." required />
              </div>
              <SubmitButton>Add note</SubmitButton>
            </StatefulForm>
            {registration.internalNotes.length ? (
              <div className="timeline-list">
                {registration.internalNotes.map((note) => (
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
              <EmptyState title="No notes yet" description="Add the first internal registration note." />
            )}
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Questions</h2>
              <p>Family notes and consent context.</p>
            </div>
          </div>
          <div className="panel-body">
            <div className="quote-block">
              <p>{registration.notes || "No questions provided."}</p>
              <p>SMS consent: {registration.smsConsent ? "Yes" : "No"}</p>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
