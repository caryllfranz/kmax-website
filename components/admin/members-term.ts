import type { Member } from "./demo-store";

export type MembershipCategory = "current" | "expiring" | "expired" | "upcoming";

function daysUntil(endsOn: string, today: string) {
  return Math.round((Date.parse(`${endsOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000);
}

export function membershipStatus(startsOn: string, endsOn: string, today: string): { label: string; category: MembershipCategory } {
  if (startsOn > today) return { label: "Upcoming", category: "upcoming" };
  if (endsOn < today) return { label: "Expired", category: "expired" };
  const days = daysUntil(endsOn, today);
  if (days === 0) return { label: "Expires today", category: "expiring" };
  if (days <= 7) return { label: `Expires in ${days} ${days === 1 ? "day" : "days"}`, category: "expiring" };
  return { label: "Current", category: "current" };
}

export function timeLeft(endsOn: string, today: string) {
  const days = daysUntil(endsOn, today);
  if (days === 0) return "Today";
  return days < 0 ? `${Math.abs(days)} ${days === -1 ? "day" : "days"} ago` : `${days} ${days === 1 ? "day" : "days"}`;
}

export function termFor(member: Member, today: string) {
  const terms = [member, ...member.history];
  const current = terms.filter((term) => term.startsOn <= today && term.endsOn >= today)
    .sort((a, b) => a.endsOn.localeCompare(b.endsOn) || a.startsOn.localeCompare(b.startsOn));
  const future = terms.filter((term) => term.startsOn > today)
    .sort((a, b) => a.startsOn.localeCompare(b.startsOn) || a.endsOn.localeCompare(b.endsOn));
  const ended = terms.filter((term) => term.endsOn < today)
    .sort((a, b) => b.endsOn.localeCompare(a.endsOn) || b.startsOn.localeCompare(a.startsOn));
  return current[0] ?? future[0] ?? ended[0] ?? member;
}
