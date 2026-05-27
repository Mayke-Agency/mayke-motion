import { PageHeader } from "@/components/dashboard/PageHeader";

export default function AdminLoading() {
  return (
    <main className="main">
      <PageHeader
        eyebrow="Mayke Agency"
        title="Loading admin view"
        description="Checking platform accounts, client tenants, and activity."
      />
      <div className="grid cols-3">
        <div className="panel metric-card skeleton" />
        <div className="panel metric-card skeleton" />
        <div className="panel metric-card skeleton" />
      </div>
    </main>
  );
}
