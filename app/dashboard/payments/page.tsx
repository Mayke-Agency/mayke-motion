import Link from "next/link";
import { CreditCard, ReceiptText } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireBusinessUser } from "@/lib/auth";
import { getJetePaymentDashboard } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { updateRegistrationPaymentStatusAction } from "@/lib/payment-actions";

export default async function PaymentsPage() {
  const user = await requireBusinessUser();

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return (
      <>
        <PageHeader eyebrow="Payments" title="Payment tracking" description="Payment tracking is only available for Jete / dance studio accounts." />
        <EmptyState title="Not enabled for this workspace" description="Jete payment tracking is scoped to dance studio registration workflows." />
      </>
    );
  }

  const { registrations, paymentRecords } = await getJetePaymentDashboard(user.business.id);
  const paidRegistrations = registrations.filter((registration) => registration.paymentStatus === "PAID");
  const unpaidRegistrations = registrations.filter((registration) => registration.paymentStatus === "UNPAID");
  const failedPayments = registrations.filter((registration) => registration.paymentStatus === "FAILED");
  const totalCollected = paidRegistrations.reduce((sum, registration) => sum + Number(registration.form.fee), 0);

  return (
    <>
      <PageHeader
        eyebrow="Studio payments"
        title="Payments"
        description="Track registration and enrollment payment status for Jete families."
        action={<CreditCard size={20} />}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <section className="panel metric-card">
          <span className="metric-label">Paid registrations</span>
          <strong className="metric-value">{paidRegistrations.length}</strong>
          <span className="metric-delta">Marked paid</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Unpaid registrations</span>
          <strong className="metric-value">{unpaidRegistrations.length}</strong>
          <span className="metric-delta">Needs collection</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Failed payments</span>
          <strong className="metric-value">{failedPayments.length}</strong>
          <span className="metric-delta">Requires follow-up</span>
        </section>
        <section className="panel metric-card">
          <span className="metric-label">Total collected</span>
          <strong className="metric-value">{formatCurrency(totalCollected)}</strong>
          <span className="metric-delta">From paid registrations</span>
        </section>
      </div>

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Registration payments</h2>
              <p>{registrations.length} registration payment records scoped to {user.business.name}.</p>
            </div>
            <ReceiptText size={20} />
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Family</th>
                  <th>Class</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Update</th>
                </tr>
              </thead>
              <tbody>
                {registrations.length ? (
                  registrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/registrations/${registration.id}`}>
                          {registration.studentFirstName} {registration.studentLastName}
                        </Link>
                      </td>
                      <td>
                        {registration.familyProfile ? (
                          <Link className="table-link" href={`/dashboard/families/${registration.familyProfile.id}`}>
                            {registration.familyLastName} family
                          </Link>
                        ) : (
                          `${registration.familyLastName} family`
                        )}
                      </td>
                      <td>{registration.classEnrollment?.studioClass.className ?? registration.studioClass?.className ?? registration.classInterest}</td>
                      <td>{formatCurrency(registration.form.fee)}</td>
                      <td>
                        <StatusBadge status={registration.paymentStatus} />
                        {registration.paymentRecords[0] ? (
                          <div style={{ color: "var(--muted)", marginTop: 4 }}>{formatDate(registration.paymentRecords[0].recordedAt)}</div>
                        ) : null}
                      </td>
                      <td>
                        <StatefulForm action={updateRegistrationPaymentStatusAction} className="form-stack">
                          <input type="hidden" name="registrationId" value={registration.id} />
                          <select className="select" name="status" defaultValue={registration.paymentStatus} aria-label="Payment status">
                            <option value="UNPAID">Unpaid</option>
                            <option value="PENDING">Pending</option>
                            <option value="PAID">Paid</option>
                            <option value="FAILED">Failed</option>
                            <option value="REFUNDED">Refunded</option>
                          </select>
                          <input className="input" name="note" placeholder="Optional note" />
                          <SubmitButton className="button secondary">Save</SubmitButton>
                        </StatefulForm>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={6} message="No registration payments to track yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Payment history</h2>
              <p>Manual and provider payment status updates.</p>
            </div>
          </div>
          <div className="panel-body">
            {paymentRecords.length ? (
              <div className="timeline-list">
                {paymentRecords.map((record) => (
                  <article className="timeline-item" key={record.id}>
                    <div>
                      <strong>{record.studentProfile ? `${record.studentProfile.firstName} ${record.studentProfile.lastName}` : record.registration ? `${record.registration.studentFirstName} ${record.registration.studentLastName}` : "Payment record"}</strong>
                      <StatusBadge status={record.status} />
                    </div>
                    <p>
                      {formatCurrency(record.amount)} · {record.source} · {formatDate(record.recordedAt)}
                      {record.note ? ` · ${record.note}` : ""}
                    </p>
                  </article>
                ))}
              </div>
            ) : (
              <EmptyState title="No payment history yet" description="Manual status updates will appear here." />
            )}
          </div>
        </section>
      </div>
    </>
  );
}
