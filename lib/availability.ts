import { etDayKey, etParts, etToUtc, formatEt } from "@/lib/time";

/**
 * Academy hours from the Setmore booking page. `end` is the closing clock hour,
 * so the last block a coach can open starts one hour earlier.
 * Sunday and Saturday 8 AM–5 PM, Monday–Wednesday 9 AM–9 PM, Thursday and Friday 9 AM–5 PM.
 */
const WINDOWS: Record<number, { start: number; end: number }> = {
  0: { start: 8, end: 17 },
  1: { start: 9, end: 21 },
  2: { start: 9, end: 21 },
  3: { start: 9, end: 21 },
  4: { start: 9, end: 17 },
  5: { start: 9, end: 17 },
  6: { start: 8, end: 17 },
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export type DayOpening = {
  unavailable: boolean;
  hours: number[];
};

/** Coach name → day key → saved day. A coach key with no day means that day is closed. */
export type OpeningsByCoach = Record<string, Record<string, DayOpening>>;

export function weekdayIndexForDayKey(dayKey: string) {
  const name = formatEt(etToUtc(dayKey, "12:00"), { weekday: "short" });
  const index = WEEKDAYS.indexOf(name);
  return index === -1 ? 0 : index;
}

export function hourStartsForDay(dayKey: string) {
  const window = WINDOWS[weekdayIndexForDayKey(dayKey)] ?? { start: 6, end: 21 };
  const hours: number[] = [];
  for (let hour = window.start; hour < window.end; hour += 1) hours.push(hour);
  return hours;
}

export function formatHourLabel(hour: number) {
  const stamp = etToUtc("2026-06-15", `${String(hour).padStart(2, "0")}:00`);
  return formatEt(stamp, { hour: "numeric" });
}

/** Clock hours a session overlaps. 5:30–6:30 PM covers 5 PM and 6 PM. */
export function hoursCoveredBySession(startsAt: Date, endsAt: Date) {
  const startParts = etParts(startsAt);
  const endParts = etParts(endsAt);
  const startMin = Number(startParts.hour) * 60 + Number(startParts.minute);
  let endMin = Number(endParts.hour) * 60 + Number(endParts.minute);
  if (etDayKey(endsAt) !== etDayKey(startsAt)) endMin += 24 * 60;
  if (endMin <= startMin) endMin = startMin + 60;
  const hours: number[] = [];
  for (let minute = Math.floor(startMin / 60) * 60; minute < endMin; minute += 60) {
    hours.push(Math.floor(minute / 60) % 24);
  }
  return hours;
}

export function sessionWithinOpening(
  session: { coach: string | null; startsAt: string | Date; endsAt: string | Date },
  openings: OpeningsByCoach,
) {
  if (!session.coach) return true;
  const days = openings[session.coach];
  if (!days) return true;
  const start = typeof session.startsAt === "string" ? new Date(session.startsAt) : session.startsAt;
  const end = typeof session.endsAt === "string" ? new Date(session.endsAt) : session.endsAt;
  const row = days[etDayKey(start)];
  if (!row || row.unavailable || row.hours.length === 0) return false;
  return hoursCoveredBySession(start, end).every((hour) => row.hours.includes(hour));
}
