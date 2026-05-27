import { PageHeader } from "@/components/dashboard/PageHeader";

export default function DashboardLoading() {
  return (
    <>
      <PageHeader
        eyebrow="Mayke Motion"
        title="Preparing workspace"
        description="Loading business data, permissions, and dashboard views."
      />
      <div className="grid cols-4" style={{ marginBottom: 18 }}>
        {Array.from({ length: 4 }).map((_, index) => (
          <div className="panel metric-card skeleton" key={index} />
        ))}
      </div>
      <div className="grid cols-2">
        <div className="panel skeleton" />
        <div className="panel skeleton" />
      </div>
    </>
  );
}
