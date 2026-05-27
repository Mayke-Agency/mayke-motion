import { Activity } from "lucide-react";
import { formatDate } from "@/lib/format";

type ActivityFeedProps = {
  items: {
    id: string;
    actor: string;
    action: string;
    entity: string;
    createdAt: Date;
  }[];
};

export function ActivityFeed({ items }: ActivityFeedProps) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Activity feed</h2>
          <p>Recent customer, campaign, and operations movement.</p>
        </div>
      </div>
      <div className="panel-body activity-list">
        {items.map((item) => (
          <div className="activity-item" key={item.id}>
            <div className="activity-dot">
              <Activity size={16} />
            </div>
            <div>
              <strong>
                {item.actor} {item.action.toLowerCase()}
              </strong>
              <p>
                {item.entity} · {formatDate(item.createdAt)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
