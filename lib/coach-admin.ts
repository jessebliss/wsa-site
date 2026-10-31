import { prisma } from "@/lib/prisma";
import { formatEtLong } from "@/lib/time";

function namedCoaches(session: { coach: string | null; coaches: string[] }) {
  const names = new Set<string>();
  for (const coach of session.coaches) {
    const trimmed = coach.trim();
    if (trimmed) names.add(trimmed);
  }
  const single = session.coach?.trim();
  if (single) names.add(single);
  return [...names];
}

export async function deleteCoachLogin(id: string) {
  const coach = await prisma.staffUser.findUnique({ where: { id } });
  if (!coach) throw new Error("That coach login is already gone.");
  await deleteCoachNamed(coach.coachName);
}

export async function deleteCoachNamed(name: string) {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Choose a coach.");
  const now = new Date();

  const upcoming = await prisma.trainingSession.findMany({
    where: { status: "SCHEDULED", startsAt: { gte: now } },
    select: {
      id: true,
      title: true,
      coach: true,
      coaches: true,
      startsAt: true,
      registrations: {
        where: {
          OR: [
            { paymentStatus: "PAID" },
            { paymentStatus: "PENDING", holdExpiresAt: { gt: now } },
          ],
        },
        select: { id: true },
      },
    },
  });

  const blockers = upcoming.filter(
    (session) => namedCoaches(session).length === 1 && namedCoaches(session)[0] === trimmed && session.registrations.length > 0,
  );
  if (blockers.length > 0) {
    const listed = blockers
      .slice(0, 3)
      .map((session) => `${session.title} on ${formatEtLong(session.startsAt)}`)
      .join("; ");
    const extra = blockers.length > 3 ? ` and ${blockers.length - 3} more` : "";
    const noun = blockers.length === 1 ? "an upcoming booking that names only them" : `${blockers.length} upcoming bookings that name only them`;
    throw new Error(
      `${trimmed} still has ${noun}: ${listed}${extra}. Delete was refused. Those bookings were not canceled.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const groups = await tx.trainingSession.findMany({
      where: {
        kind: "GROUP",
        startsAt: { gte: now },
        OR: [{ coaches: { has: trimmed } }, { coach: trimmed }],
      },
    });
    for (const session of groups) {
      await tx.trainingSession.update({
        where: { id: session.id },
        data: {
          coaches: session.coaches.filter((coachName) => coachName !== trimmed),
          coach: session.coach === trimmed ? null : session.coach,
        },
      });
    }

    const series = await tx.eventSeries.findMany({
      where: {
        kind: "GROUP",
        OR: [{ coaches: { has: trimmed } }, { coach: trimmed }],
      },
    });
    for (const row of series) {
      await tx.eventSeries.update({
        where: { id: row.id },
        data: {
          coaches: row.coaches.filter((coachName) => coachName !== trimmed),
          coach: row.coach === trimmed ? null : row.coach,
        },
      });
    }

    await tx.retiredCoach.upsert({
      where: { coachName: trimmed },
      create: { coachName: trimmed },
      update: {},
    });
    await tx.staffUser.deleteMany({ where: { coachName: trimmed } });
  });
}
