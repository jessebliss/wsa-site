import { prisma } from "@/lib/prisma";
import { isPlaceholderCoach, parentCoachNames } from "@/lib/schedule-filter";
import {
  PRIVATE_LESSON_LOCATION,
  QUARTERBACK_COACHES,
  QUARTERBACK_PROGRAM,
  SPEED_PROGRAM,
  isPrivateQuarterback,
  privateQuarterbackPriceCents,
} from "@/lib/private-quarterback";

export { SPEED_PROGRAM };

/** Saved public price, else latest private price, else latest quarterback one-time price, else the named fallback. */
export async function loadPrivateQuarterbackPrices(coaches: readonly string[]) {
  const [rows, saved] = await Promise.all([
    prisma.trainingSession.findMany({
      where: {
        program: QUARTERBACK_PROGRAM,
        kind: { in: ["PRIVATE", "GROUP"] },
        status: "SCHEDULED",
        coach: { in: [...coaches] },
      },
      select: { coach: true, kind: true, priceCents: true, startsAt: true },
      orderBy: { startsAt: "desc" },
    }),
    coaches.length === 0
      ? Promise.resolve([])
      : prisma.coachPrice.findMany({ where: { coachName: { in: [...coaches] } } }),
  ]);
  const savedPrivate = new Map(
    saved.map((row) => [row.coachName, row.privateQuarterbackCents] as const),
  );
  const prices: Record<string, number> = {};
  for (const coach of coaches) {
    const explicit = savedPrivate.get(coach);
    if (explicit != null) {
      prices[coach] = explicit;
      continue;
    }
    const mine = rows.filter((row) => row.coach === coach);
    const priv = mine.find((row) => row.kind === "PRIVATE");
    const group = mine.find((row) => row.kind === "GROUP");
    prices[coach] = privateQuarterbackPriceCents(coach, priv?.priceCents ?? null, group?.priceCents ?? null);
  }
  return prices;
}

export async function loadSavedPrivatePrices() {
  const rows = await prisma.coachPrice.findMany({ where: { privateQuarterbackCents: { not: null } } });
  const prices: Record<string, number> = {};
  for (const row of rows) {
    if (row.privateQuarterbackCents != null) prices[row.coachName] = row.privateQuarterbackCents;
  }
  return prices;
}

export async function loadSavedSpeedPrices() {
  const rows = await prisma.coachPrice.findMany({ where: { speedCents: { not: null } } });
  const prices: Record<string, number> = {};
  for (const row of rows) {
    if (row.speedCents != null) prices[row.coachName] = row.speedCents;
  }
  return prices;
}

/** Price parents pay. A saved coach price replaces the session price. */
export async function listedSessionPrice(session: {
  kind: string;
  program: string;
  coach: string | null;
  coaches: string[];
  priceCents: number;
}) {
  if (isPrivateQuarterback(session) && session.coach) {
    const row = await prisma.coachPrice.findUnique({ where: { coachName: session.coach } });
    if (row?.privateQuarterbackCents != null) return row.privateQuarterbackCents;
  }
  if (session.program === SPEED_PROGRAM) {
    const names = parentCoachNames(session);
    if (names.length > 0) {
      const rows = await prisma.coachPrice.findMany({
        where: { coachName: { in: names }, speedCents: { not: null } },
      });
      const amounts = [...new Set(rows.map((row) => row.speedCents).filter((cents): cents is number => cents != null))];
      if (amounts.length === 1) return amounts[0];
    }
  }
  return session.priceCents;
}

export function privateQuarterbackCoachNames(extraCoaches: string[]) {
  const names = [...QUARTERBACK_COACHES] as string[];
  for (const coach of extraCoaches) {
    if (coach && !isPlaceholderCoach(coach) && !names.includes(coach)) names.push(coach);
  }
  return names;
}

export async function privateLessonLocation(coach: string) {
  const existing = await prisma.trainingSession.findFirst({
    where: { coach, program: QUARTERBACK_PROGRAM, status: "SCHEDULED" },
    orderBy: { startsAt: "desc" },
    select: { location: true },
  });
  return existing?.location || PRIVATE_LESSON_LOCATION;
}
