import { prisma } from "@/lib/prisma";
import {
  PRIVATE_LESSON_LOCATION,
  QUARTERBACK_COACHES,
  QUARTERBACK_PROGRAM,
  privateQuarterbackPriceCents,
} from "@/lib/private-quarterback";

/** Latest private price, else latest quarterback one-time price, else the named fallback. */
export async function loadPrivateQuarterbackPrices(coaches: readonly string[]) {
  const rows = await prisma.trainingSession.findMany({
    where: {
      program: QUARTERBACK_PROGRAM,
      kind: { in: ["PRIVATE", "GROUP"] },
      status: "SCHEDULED",
      coach: { in: [...coaches] },
    },
    select: { coach: true, kind: true, priceCents: true, startsAt: true },
    orderBy: { startsAt: "desc" },
  });
  const prices: Record<string, number> = {};
  for (const coach of coaches) {
    const mine = rows.filter((row) => row.coach === coach);
    const priv = mine.find((row) => row.kind === "PRIVATE");
    const group = mine.find((row) => row.kind === "GROUP");
    prices[coach] = privateQuarterbackPriceCents(coach, priv?.priceCents ?? null, group?.priceCents ?? null);
  }
  return prices;
}

export function privateQuarterbackCoachNames(extraCoaches: string[]) {
  const names = [...QUARTERBACK_COACHES] as string[];
  for (const coach of extraCoaches) {
    if (coach && !names.includes(coach)) names.push(coach);
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
