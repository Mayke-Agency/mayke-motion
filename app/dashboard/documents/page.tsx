import { FileText } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { requireBusinessUser } from "@/lib/auth";
import { getSportsDocuments } from "@/lib/sports-data";
import { formatDate } from "@/lib/format";

export default async function DocumentsPage() {
  const user = await requireBusinessUser(); if (user.business.businessType.code !== "SPORTS_CLUB") return <><PageHeader eyebrow="Club records" title="Documents" description="Document management is part of Sports Club operations." /><EmptyState title="Not enabled for this workspace" description="Documents are only available for club workspaces." /></>;
  const documents = await getSportsDocuments(user.business.id);
  return <><PageHeader eyebrow="Club records" title="Documents" description="Birth certificates, insurance cards, medical forms, waivers, and player photos remain linked to the correct family or player." /><section className="panel"><div className="panel-header"><div><h2>Document register</h2><p>Storage-provider upload wiring is intentionally pending; this register tracks requested and received records now.</p></div><FileText size={20} /></div><div className="panel-body table-wrap"><table className="data-table"><thead><tr><th>Document</th><th>Player</th><th>Family</th><th>Status</th><th>Expires</th></tr></thead><tbody>{documents.length ? documents.map((document) => <tr key={document.id}><td><strong>{document.name}</strong><div style={{ color: "var(--muted)", marginTop: 4 }}>{document.type.replaceAll("_", " ").toLowerCase()}</div></td><td>{document.player ? `${document.player.firstName} ${document.player.lastName}` : "-"}</td><td>{document.family?.familyName ?? "-"}</td><td><StatusBadge status={document.status} /></td><td>{formatDate(document.expiresAt)}</td></tr>) : <EmptyTableRow columns={5} message="No documents are registered yet." />}</tbody></table></div></section></>;
}
