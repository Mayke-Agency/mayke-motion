import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicSportsWebsitePage } from "@/lib/sports-data";

export default async function ClubWebsitePage({ params }: { params: Promise<{ slug: string; pageSlug: string }> }) {
  const { slug, pageSlug } = await params;
  const page = await getPublicSportsWebsitePage(slug, pageSlug);
  if (!page) notFound();
  return <main className="public-registration"><section className="registration-hero"><p className="eyebrow">{page.business.name}</p><h1>{page.title}</h1><p>{page.summary ?? page.business.description}</p><Link className="button secondary" href={`/club/${slug}`}>Club home</Link></section><section className="panel"><div className="panel-body"><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.8 }}>{page.content ?? "Page content is being prepared by Mayke Agency."}</div></div></section></main>;
}
