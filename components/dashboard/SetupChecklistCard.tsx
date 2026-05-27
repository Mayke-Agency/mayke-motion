import Link from "next/link";
import { ArrowRight, CheckCircle2, Circle } from "lucide-react";
import type { SetupChecklistItem } from "@/lib/dashboard-data";

type SetupChecklistCardProps = {
  items: SetupChecklistItem[];
  completedCount: number;
  totalCount: number;
  percent: number;
  complete: boolean;
  adminBusinessId?: string;
  title?: string;
};

function itemHref(item: SetupChecklistItem, adminBusinessId?: string) {
  if (!adminBusinessId) return item.href;
  if (item.key === "contacts") return `/admin/clients/${adminBusinessId}`;
  if (item.key === "stripe" || item.key === "email") return `/admin/clients/${adminBusinessId}`;
  return `/admin/clients/${adminBusinessId}`;
}

export function SetupChecklistCard({ items, completedCount, totalCount, percent, complete, adminBusinessId, title = "Setup checklist" }: SetupChecklistCardProps) {
  if (complete && !adminBusinessId) {
    return (
      <section className="panel setup-checklist-card collapsed">
        <div className="panel-header">
          <div>
            <h2>Setup complete</h2>
            <p>All launch readiness items are complete.</p>
          </div>
          <CheckCircle2 size={20} />
        </div>
      </section>
    );
  }

  return (
    <section className="panel setup-checklist-card">
      <div className="panel-header">
          <div>
            <h2>{title}</h2>
          <p>{complete ? "This client is ready for daily use." : "Finish these items before the dashboard is fully live."}</p>
        </div>
        <span className="stat-pill">{completedCount}/{totalCount}</span>
      </div>
      <div className="panel-body detail-stack">
        <div className="setup-progress" aria-label={`Setup checklist ${percent}% complete`}>
          <div>
            <strong>{percent}% complete</strong>
            <span>{totalCount - completedCount} remaining</span>
          </div>
          <div className="setup-progress-track">
            <span style={{ width: `${percent}%` }} />
          </div>
        </div>
        <div className="timeline-list">
          {items.map((item) => (
            <Link className="timeline-item setup-checklist-item" href={itemHref(item, adminBusinessId)} key={item.key}>
              <div>
                <strong>{item.label}</strong>
                {item.complete ? <CheckCircle2 size={16} /> : <Circle size={16} />}
              </div>
              <p>{item.detail}</p>
              <span>
                {adminBusinessId ? "Open client setup" : "Open setup"}
                <ArrowRight size={13} />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
