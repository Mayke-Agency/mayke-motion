import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: string;
};

export function MetricCard({ icon: Icon, label, value, delta }: MetricCardProps) {
  return (
    <section className="panel metric-card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div className="metric-icon">
          <Icon size={19} />
        </div>
        {delta ? <span className="metric-delta">{delta}</span> : null}
      </div>
      <div>
        <div className="metric-value">{value}</div>
        <div className="metric-label">{label}</div>
      </div>
    </section>
  );
}
