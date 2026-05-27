import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CircleDollarSign, ClipboardList, Megaphone, Users } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { requireAdmin } from "@/lib/auth";
import { getAdminClient, getDashboardSummary } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";

export default async function AdminClientDashboardPreviewPage({
  params
}: {
  params: Promise<{ businessId: string }>;
}) {
  await requireAdmin();
  const { businessId } = await params;
  const { business } = await getAdminClient(businessId);

  if (!business) {
    notFound();
  }

  const summary = await getDashboardSummary(business.id, business.businessType.code);

  return (
    <main className="main">
      <div style={{ marginBottom: 18 }}>
        <Link className="button ghost" href={`/admin/clients/${business.id}`}>
          <ArrowLeft size={16} />
          Back to client settings
        </Link>
      </div>

      <PageHeader
        eyebrow="Admin dashboard preview"
        title={business.name}
        description="A Mayke admin preview of the core client dashboard signals without switching accounts."
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <MetricCard icon={CircleDollarSign} label="Revenue" value={formatCurrency(summary.revenue)} delta="Tracked sales" />
        <MetricCard icon={Users} label="CRM contacts" value={summary.customerCount.toString()} delta="Business scoped" />
        <MetricCard icon={ClipboardList} label="Open inquiries" value={summary.openInquiries.toString()} delta="Needs attention" />
        <MetricCard icon={Megaphone} label="Campaigns" value={summary.campaigns.length.toString()} delta="Recent records" />
      </div>

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Priority alerts</h2>
            <p>Current attention items for this client.</p>
          </div>
        </div>
        <div className="panel-body">
          {summary.alerts.length ? (
            <div className="alert-list">
              {summary.alerts.map((alert) => (
                <div className="alert-item" key={alert.id}>
                  <span className="role-badge">{alert.label}</span>
                  <div>
                    <strong>{alert.title}</strong>
                    <p>{alert.description}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState title="Everything looks caught up." description="No current dashboard alerts for this client." />
          )}
        </div>
      </section>
    </main>
  );
}
