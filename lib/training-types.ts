import { INTRO_KEY, INTRO_LABEL, INTRO_NOTE, INTRO_PROGRAM } from "@/lib/intro";
import {
  GROUP_QUARTERBACK_LABEL,
  PRIVATE_QUARTERBACK_KEY,
  QUARTERBACK_PROGRAM,
  SPEED_PROGRAM,
} from "@/lib/private-quarterback";
import { prisma } from "@/lib/prisma";
import { offeringKey, offeringLabel, offeringRank } from "@/lib/schedule-filter";

const NEXT = "Choose a coach";

const KNOWN: Record<string, { name: string; description: string; nextStep: string; sortOrder: number; colorProgram: string }> = {
  [PRIVATE_QUARTERBACK_KEY]: {
    name: "Quarterback Training",
    description: "One-on-one quarterback training. You choose the coach and the time.",
    nextStep: NEXT,
    sortOrder: 0,
    colorProgram: QUARTERBACK_PROGRAM,
  },
  [`program:${QUARTERBACK_PROGRAM}`]: {
    name: GROUP_QUARTERBACK_LABEL,
    description: "Group quarterback on the monthly schedule.",
    nextStep: NEXT,
    sortOrder: 1,
    colorProgram: QUARTERBACK_PROGRAM,
  },
  [INTRO_KEY]: {
    name: INTRO_LABEL,
    description: INTRO_NOTE,
    nextStep: "Continue to checkout",
    sortOrder: 2,
    colorProgram: INTRO_PROGRAM,
  },
  [`program:${SPEED_PROGRAM}`]: {
    name: SPEED_PROGRAM,
    description: "Speed and agility with the academy coaches.",
    nextStep: NEXT,
    sortOrder: 10,
    colorProgram: SPEED_PROGRAM,
  },
  "program:Girls Flag": {
    name: "Girls Flag",
    description: "Girls flag with the academy coaches.",
    nextStep: NEXT,
    sortOrder: 20,
    colorProgram: "Girls Flag",
  },
};

async function findOrCreateType(key: string, session: { program: string; title: string; kind: string }) {
  const known = KNOWN[key];
  const draft = known ?? {
    name: offeringLabel(session),
    description: session.kind === "CAMP" ? "A camp on the academy calendar." : "Training on the academy calendar.",
    nextStep: NEXT,
    sortOrder: offeringRank(session),
    colorProgram: session.program,
  };
  const byKey = await prisma.trainingType.findUnique({ where: { offeringKey: key } });
  if (byKey) return byKey;
  const byName = await prisma.trainingType.findUnique({ where: { name: draft.name } });
  if (byName) return byName;
  try {
    return await prisma.trainingType.create({
      data: {
        name: draft.name,
        description: draft.description,
        nextStep: draft.nextStep,
        offeringKey: key,
        colorProgram: draft.colorProgram,
        sortOrder: draft.sortOrder,
      },
    });
  } catch (error) {
    const again =
      (await prisma.trainingType.findUnique({ where: { offeringKey: key } })) ??
      (await prisma.trainingType.findUnique({ where: { name: draft.name } }));
    if (again) return again;
    throw error;
  }
}

/** Give every existing session one type, without recreating a type an admin removed. */
export async function ensureTrainingTypes() {
  const [sessions, series] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { typeId: null },
      select: { id: true, kind: true, program: true, title: true },
    }),
    prisma.eventSeries.findMany({
      where: { typeId: null },
      select: { id: true, kind: true, program: true, title: true },
    }),
  ]);
  const cache = new Map<string, string>();
  async function idFor(row: { kind: string; program: string; title: string }) {
    const key = offeringKey(row);
    const cached = cache.get(key);
    if (cached) return cached;
    const type = await findOrCreateType(key, row);
    cache.set(key, type.id);
    return type.id;
  }
  for (const session of sessions) {
    await prisma.trainingSession.update({ where: { id: session.id }, data: { typeId: await idFor(session) } });
  }
  for (const row of series) {
    await prisma.eventSeries.update({ where: { id: row.id }, data: { typeId: await idFor(row) } });
  }
}

export async function loadTrainingTypes() {
  return prisma.trainingType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
}
