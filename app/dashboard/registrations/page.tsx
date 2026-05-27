import Link from "next/link";
import { ClipboardPenLine, ExternalLink, Plus, Search } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { IntegrationGateNotice } from "@/components/dashboard/IntegrationGateNotice";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createRegistrationFormAction } from "@/lib/registration-actions";
import { requireBusinessUser } from "@/lib/auth";
import { getRegistrationForms, getRegistrationSubmissions } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { isStripePaymentsReady, stripeSetupMessage } from "@/lib/integration-gates";

const registrationFilters = [
  { key: "ALL", label: "All" },
  { key: "NEW", label: "New" },
  { key: "REVIEWED", label: "Reviewed" },
  { key: "CONTACTED", label: "Contacted" },
  { key: "ENROLLED", label: "Enrolled" },
  { key: "NOT_A_FIT", label: "Not a fit" },
  { key: "PAID", label: "Paid" },
  { key: "UNPAID", label: "Unpaid" }
];

function searchableRegistration(registration: Awaited<ReturnType<typeof getRegistrationSubmissions>>[number]) {
  return [
    registration.studentFirstName,
    registration.studentLastName,
    registration.familyLastName,
    registration.contact1FirstName,
    registration.contact1LastName,
    registration.contact1Email,
    registration.contact1Phone,
    registration.primaryPhone,
    registration.contact2FirstName,
    registration.contact2LastName,
    registration.contact2Email,
    registration.contact2Phone,
    registration.studentPhone
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function registrationFilterHref(filter: string, query: string) {
  const params = new URLSearchParams();
  params.set("status", filter);
  if (query) params.set("q", query);
  return `/dashboard/registrations?${params.toString()}`;
}

export default async function RegistrationsPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;

  if (user.business.businessType.code !== "DANCE_STUDIO") {
    return (
      <>
        <PageHeader eyebrow="Registrations" title="Registration forms" description="Registration workflows are enabled for dance studio clients." />
        <EmptyState title="Not enabled for this workspace" description="Registration forms are only available for Jete / dance studio accounts." />
      </>
    );
  }

  const [forms, registrations] = await Promise.all([getRegistrationForms(user.business.id), getRegistrationSubmissions(user.business.id)]);
  const stripeReady = isStripePaymentsReady(user.business);
  const activeFilter = registrationFilters.some((filter) => filter.key === params.status) ? (params.status ?? "ALL") : "ALL";
  const query = params.q?.trim().toLowerCase() ?? "";
  const filteredRegistrations = registrations.filter((registration) => {
    const matchesStatus = activeFilter === "ALL" || registration.status === activeFilter || registration.paymentStatus === activeFilter;
    const matchesQuery = !query || searchableRegistration(registration).includes(query);
    return matchesStatus && matchesQuery;
  });
  const filterCount = (filter: string) =>
    filter === "ALL" ? registrations.length : registrations.filter((registration) => registration.status === filter || registration.paymentStatus === filter).length;

  return (
    <>
      <PageHeader
        eyebrow="Studio registration"
        title="Registration forms"
        description="Create shareable registration forms, collect family/student info, and manage submitted registrations."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Submitted registrations</h2>
              <p>{filteredRegistrations.length} of {registrations.length} registrations scoped to {user.business.name}.</p>
            </div>
            <ClipboardPenLine size={20} />
          </div>
          <div className="panel-body">
            <form style={{ display: "flex", gap: 8 }} action="/dashboard/registrations">
              <input type="hidden" name="status" value={activeFilter} />
              <input className="input" name="q" placeholder="Search student, family, email, or phone" defaultValue={params.q ?? ""} />
              <button className="button secondary" type="submit" aria-label="Search registrations">
                <Search size={16} />
              </button>
            </form>
            <div className="tag-row" aria-label="Registration filters">
              {registrationFilters.map((filter) => (
                <Link className={filter.key === activeFilter ? "role-badge" : ""} href={registrationFilterHref(filter.key, params.q ?? "")} key={filter.key}>
                  {filter.label} · {filterCount(filter.key)}
                </Link>
              ))}
            </div>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Family</th>
                  <th>Class</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th>Submitted</th>
                </tr>
              </thead>
              <tbody>
                {filteredRegistrations.length ? (
                  filteredRegistrations.map((registration) => (
                    <tr key={registration.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/registrations/${registration.id}`}>
                          {registration.studentFirstName} {registration.studentLastName}
                        </Link>
                      </td>
                      <td>{registration.familyLastName}</td>
                      <td>{registration.studioClass?.className ?? registration.classInterest}</td>
                      <td>
                        <StatusBadge status={registration.status} />
                      </td>
                      <td>
                        <StatusBadge status={registration.paymentStatus} />
                      </td>
                      <td>{formatDate(registration.createdAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={6} message="No registrations match this view yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Create form</h2>
              <p>Set a public form title and optional registration fee.</p>
            </div>
            <Plus size={20} />
          </div>
          <div className="panel-body">
            {!stripeReady ? <IntegrationGateNotice kind="stripe" message={stripeSetupMessage} /> : null}
            <StatefulForm action={createRegistrationFormAction}>
              <div className="field">
                <label htmlFor="title">Form title</label>
                <input className="input" id="title" name="title" placeholder="Summer intensive registration" required />
              </div>
              <div className="field">
                <label htmlFor="description">Description</label>
                <textarea className="textarea" id="description" name="description" placeholder="What families should know before registering." />
              </div>
              <div className="field">
                <label htmlFor="fee">Registration fee</label>
                <input className="input" id="fee" name="fee" type="number" min="0" step="0.01" defaultValue="0" disabled={!stripeReady} required />
                {!stripeReady ? <p style={{ color: "var(--muted)", fontSize: 12, marginTop: 6 }}>Payment collection is disabled until Stripe Connect is complete. Free forms can still be created.</p> : null}
              </div>
              <SubmitButton>Create form</SubmitButton>
            </StatefulForm>
          </div>
        </section>

        <section className="panel" style={{ gridColumn: "span 3" }}>
          <div className="panel-header">
            <div>
              <h2>Shareable forms</h2>
              <p>Public links for families to complete registration.</p>
            </div>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Form</th>
                  <th>Fee</th>
                  <th>Submissions</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {forms.length ? (
                  forms.map((form) => (
                    <tr key={form.id}>
                      <td>
                        <strong>{form.title}</strong>
                        <div style={{ color: "var(--muted)", marginTop: 4 }}>{form.description ?? "No description"}</div>
                      </td>
                      <td>{formatCurrency(form.fee)}</td>
                      <td>{form._count.submissions}</td>
                      <td>
                        <StatusBadge status={form.active ? "ACTIVE" : "INACTIVE"} />
                      </td>
                      <td>
                        <a className="button ghost" href={`/register/${form.slug}`} target="_blank" rel="noreferrer">
                          <ExternalLink size={14} />
                          Open form
                        </a>
                      </td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={5} message="No registration forms have been created yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
