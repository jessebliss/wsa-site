import { sessionWithinOpening, type OpeningsByCoach } from "@/lib/availability";
import { etDayKey } from "@/lib/time";

type OfferingSession = {
  kind: string;
  program: string;
  title: string;
};

/** Camp is its own offering. Everything else is one choice per program, not per coach. */
export function offeringKey(session: OfferingSession) {
  if (session.kind === "CAMP") return `camp:${session.title}`;
  return `program:${session.program}`;
}

export function offeringLabel(session: OfferingSession) {
  if (session.kind === "CAMP") return session.title;
  return session.program;
}

export function offeringRank(session: OfferingSession) {
  if (session.kind === "CAMP") return 40;
  if (session.program === "Quarterback Training") return 0;
  if (session.program === "Speed & Agility") return 10;
  if (session.program === "Girls Flag") return 20;
  return 30;
}

export function openSessions<T extends OfferingSession & { coach: string | null; startsAt: string; endsAt: string; spotsLeft: number }>(
  sessions: T[],
  openings: OpeningsByCoach,
) {
  return sessions.filter((session) => session.spotsLeft > 0 && sessionWithinOpening(session, openings));
}

export function sessionsOnDay<T extends { startsAt: string }>(sessions: T[], dayKey: string) {
  return sessions.filter((session) => etDayKey(new Date(session.startsAt)) === dayKey);
}
