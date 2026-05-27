import Link from "next/link";
import { Download, Plus, Search } from "lucide-react";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { ContactImportForm } from "@/components/forms/ContactImportForm";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { createCustomerAction } from "@/lib/actions";
import { getCustomers } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";
import { filterCustomersBySegment, getSegmentCounts } from "@/lib/segments";

export default async function CustomersPage({
  searchParams
}: {
  searchParams: Promise<{ q?: string; segment?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;
  const allCustomers = await getCustomers(user.business.id);
  const activeSegment = params.segment ?? "all";
  const query = params.q?.toLowerCase().trim() ?? "";
  const segmentCounts = getSegmentCounts(allCustomers, user.business.businessType.code);
  const canImport = user.role === "CLIENT_OWNER";
  const customers = filterCustomersBySegment(allCustomers, activeSegment).filter((customer) => {
    if (!query) return true;
    return [customer.name, customer.email, customer.phone, customer.segment, customer.source, ...customer.tags]
      .filter(Boolean)
      .some((value) => value?.toLowerCase().includes(query));
  });

  return (
    <>
      <PageHeader
        eyebrow="CRM"
        title="Customers"
        description="Search, segment, and grow the customer relationships that power repeat revenue."
      />

      <div className="grid cols-3">
        <section className="panel" style={{ gridColumn: "span 2" }}>
          <div className="panel-header">
            <div>
              <h2>Customer database</h2>
              <p>{customers.length} records scoped to {user.business.name}.</p>
            </div>
            <form style={{ display: "flex", gap: 8 }} action="/dashboard/customers">
              <input type="hidden" name="segment" value={activeSegment} />
              <input className="input" name="q" placeholder="Search customers" defaultValue={params.q ?? ""} />
              <button className="button secondary" type="submit" aria-label="Search">
                <Search size={16} />
              </button>
            </form>
          </div>
          <div className="panel-body">
            <div className="tag-row" aria-label="Saved segment filters">
              {segmentCounts.map((segment) => (
                <Link
                  className={segment.key === activeSegment ? "role-badge" : ""}
                  href={`/dashboard/customers?segment=${segment.key}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                  key={segment.key}
                  title={segment.description}
                >
                  {segment.label} · {segment.count}
                </Link>
              ))}
            </div>
          </div>
          <div className="panel-body table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Contact</th>
                  <th>Segment</th>
                  <th>Source</th>
                  <th>Value</th>
                  <th>Last touch</th>
                </tr>
              </thead>
              <tbody>
                {customers.length ? (
                  customers.map((customer) => (
                    <tr key={customer.id}>
                      <td>
                        <Link className="table-link" href={`/dashboard/customers/${customer.id}`}>
                          {customer.name}
                        </Link>
                      </td>
                      <td>{customer.email ?? customer.phone ?? "No contact"}</td>
                      <td>
                        {customer.segment}
                        <div className="tag-row" style={{ marginTop: 8 }}>
                          {customer.tags.slice(0, 3).map((tag) => (
                            <span key={tag}>{tag}</span>
                          ))}
                        </div>
                      </td>
                      <td>{customer.source}</td>
                      <td>{formatCurrency(customer.lifetimeValue)}</td>
                      <td>{formatDate(customer.lastContactedAt)}</td>
                    </tr>
                  ))
                ) : (
                  <EmptyTableRow columns={6} message="No customers match this view yet." />
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Import / export</h2>
              <p>Bring in a CSV list or export scoped contacts for {user.business.name}.</p>
            </div>
            <Download size={20} />
          </div>
          <div className="panel-body detail-stack">
            {canImport ? <ContactImportForm /> : null}
            <a className="button secondary" href="/dashboard/customers/export">
              <Download size={16} />
              Export contacts
            </a>
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Add customer</h2>
              <p>Manual capture for calls, DMs, walk-ins, and imported leads.</p>
            </div>
            <Plus size={20} />
          </div>
          <div className="panel-body">
            <StatefulForm action={createCustomerAction}>
              <div className="field">
                <label htmlFor="name">Name</label>
                <input className="input" id="name" name="name" placeholder="Customer name" required />
              </div>
              <div className="field">
                <label htmlFor="email">Email</label>
                <input className="input" id="email" name="email" type="text" inputMode="email" placeholder="name@example.com" />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input className="input" id="phone" name="phone" placeholder="(555) 010-0000" />
              </div>
              <div className="field">
                <label htmlFor="segment">Segment</label>
                <input className="input" id="segment" name="segment" placeholder="VIP, New, Local" required />
              </div>
              <div className="field">
                <label htmlFor="tags">Tags</label>
                <input className="input" id="tags" name="tags" placeholder="catering, recital, wholesale" />
              </div>
              <div className="field">
                <label htmlFor="source">Source</label>
                <input className="input" id="source" name="source" placeholder="Instagram, Shopify, Form" required />
              </div>
              <SubmitButton>
                <Plus size={16} />
                Add customer
              </SubmitButton>
            </StatefulForm>
          </div>
        </section>
      </div>
    </>
  );
}
