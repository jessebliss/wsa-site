import { QUARTERBACK_COACHES, QUARTERBACK_PROGRAM, SPEED_PROGRAM } from "@/lib/private-quarterback";
import { loadPrivateQuarterbackPrices } from "@/lib/private-quarterback-data";
import { prisma } from "@/lib/prisma";
import { isPlaceholderCoach, parentCoachNames } from "@/lib/schedule-filter";
import { privateBookingPath, publicOrigin } from "@/lib/site-origin";

export type CoachLogin = {
  id: string;
  name: string;
  email: string;
};

export type CoachDirectoryEntry = {
  coachName: string;
  login: CoachLogin | null;
  /** Saved coach email, or the staff login when that is the only address. */
  email: string;
  offersPrivate: boolean;
  offersSpeed: boolean;
  offersFlag: boolean;
  privateCents: number | null;
  speedCents: number | null;
  flagQuarterbackCents: number | null;
  flagAthleteCents: number | null;
  viewPath: string;
  showQr: boolean;
};

export function coachDisplayEmail(saved: string | null | undefined, login: string | null | undefined) {
  const profile = saved?.trim() ?? "";
  if (profile) return profile;
  return login?.trim() ?? "";
}

export async function loadCoachDisplayEmails() {
  const [profiles, staff] = await Promise.all([
    prisma.coachProfile.findMany(),
    prisma.staffUser.findMany({ select: { coachName: true, email: true } }),
  ]);
  const emails: Record<string, string> = {};
  for (const row of staff) {
    const login = row.email.trim();
    if (login) emails[row.coachName] = login;
  }
  for (const row of profiles) {
    const saved = row.email?.trim() ?? "";
    if (saved) emails[row.coachName] = saved;
  }
  return emails;
}

export async function loadCoachDirectory() {
  const origin = await publicOrigin();
  const [coaches, scheduleCoaches, retired, pricedSessions, savedPrices, profiles] = await Promise.all([
    prisma.staffUser.findMany({ orderBy: { name: "asc" } }),
    prisma.trainingSession.findMany({
      where: { coach: { not: null } },
      distinct: ["coach"],
      select: { coach: true },
      orderBy: { coach: "asc" },
    }),
    prisma.retiredCoach.findMany({ select: { coachName: true } }),
    prisma.trainingSession.findMany({
      where: {
        OR: [
          { program: { in: [SPEED_PROGRAM, QUARTERBACK_PROGRAM] } },
          { program: { contains: "flag", mode: "insensitive" } },
        ],
      },
      select: { coach: true, coaches: true, kind: true, program: true, priceCents: true, startsAt: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.coachPrice.findMany(),
    prisma.coachProfile.findMany(),
  ]);

  const scheduleNames = scheduleCoaches.map((session) => session.coach).filter((name): name is string => Boolean(name));
  const retiredNames = new Set(retired.map((row) => row.coachName));
  const loginNames = new Set(coaches.map((coach) => coach.coachName));
  const qrNames = new Set<string>(
    (QUARTERBACK_COACHES as readonly string[]).filter((name) => loginNames.has(name) || !retiredNames.has(name)),
  );
  for (const coach of coaches) qrNames.add(coach.coachName);

  const speedNames = new Set<string>();
  const flagNames = new Set<string>();
  const privateNames = new Set<string>(
    (QUARTERBACK_COACHES as readonly string[]).filter((name) => !retiredNames.has(name)),
  );
  const latestSpeedCents = new Map<string, number>();
  for (const session of pricedSessions) {
    const names = parentCoachNames(session);
    if (session.program === SPEED_PROGRAM) {
      for (const name of names) {
        speedNames.add(name);
        if (!latestSpeedCents.has(name)) latestSpeedCents.set(name, session.priceCents);
      }
    }
    if (session.kind === "PRIVATE" && session.program === QUARTERBACK_PROGRAM) {
      for (const name of names) privateNames.add(name);
    }
    if (/flag/i.test(session.program)) {
      for (const name of names) flagNames.add(name);
    }
  }

  const savedByName = new Map(savedPrices.map((row) => [row.coachName, row]));
  const priceNames = [...privateNames];
  for (const name of [...speedNames].sort((a, b) => a.localeCompare(b))) {
    if (!priceNames.includes(name)) priceNames.push(name);
  }
  const privateShown = await loadPrivateQuarterbackPrices(priceNames.filter((name) => privateNames.has(name)));

  const logins = new Map(coaches.map((coach) => [coach.coachName, coach]));
  const profileEmails = new Map(profiles.map((row) => [row.coachName, row.email]));
  const ordered: string[] = [...QUARTERBACK_COACHES];
  for (const name of [...priceNames, ...flagNames, ...qrNames, ...coaches.map((coach) => coach.coachName)]) {
    if (!ordered.includes(name)) ordered.push(name);
  }

  const entries: CoachDirectoryEntry[] = ordered.filter((coachName) => !retiredNames.has(coachName) && !isPlaceholderCoach(coachName)).map((coachName) => {
    const login = logins.get(coachName);
    const saved = savedByName.get(coachName);
    const offersPrivate = privateNames.has(coachName);
    const offersSpeed = speedNames.has(coachName);
    const offersFlag = flagNames.has(coachName);
    return {
      coachName,
      login: login ? { id: login.id, name: login.name, email: login.email } : null,
      email: coachDisplayEmail(profileEmails.get(coachName), login?.email),
      offersPrivate,
      offersSpeed,
      offersFlag,
      privateCents: offersPrivate ? (saved?.privateQuarterbackCents ?? privateShown[coachName] ?? null) : null,
      speedCents: offersSpeed ? (saved?.speedCents ?? latestSpeedCents.get(coachName) ?? null) : null,
      flagQuarterbackCents: saved?.flagQuarterbackCents ?? null,
      flagAthleteCents: saved?.flagAthleteCents ?? null,
      viewPath: offersPrivate
        ? privateBookingPath(coachName)
        : `/?${new URLSearchParams({ training: "speed", coach: coachName }).toString()}`,
      showQr: qrNames.has(coachName),
    };
  });

  return { entries, scheduleNames, origin };
}

export function coachEditPath(coachName: string) {
  return `/admin/coaches/${encodeURIComponent(coachName)}`;
}
