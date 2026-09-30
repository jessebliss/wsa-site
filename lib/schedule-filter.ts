import { sessionWithinOpening, type OpeningsByCoach } from "@/lib/availability";
import { etDayKey } from "@/lib/time";

export type ScheduleKind = "ALL" | "GROUP" | "CAMP" | "PRIVATE";

export type FilterableSession = {
  kind: "GROUP" | "CAMP" | "PRIVATE" | string;
  program: string;
  coach: string | null;
  startsAt: string;
  endsAt: string;
};

export type PackageTarget = {
  program: string;
  coach: string;
};

export type ScheduleFilter = {
  kind: ScheduleKind;
  program: string;
  coach: string;
};

export function sessionOnDay(session: { startsAt: string }, dayKey: string) {
  return etDayKey(new Date(session.startsAt)) === dayKey;
}

export function sessionMatchesFilter(session: FilterableSession, filter: ScheduleFilter) {
  if (filter.kind !== "ALL" && session.kind !== filter.kind) return false;
  if (filter.program && session.program !== filter.program) return false;
  if (filter.coach && session.coach !== filter.coach) return false;
  return true;
}

export function sessionBelongsToPackage(session: FilterableSession, offer: PackageTarget) {
  if (session.program !== offer.program) return false;
  if (offer.coach && session.coach !== offer.coach) return false;
  return true;
}

/** A package matches the program and coach chips directly. Group, Camp, and Private match when that package has a session of that type. */
export function packageMatchesFilter(offer: PackageTarget, sessions: FilterableSession[], filter: ScheduleFilter) {
  if (filter.program && offer.program !== filter.program) return false;
  if (filter.coach && offer.coach !== filter.coach) return false;
  if (filter.kind === "ALL") return true;
  return sessions.some(
    (session) =>
      session.kind === filter.kind &&
      session.program === offer.program &&
      (!offer.coach || session.coach === offer.coach),
  );
}

export function visibleDayKeys(dayKeys: string[], sessions: FilterableSession[], offerings: PackageTarget[], filter: ScheduleFilter) {
  return dayKeys.filter((key) => listedSessions(sessions, offerings, filter, {}, key).length > 0);
}

/** Sessions a parent can book: filters, then a coach login's saved hours. Coaches without a login stay on the admin schedule. */
export function listedSessions<T extends FilterableSession>(
  sessions: T[],
  offerings: PackageTarget[],
  filter: ScheduleFilter,
  openings: OpeningsByCoach,
  dayKey?: string,
) {
  const narrowed = filter.kind !== "ALL" || Boolean(filter.program) || Boolean(filter.coach);
  const packages = narrowed ? offerings.filter((offer) => packageMatchesFilter(offer, sessions, filter)) : [];
  return sessions.filter((session) => {
    if (dayKey && !sessionOnDay(session, dayKey)) return false;
    if (!sessionWithinOpening(session, openings)) return false;
    if (!narrowed) return true;
    if (!sessionMatchesFilter(session, filter)) return false;
    return packages.some((offer) => sessionBelongsToPackage(session, offer));
  });
}
