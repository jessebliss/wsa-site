import { prisma } from "@/lib/prisma";
import { QUARTERBACK_PROGRAM, SPEED_PROGRAM } from "@/lib/private-quarterback";
import type { BillingInterval } from "@prisma/client";

/**
 * Prices that are already published for the academy.
 * Monthly unlimited group is the $425 MONTHLY UNLIMITED plan.
 * Speed is the $275 monthly speed plan.
 * Yearly is twelve months of the $425 group price, charged once.
 * Girls uses that same $425 monthly unlimited price. No separate girls membership price is published.
 */
const GROUP_MONTH_CENTS = 42500;
const GROUP_YEAR_CENTS = 42500 * 12;
const GIRLS_MONTH_CENTS = 42500;
const SPEED_MONTH_CENTS = 27500;

type LandingSpec = {
  seedKey: string;
  name: string;
  program: string;
  priceCents: number;
  billingInterval: BillingInterval;
  sessionsPerMonth: number;
  color: string;
  sortOrder: number;
};

async function girlsProgram() {
  const session = await prisma.trainingSession.findFirst({
    where: { program: { contains: "flag", mode: "insensitive" } },
    select: { program: true },
  });
  if (session?.program) return session.program;
  const type = await prisma.trainingType.findFirst({
    where: {
      OR: [
        { name: { contains: "flag", mode: "insensitive" } },
        { offeringKey: { contains: "flag", mode: "insensitive" } },
      ],
    },
    select: { colorProgram: true, name: true },
  });
  return type?.colorProgram || type?.name || "Girls Flag";
}

/** Create the four landing plans when they are not already stored. Existing prices stay put. */
export async function ensureLandingPlans() {
  const girls = await girlsProgram();
  const specs: LandingSpec[] = [
    {
      seedKey: "group-unlimited-month",
      name: "Monthly unlimited group",
      program: QUARTERBACK_PROGRAM,
      priceCents: GROUP_MONTH_CENTS,
      billingInterval: "MONTH",
      sessionsPerMonth: 0,
      color: "blue",
      sortOrder: 0,
    },
    {
      seedKey: "group-unlimited-year",
      name: "Yearly unlimited",
      program: QUARTERBACK_PROGRAM,
      priceCents: GROUP_YEAR_CENTS,
      billingInterval: "YEAR",
      sessionsPerMonth: 0,
      color: "indigo",
      sortOrder: 3,
    },
    {
      seedKey: "girls-unlimited-month",
      name: "Monthly unlimited girls group",
      program: girls,
      priceCents: GIRLS_MONTH_CENTS,
      billingInterval: "MONTH",
      sessionsPerMonth: 0,
      color: "pink",
      sortOrder: 4,
    },
    {
      seedKey: "speed-monthly",
      name: "Monthly Speed & Agility",
      program: SPEED_PROGRAM,
      priceCents: SPEED_MONTH_CENTS,
      billingInterval: "MONTH",
      sessionsPerMonth: 8,
      color: "teal",
      sortOrder: 1,
    },
  ];

  for (const spec of specs) {
    const existing = await prisma.plan.findUnique({ where: { seedKey: spec.seedKey } });
    if (!existing) {
      await prisma.plan.create({ data: spec });
      continue;
    }
    if (spec.seedKey === "speed-monthly" && existing.name === "Speed & Agility Monthly") {
      await prisma.plan.update({ where: { id: existing.id }, data: { name: spec.name } });
    }
  }

  const rows = await prisma.plan.findMany({
    where: { seedKey: { in: specs.map((spec) => spec.seedKey) }, active: true },
  });
  const order = new Map(specs.map((spec, index) => [spec.seedKey, index]));
  return rows.sort((a, b) => (order.get(a.seedKey ?? "") ?? 99) - (order.get(b.seedKey ?? "") ?? 99));
}
