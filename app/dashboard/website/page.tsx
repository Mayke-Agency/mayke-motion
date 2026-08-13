import Link from "next/link";
import { ExternalLink, MonitorCog } from "lucide-react";
import { EmptyState } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatefulForm } from "@/components/forms/StatefulForm";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { requireBusinessUser } from "@/lib/auth";
import { getWebsitePages } from "@/lib/sports-data";
import { saveWebsitePageAction } from "@/lib/sports-actions";

export default async function WebsitePage() {
  const user = await requireBusinessUser(); if (user.business.businessType.code !== "SPORTS_CLUB") return <><PageHeader eyebrow="Website CMS" title="Website CMS" description="Club web content is part of Sports Club operations." /><EmptyState title="Not enabled for this workspace" description="Website CMS is only available for club workspaces." /></>;
  const pages = await getWebsitePages(user.business.id);
  return <><PageHeader eyebrow="Website CMS" title="Website CMS" description="Mayke maintains site structure and creative direction; club staff can keep approved page copy current." action={<a className="button secondary" href={`/club/${user.business.slug}`} target="_blank" rel="noreferrer"><ExternalLink size={16} />Preview site</a>} /><div className="grid cols-2">{pages.length ? pages.map((page) => <section className="panel" key={page.id}><div className="panel-header"><div><h2>{page.title}</h2><p>/{page.slug}</p></div><span className="role-badge">{page.published ? "published" : "draft"}</span></div><div className="panel-body"><StatefulForm action={saveWebsitePageAction}><input type="hidden" name="pageId" value={page.id} /><div className="field"><label htmlFor={`title-${page.id}`}>Page title</label><input className="input" id={`title-${page.id}`} name="title" defaultValue={page.title} required /></div><div className="field"><label htmlFor={`summary-${page.id}`}>Summary</label><textarea className="textarea" id={`summary-${page.id}`} name="summary" defaultValue={page.summary ?? ""} /></div><div className="field"><label htmlFor={`content-${page.id}`}>Page content</label><textarea className="textarea" id={`content-${page.id}`} name="content" defaultValue={page.content ?? ""} style={{ minHeight: 140 }} /></div><label className="module-toggle"><input type="checkbox" name="published" defaultChecked={page.published} /><span>Published</span></label><SubmitButton>Save page</SubmitButton></StatefulForm></div></section>) : <EmptyState title="Website pages are being prepared" description="Provision this club workspace to create the standard Ghost Baseball website page set." />}</div><div className="notice" style={{ marginTop: 16 }}><MonitorCog size={18} /><span>Structural edits, design implementation, and advanced publishing integrations remain managed by Mayke Agency.</span></div></>;
}
