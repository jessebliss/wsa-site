import { QUARTERBACK_COACHES } from "@/lib/private-quarterback";
import { prisma } from "@/lib/prisma";

/** Coaches a new group session is placed on. Named quarterback coaches first, then anyone else on the schedule. */
export async function loadCoachRoster() {
  const [staff, sessions, retired] = await Promise.all([
    prisma.staffUser.findMany({ select: { coachName: true } }),
    prisma.trainingSession.findMany({ select: { coach: true, coaches: true } }),
    prisma.retiredCoach.findMany({ select: { coachName: true } }),
  ]);
  const gone = new Set(retired.map((row) => row.coachName));
  const names = new Set<string>(QUARTERBACK_COACHES.filter((name) => !gone.has(name)));
  for (const person of staff) {
    if (!gone.has(person.coachName)) names.add(person.coachName);
  }
  for (const session of sessions) {
    if (session.coach && !gone.has(session.coach)) names.add(session.coach);
    for (const coach of session.coaches) {
      if (!gone.has(coach)) names.add(coach);
    }
  }
  const order = QUARTERBACK_COACHES as readonly string[];
  return [...names].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}
