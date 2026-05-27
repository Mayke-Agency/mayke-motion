import { BarChart3, CircleDollarSign, ClipboardList, Users } from "lucide-react";
import { RevenueChart, TopItemsChart } from "@/components/dashboard/Charts";
import { MetricCard } from "@/components/dashboard/MetricCard";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { businessTypeCopy } from "@/lib/business-config";
import { getDashboardSummary } from "@/lib/dashboard-data";
import { formatCurrency } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function AnalyticsPage() {
  const user = await requireBusinessUser();
  const type = user.business.businessType.code;
  const summary = await getDashboardSummary(user.business.id, type);
  const copy = businessTypeCopy[type];

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Performance intelligence"
        description={`${copy.label} analytics for revenue, ${copy.salesLabel.toLowerCase()}, customer growth, inquiries, and catalog performance.`}
      />

      <div className="grid cols-4" style={{ marginBottom: 16 }}>
        <MetricCard icon={CircleDollarSign} label="Revenue" value={formatCurrency(summary.revenue)} delta="+12.4%" />
        <MetricCard icon={BarChart3} label={copy.salesLabel} value={summary.orderCount.toString()} delta="+5.1%" />
        <MetricCard icon={Users} label="Customer growth" value={`+${Math.max(1, summary.customerCount - 2)}`} delta="Demo month" />
        <MetricCard icon={ClipboardList} label="Open inquiries" value={summary.openInquiries.toString()} delta="Active queue" />
      </div>

      <div className="grid cols-2">
        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>Revenue trend</h2>
              <p>High-level monthly performance view.</p>
            </div>
          </div>
          <div className="panel-body">
            <RevenueChart data={summary.revenueData} />
          </div>
        </section>

        <section className="panel">
          <div className="panel-header">
            <div>
              <h2>{type === "RESTAURANT" ? "Popular menu items" : type === "DANCE_STUDIO" ? "Top programs" : "Top-performing products"}</h2>
              <p>Category-specific operating signal for growth decisions.</p>
            </div>
          </div>
          <div className="panel-body">
            <TopItemsChart data={summary.topItems} />
          </div>
        </section>
      </div>
    </>
  );
}
