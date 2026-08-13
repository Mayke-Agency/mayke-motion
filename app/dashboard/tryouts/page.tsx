import Link from "next/link";
import { ClipboardSignature, ExternalLink } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { requireBusinessUser } from "@/lib/auth";
import { getSportsForms } from "@/lib/sports-data";
import { formatDate } from "@/lib/format";

export default async function TryoutsPage() {
  const user = await requireBusinessUser(); if (user.business.businessType.code !== "SPORTS_CLUB") return <><PageHeader eyebrow="Club intake" title="Tryouts" description="Tryouts are part of Sports Club operations." /><EmptyState title="Not enabled for this workspace" description="Tryouts are only available for club workspaces." /></>;
  const forms = await getSportsForms(user.business.id); const tryoutForms = forms.filter((form) => form.type === "TRYOUT"); const submissions = tryoutForms.flatMap((form) => form.submissions.map((submission) => ({ ...submission, form }))).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return <><PageHeader eyebrow="Club intake" title="Tryouts" description="Review tryout interest, family contact details, and prospective player profiles from shareable forms." action={<Link className="button" href="/dashboard/forms">Create tryout form</Link>} /><section className="panel"><div className="panel-header"><div><h2>Tryout submissions</h2><p>{submissions.length} submitted forms from club prospects.</p></div><ClipboardSignature size={20} /></div><div className="panel-body table-wrap"><table className="data-table"><thead><tr><th>Player</th><th>Family</th><th>Form</th><th>Status</th><th>Submitted</th><th></th></tr></thead><tbody>{submissions.length ? submissions.map((submission) => <tr key={submission.id}><td>{submission.player ? `${submission.player.firstName} ${submission.player.lastName}` : "Prospect"}</td><td>{submission.family?.familyName ?? "-"}</td><td>{submission.form.title}</td><td><StatusBadge status={submission.status} /></td><td>{formatDate(submission.createdAt)}</td><td><a className="button ghost" href={`/club/${user.business.slug}/forms/${submission.form.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={14} />Open form</a></td></tr>) : <EmptyTableRow columns={6} message="No tryout submissions yet. Share a tryout form from Forms & waivers." />}</tbody></table></div></section></>;
}
