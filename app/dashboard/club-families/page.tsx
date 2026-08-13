import Link from "next/link";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { requireBusinessUser } from "@/lib/auth";
import { getSportsFamilies } from "@/lib/sports-data";
import { formatCurrency } from "@/lib/format";

export default async function ClubFamiliesPage() {
  const user = await requireBusinessUser();
  if (user.business.businessType.code !== "SPORTS_CLUB") return <><PageHeader eyebrow="Club CRM" title="Families" description="Family profiles are part of Sports Club operations." /><EmptyState title="Not enabled for this workspace" description="Families are only available for club workspaces." /></>;
  const families = await getSportsFamilies(user.business.id);
  return <><PageHeader eyebrow="Club CRM" title="Families" description="Billing contacts, multiple players, documents, and outstanding balances stay together." /><section className="panel"><div className="panel-header"><div><h2>Family directory</h2><p>{families.length} club family profiles with linked CRM contacts.</p></div></div><div className="panel-body table-wrap"><table className="data-table"><thead><tr><th>Family</th><th>Billing contact</th><th>Players</th><th>Balance</th><th>Documents</th><th>Status</th></tr></thead><tbody>{families.length ? families.map((family) => { const open = family.invoices.filter((invoice) => ["OPEN", "PENDING", "PAST_DUE"].includes(invoice.status)).reduce((sum, invoice) => sum + Number(invoice.amount), 0); return <tr key={family.id}><td><strong>{family.familyName}</strong><div style={{ color: "var(--muted)", marginTop: 4 }}>{family.customer.email}</div></td><td>{family.billingContact ?? family.customer.name}</td><td>{family.players.map((player) => player.firstName).join(", ") || "-"}</td><td>{formatCurrency(open)}</td><td>{family.documents.length}</td><td><StatusBadge status={family.paymentStatus} /></td></tr>; }) : <EmptyTableRow columns={6} message="No club family profiles yet." />}</tbody></table></div></section><div className="notice" style={{ marginTop: 16 }}>Family records are created automatically when staff add a player or a parent completes a club form. Use <Link href="/dashboard/players">Players</Link> to add the first family.</div></>;
}
