import { CircleDollarSign } from "lucide-react";
import { EmptyTableRow } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { businessTypeCopy } from "@/lib/business-config";
import { getSales } from "@/lib/dashboard-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function SalesPage() {
  const user = await requireBusinessUser();
  const sales = await getSales(user.business.id);
  const total = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const avg = sales.length ? total / sales.length : 0;
  const copy = businessTypeCopy[user.business.businessType.code];

  return (
    <>
      <PageHeader
        eyebrow={copy.salesLabel}
        title="Sales activity"
        description="Track revenue and order movement now, with integration lanes reserved for Stripe, Shopify, Toast, and Square."
      />

      <div className="grid cols-3" style={{ marginBottom: 16 }}>
        <MetricCard icon={CircleDollarSign} label="Revenue tracked" value={formatCurrency(total)} delta="+12.4%" />
        <MetricCard icon={CircleDollarSign} label="Average sale" value={formatCurrency(avg)} delta="Demo period" />
        <MetricCard icon={CircleDollarSign} label="Orders" value={sales.length.toString()} delta="Tracked records" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Order ledger</h2>
            <p>Prisma-backed transactions with line items for product and menu analytics.</p>
          </div>
        </div>
        <div className="panel-body table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sale</th>
                <th>Customer</th>
                <th>Channel</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {sales.length ? (
                sales.map((sale) => (
                  <tr key={sale.id}>
                    <td>
                      <strong>{sale.saleNumber}</strong>
                    </td>
                    <td>{sale.customer?.name ?? "Guest checkout"}</td>
                    <td>{sale.channel}</td>
                    <td>{sale.saleItems.length}</td>
                    <td>{formatCurrency(sale.total)}</td>
                    <td>
                      <StatusBadge status={sale.status} />
                    </td>
                    <td>{formatDate(sale.placedAt)}</td>
                  </tr>
                ))
              ) : (
                <EmptyTableRow columns={7} message="No sales have been recorded yet." />
              )}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
