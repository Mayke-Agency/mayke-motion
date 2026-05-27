import Link from "next/link";
import { Inbox, Mail, Send } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { getCommunicationHub } from "@/lib/dashboard-data";
import { formatDate } from "@/lib/format";
import { requireBusinessUser } from "@/lib/auth";

export default async function CommunicationsPage({
  searchParams
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await requireBusinessUser();
  const params = await searchParams;
  const activeTab = params.tab === "outbox" ? "outbox" : "inbox";
  const communications = await getCommunicationHub(user.business.id);
  const items = activeTab === "outbox" ? communications.outbox : communications.inbox;

  return (
    <>
      <PageHeader
        eyebrow="Communication hub"
        title="Inbox and outbox"
        description="A focused view of inbound requests, sent follow-ups, campaign messages, notes, and contact history."
      />

      <section className="panel">
        <div className="panel-header">
          <div>
            <h2>{activeTab === "outbox" ? "Outbox" : "Inbox"}</h2>
            <p>
              {activeTab === "outbox"
                ? "Sent and drafted customer follow-ups, plus campaign send records."
                : "Inbound inquiries and messages that need review or follow-up."}
            </p>
          </div>
          {activeTab === "outbox" ? <Send size={20} /> : <Inbox size={20} />}
        </div>
        <div className="panel-body">
          <div className="button-row" style={{ marginBottom: 18 }}>
            <Link className={`button ${activeTab === "inbox" ? "" : "secondary"}`} href="/dashboard/communications?tab=inbox">
              <Inbox size={16} />
              Inbox
            </Link>
            <Link className={`button ${activeTab === "outbox" ? "" : "secondary"}`} href="/dashboard/communications?tab=outbox">
              <Mail size={16} />
              Outbox
            </Link>
          </div>

          {items.length ? (
            <div className="timeline-list">
              {items.map((item) => (
                <Link className="timeline-item" href={item.href} key={item.id}>
                  <div>
                    <strong>{item.subject}</strong>
                    <StatusBadge status={item.status} />
                  </div>
                  <p>
                    {item.kind} · {item.contact} · {formatDate(item.date)}
                  </p>
                  <p>{item.preview}</p>
                  <span>{item.meta}</span>
                </Link>
              ))}
            </div>
          ) : (
            <EmptyState
              title={activeTab === "outbox" ? "No outbound messages yet" : "No inbound messages yet"}
              description={activeTab === "outbox" ? "Follow-ups and campaign sends will appear here." : "New inquiries and inbound messages will appear here."}
            />
          )}
        </div>
      </section>
    </>
  );
}
