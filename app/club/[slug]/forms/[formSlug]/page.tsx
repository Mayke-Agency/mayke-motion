import Link from "next/link";
import { notFound } from "next/navigation";
import { PublicSportsForm } from "@/components/sports/PublicSportsForm";
import { getPublicSportsForm } from "@/lib/sports-data";

export default async function PublicClubFormPage({ params }: { params: Promise<{ slug: string; formSlug: string }> }) {
  const { slug, formSlug } = await params; const form = await getPublicSportsForm(slug, formSlug); if (!form) notFound();
  return <main className="public-registration"><section className="registration-hero"><p className="eyebrow">{form.business.name}</p><h1>{form.title}</h1><p>{form.description ?? "Complete this form and the Ghost Baseball Club team will follow up with next steps."}</p><Link className="button secondary" href={`/club/${slug}`}>Club home</Link></section><section className="panel"><PublicSportsForm formId={form.id} fee={Number(form.fee)} /></section></main>;
}
