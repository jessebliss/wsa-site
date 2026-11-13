import { prisma } from "@/lib/prisma";
import { parentCoachNames } from "@/lib/schedule-filter";

export type FlagRole = "quarterback" | "athlete";

export function isGirlsFlagProgram(program: string) {
  return /flag/i.test(program);
}

export function parseFlagRole(value: string | null | undefined): FlagRole | null {
  if (value === "quarterback" || value === "athlete") return value;
  return null;
}

export function flagRoleLabel(role: FlagRole) {
  return role === "quarterback" ? "Quarterback" : "Athlete";
}

export async function loadFlagRolePrices() {
  const rows = await prisma.coachPrice.findMany({
    where: {
      OR: [{ flagQuarterbackCents: { not: null } }, { flagAthleteCents: { not: null } }],
    },
  });
  const prices: Record<string, { quarterback: number | null; athlete: number | null }> = {};
  for (const row of rows) {
    prices[row.coachName] = {
      quarterback: row.flagQuarterbackCents,
      athlete: row.flagAthleteCents,
    };
  }
  return prices;
}

/** Price for the role the parent picked. Null when that coach has no price for the role. */
export async function girlsFlagChargeCents(
  session: { program: string; kind: string; coach: string | null; coaches: string[] },
  role: FlagRole,
  coachName: string,
) {
  if (!isGirlsFlagProgram(session.program)) return null;
  const names = parentCoachNames(session);
  const coach = names.find((name) => name.toLowerCase() === coachName.trim().toLowerCase());
  if (!coach) return null;
  const row = await prisma.coachPrice.findUnique({ where: { coachName: coach } });
  const cents = role === "quarterback" ? row?.flagQuarterbackCents : row?.flagAthleteCents;
  if (cents == null || cents <= 0) return null;
  return cents;
}
