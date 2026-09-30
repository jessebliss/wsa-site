import { sessionWithinOpening, type OpeningsByCoach } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { etDayKey } from "@/lib/time";

export async function loadOpenings(fromDay: string, toDay: string): Promise<OpeningsByCoach> {
  const staff = await prisma.staffUser.findMany({
    include: {
      days: { where: { dayKey: { gte: fromDay, lte: toDay } } },
    },
  });
  const openings: OpeningsByCoach = {};
  for (const person of staff) {
    const days: OpeningsByCoach[string] = {};
    for (const day of person.days) {
      days[day.dayKey] = { unavailable: day.unavailable, hours: day.hours };
    }
    openings[person.coachName] = days;
  }
  return openings;
}

export async function coachAllowsSession(session: {
  coach: string | null;
  startsAt: Date;
  endsAt: Date;
}) {
  if (!session.coach) return true;
  const staff = await prisma.staffUser.findUnique({ where: { coachName: session.coach } });
  if (!staff) return true;
  const dayKey = etDayKey(session.startsAt);
  const day = await prisma.coachDay.findUnique({
    where: { staffUserId_dayKey: { staffUserId: staff.id, dayKey } },
  });
  return sessionWithinOpening(session, {
    [session.coach]: day ? { [dayKey]: { unavailable: day.unavailable, hours: day.hours } } : {},
  });
}
