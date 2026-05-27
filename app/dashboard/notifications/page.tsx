import { Bell } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getNotifications } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function NotificationsPage() {
  const user = await requireBusinessUser();
  const notifications = await getNotifications(user.business.id);

  return (
    <>
      <PageHeader
        eyebrow="Notifications"
        title="Client signal center"
        description="Important workflow, campaign, integration, and account signals for the team."
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>Workspace notifications</h2>
            <p>{notifications.filter((item) => item.status === "UNREAD").length} unread signals for {user.business.name}.</p>
          </div>
          <Bell size={20} />
        </div>
        <div className="panel-body">
          {notifications.length ? (
            <div className="timeline-list">
              {notifications.map((notification) => (
                <article className="timeline-item" key={notification.id}>
                  <div>
                    <strong>{notification.title}</strong>
                    <StatusBadge status={notification.status} />
                  </div>
                  <p>{notification.body}</p>
                  <p>{formatDate(notification.createdAt)}</p>
                </article>
              ))}
            </div>
          ) : (
            <EmptyState title="No notifications" description="Workflow and integration alerts will appear here when action is needed." />
          )}
        </div>
      </section>
    </>
  );
}
