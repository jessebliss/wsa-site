import type { OpeningsByCoach } from "@/lib/availability";
import { etToUtc } from "@/lib/time";

export const QUARTERBACK_PROGRAM = "Quarterback Training";
export const PRIVATE_QUARTERBACK_LABEL = "Quarterback Training";
export const GROUP_QUARTERBACK_LABEL = "Monthly group quarterback";
export const PRIVATE_QUARTERBACK_KEY = "private:quarterback";

/** Coaches who give individual quarterback lessons, in schedule order. */
export const QUARTERBACK_COACHES = ["Ryan Walker", "Matt Considine", "Jim McLeod", "Tannor Watson"] as const;

const FALLBACK_CENTS: Record<string, number> = {
  "Ryan Walker": 12500,
  "Matt Considine": 8000,
  "Jim McLeod": 8000,
  "Tannor Watson": 8000,
};

export const PRIVATE_LESSON_LOCATION = "Chuck Rogers Park, 11950 San Jose Boulevard, Jacksonville, FL 32223";

export function isPrivateQuarterback(session: { kind: string; program: string }) {
  return session.kind === "PRIVATE" && session.program === QUARTERBACK_PROGRAM;
}

/**
 * Private lesson price for a coach. A saved private price wins. Otherwise the
 * quarterback one-time (group drop-in) price. The named fallbacks are those
 * one-time prices: Ryan $125, Matt, Jim, and Tannor $80. Monthly plans are not used.
 */
export function privateQuarterbackPriceCents(coach: string, privateCents: number | null, groupCents: number | null) {
  if (privateCents != null) return privateCents;
  if (groupCents != null) return groupCents;
  return FALLBACK_CENTS[coach] ?? 8000;
}

export function coachHasLogin(openings: OpeningsByCoach, coach: string) {
  return Object.hasOwn(openings, coach);
}

export type PrivateHourSession = {
  id: string;
  kind: string;
  program: string;
  coach: string | null;
  startsAt: string;
  endsAt: string;
  spotsLeft: number;
  priceCents: number;
};

export type OpenPrivateHour = {
  hour: number;
  startsAt: string;
  endsAt: string;
  sessionId: string | null;
};

export function privateHourBounds(dayKey: string, hour: number) {
  const startsAt = etToUtc(dayKey, `${String(hour).padStart(2, "0")}:00`);
  const endsAt =
    hour >= 23 ? etToUtc(nextDayKey(dayKey), "00:00") : etToUtc(dayKey, `${String(hour + 1).padStart(2, "0")}:00`);
  return { startsAt, endsAt };
}

function nextDayKey(dayKey: string) {
  const [year, month, day] = dayKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(date.getUTCDate()).padStart(2, "0")}`;
}

function isExactOpenPrivate(session: PrivateHourSession, startsAt: Date, endsAt: Date) {
  return (
    isPrivateQuarterback(session) &&
    session.spotsLeft > 0 &&
    new Date(session.startsAt).getTime() === startsAt.getTime() &&
    new Date(session.endsAt).getTime() === endsAt.getTime()
  );
}

/** Open clock hours on a day a coach saved. Empty when that day is not available. */
export function openPrivateHours(input: {
  coach: string;
  dayKey: string;
  openings: OpeningsByCoach;
  sessions: PrivateHourSession[];
  now: Date;
}): OpenPrivateHour[] {
  const row = input.openings[input.coach]?.[input.dayKey];
  if (!row || row.unavailable || row.hours.length === 0) return [];
  const hours: OpenPrivateHour[] = [];
  for (const hour of [...row.hours].sort((a, b) => a - b)) {
    if (!Number.isInteger(hour)) continue;
    const { startsAt, endsAt } = privateHourBounds(input.dayKey, hour);
    if (startsAt.getTime() <= input.now.getTime()) continue;
    const mine = input.sessions.filter((session) => session.coach === input.coach);
    const exact = mine.find((session) => isExactOpenPrivate(session, startsAt, endsAt));
    const blocked = mine.some((session) => {
      if (exact && session.id === exact.id) return false;
      const start = new Date(session.startsAt).getTime();
      const end = new Date(session.endsAt).getTime();
      return start < endsAt.getTime() && end > startsAt.getTime();
    });
    if (blocked) continue;
    hours.push({
      hour,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      sessionId: exact?.id ?? null,
    });
  }
  return hours;
}

export function privateSeedKey(coach: string, dayKey: string, hour: number) {
  const slug = coach
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `private-qb-${slug}-${dayKey}-${hour}`;
}
