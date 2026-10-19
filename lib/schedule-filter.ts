import { sessionWithinOpening, type OpeningsByCoach } from "@/lib/availability";
import {
  GROUP_QUARTERBACK_LABEL,
  PRIVATE_QUARTERBACK_KEY,
  PRIVATE_QUARTERBACK_LABEL,
  QUARTERBACK_PROGRAM,
  isPrivateQuarterback,
} from "@/lib/private-quarterback";
import { etDayKey } from "@/lib/time";

type OfferingSession = {
  kind: string;
  program: string;
  title: string;
};

/**
 * Camp is its own offering. Private quarterback lessons are their own choice.
 * Other sessions are one choice per program, not per coach.
 */
export function offeringKey(session: OfferingSession) {
  if (session.kind === "CAMP") return `camp:${session.title}`;
  if (isPrivateQuarterback(session)) return PRIVATE_QUARTERBACK_KEY;
  return `program:${session.program}`;
}

export function offeringLabel(session: OfferingSession) {
  if (session.kind === "CAMP") return session.title;
  if (isPrivateQuarterback(session)) return PRIVATE_QUARTERBACK_LABEL;
  if (session.program === QUARTERBACK_PROGRAM) return GROUP_QUARTERBACK_LABEL;
  return session.program;
}

export function offeringRank(session: OfferingSession) {
  if (isPrivateQuarterback(session)) return 0;
  if (session.kind === "CAMP") return 40;
  if (session.program === QUARTERBACK_PROGRAM) return 1;
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
