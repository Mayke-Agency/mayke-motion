import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

export default async function ClubHomePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const club = await prisma.business.findFirst({ where: { slug, businessType: { code: "SPORTS_CLUB" } }, include: { websitePages: { where: { published: true } }, sportsTeams: { where: { active: true } } } });
  if (!club) notFound();
  const home = club.websitePages.find((page) => page.slug === "home");
  return <main className="public-registration"><section className="registration-hero"><p className="eyebrow">{club.name}</p><h1>{home?.title ?? "Baseball built for the next level."}</h1><p>{home?.summary ?? club.description}</p><div className="button-row"><Link className="button" href={`/club/${club.slug}/tryouts`}>Explore tryouts</Link><Link className="button secondary" href={`/club/${club.slug}/teams`}>View teams</Link></div></section><section className="panel"><div className="panel-header"><div><h2>Ghost Baseball Club</h2><p>{club.description}</p></div></div><div className="panel-body"><div className="tag-row">{club.websitePages.filter((page) => page.slug !== "home").map((page) => <Link key={page.id} href={`/club/${club.slug}/${page.slug}`}>{page.title}</Link>)}</div><div className="timeline-list" style={{ marginTop: 20 }}>{club.sportsTeams.map((team) => <article key={team.id} className="timeline-item"><strong>{team.name}</strong><p>{team.ageGroup} · {team.season}</p></article>)}</div></div></section></main>;
}
