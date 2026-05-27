import Link from "next/link";
import { ClipboardList, Plus } from "lucide-react";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { businessTypeCopy } from "@/lib/business-config";
import { createInquiryAction } from "@/lib/actions";
import { getCustomers, getInquiries } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function InquiriesPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;
  const [inquiries, customers] = await Promise.all([
    getInquiries(user.business.id, params.status),
    getCustomers(user.business.id)
  ]);
  const type = user.business.businessType.code;
  const copy = businessTypeCopy[type];

  return (
    <>
      <PageHeader
        eyebrow={copy.inquiryLabel}
        title="Inquiry command center"
        description="Triage requests, capture high-intent leads, and keep follow-up visible for every staff member."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Pipeline</h2>
              <p>Filter by status and prioritize the opportunities that need movement.</p>
            </div>
            <form action="/dashboard/inquiries">
              <select className="select" name="status" defaultValue={params.status ?? "ALL"}>
                <option value="ALL">All statuses</option>
                <option value="NEW">New</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="FOLLOWED_UP">Followed up</option>
                <option value="CLOSED">Closed</option>
              </select>
            </form>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Inquiry</th>
                  <th>Customer</th>
                  <th>Type</th>
                  <th>Value</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.length ? (
                  inquiries.map((inquiry) => (
                    <tr key={inquiry.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/inquiries/${inquiry.id}`}>
                          {inquiry.subject}
                        </Link>
                        <div style={{ color: "var(--muted)", marginTop: 4 }}>
                          {inquiry.source} · {inquiry._count.notes} notes · {inquiry._count.followUps} follow-ups
                        </div>
                      </td>
                      <td>{inquiry.customer?.name ?? inquiry.leadName ?? inquiry.leadEmail ?? "New lead"}</td>
                      <td>{inquiry.kind.toLowerCase().replace("_", " ")}</td>
                      <td>{inquiry.value ? formatCurrency(inquiry.value) : "Open"}</td>
                      <td>
                        <StatusBadge status={inquiry.status} />
                      </td>
                      <td>{formatDate(inquiry.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={6} message="No inquiries match this filter yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Capture request</h2>
              <p>Use this for calls, DMs, web forms, or staff-entered leads.</p>
            </div>
            <ClipboardList size={20} />
          </div>
          <div className="panel-body">
            <StatefulForm action={createInquiryAction}>
              <div className="field">
                <label htmlFor="customerId">Customer</label>
                <select className="select" id="customerId" name="customerId">
                  <option value="">New or unknown lead</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-grid">
                <div className="field full">
                  <label htmlFor="leadName">Lead name</label>
                  <input className="input" id="leadName" name="leadName" placeholder="For new or unknown leads" />
                </div>
                <div className="field">
                  <label htmlFor="leadEmail">Lead email</label>
                  <input className="input" id="leadEmail" name="leadEmail" type="text" inputMode="email" placeholder="name@example.com" />
                </div>
                <div className="field">
                  <label htmlFor="leadPhone">Lead phone</label>
                  <input className="input" id="leadPhone" name="leadPhone" placeholder="(555) 010-0000" />
                </div>
              </div>
              <div className="field">
                <label htmlFor="kind">Type</label>
                <select className="select" id="kind" name="kind" defaultValue={type === "RESTAURANT" ? "RESERVATION" : type === "DANCE_STUDIO" ? "REGISTRATION" : "PRODUCT_QUESTION"}>
                  {type === "RESTAURANT" ? (
                    <>
                      <option value="RESERVATION">Reservation</option>
                      <option value="CATERING">Catering</option>
                      <option value="PRIVATE_EVENT">Private event</option>
                    </>
                  ) : type === "DANCE_STUDIO" ? (
                    <>
                      <option value="REGISTRATION">Registration</option>
                      <option value="CLASS_INFO">Class info</option>
                      <option value="RECITAL">Recital</option>
                    </>
                  ) : (
                    <>
                      <option value="PRODUCT_QUESTION">Product question</option>
                      <option value="WHOLESALE">Wholesale</option>
                    </>
                  )}
                  <option value="SUPPORT">Support</option>
                  <option value="GENERAL">General</option>
                </select>
              </div>
              <div className="field">
                <label htmlFor="subject">Subject</label>
                <input className="input" id="subject" name="subject" required />
              </div>
              <div className="field">
                <label htmlFor="source">Source</label>
                <input className="input" id="source" name="source" placeholder="Website, phone, DM" required />
              </div>
              <div className="field">
                <label htmlFor="message">Message</label>
                <textarea className="textarea" id="message" name="message" required />
              </div>
              <SubmitButton>
                <Plus size={16} />
                Add inquiry
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>
      </div>
    </>
  );
}
