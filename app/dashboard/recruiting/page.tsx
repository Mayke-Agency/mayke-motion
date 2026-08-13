import { GraduationCap } from "lucide-react";
import { EmptyState, EmptyTableRow } from "@/components/dashboard/EmptyState";
import { PageHeader } from "@/components/dashboard/PageHeader";
import { StatusBadge } from "@/components/dashboard/StatusBadge";
import { requireBusinessUser } from "@/lib/auth";
import { getSportsPlayers } from "@/lib/sports-data";

export default async function RecruitingPage() {
  const user = await requireBusinessUser(); if (user.business.businessType.code !== "SPORTS_CLUB") return <><PageHeader eyebrow="Player development" title="Recruiting" description="Recruiting is part of Sports Club operations." /><EmptyState title="Not enabled for this workspace" description="Recruiting is only available for club workspaces." /></>;
  const players = await getSportsPlayers(user.business.id); const recruits = players.filter((player) => player.graduationYear || player.highlightVideoUrl || player.collegeInterestLevel);
  return <><PageHeader eyebrow="Player development" title="Recruiting" description="A club-owned recruiting view for graduation year, positions, academics, measurables, video, and college interest." /><section className="panel"><div className="panel-header"><div><h2>Recruiting board</h2><p>College coach access is future-ready but deliberately not exposed yet.</p></div><GraduationCap size={20} /></div><div className="panel-body table-wrap"><table className="data-table"><thead><tr><th>Player</th><th>Grad year</th><th>Positions</th><th>GPA</th><th>Measurables</th><th>Interest</th></tr></thead><tbody>{recruits.length ? recruits.map((player) => <tr key={player.id}><td><strong>{player.firstName} {player.lastName}</strong></td><td>{player.graduationYear ?? "-"}</td><td>{player.positions.join(", ") || "-"}</td><td>{player.gpa ? Number(player.gpa).toFixed(2) : "-"}</td><td>{[player.height, player.weight, player.throws && `Throws ${player.throws}`, player.bats && `Bats ${player.bats}`].filter(Boolean).join(" · ") || "Not entered"}</td><td><StatusBadge status={player.collegeInterestLevel ?? "EARLY_STAGE"} /></td></tr>) : <EmptyTableRow columns={6} message="No recruiting profiles are ready yet. Add player academic and profile details as they become available." />}</tbody></table></div></section></>;
}
