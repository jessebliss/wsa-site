"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  QUARTERBACK_PROGRAM,
  isPrivateQuarterback,
  privateHourBounds,
  privateSeedKey,
} from "@/lib/private-quarterback";
import { loadPrivateQuarterbackPrices, privateLessonLocation } from "@/lib/private-quarterback-data";
import { prisma } from "@/lib/prisma";
import { isPlaceholderCoach } from "@/lib/schedule-filter";
import { etDayKey, shiftMonth } from "@/lib/time";

function sameTime(left: Date, right: Date) {
  return left.getTime() === right.getTime();
}

async function ensurePrivateQuarterbackHour(coach: string, dayKey: string, hour: number) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey) || !Number.isInteger(hour) || hour < 0 || hour > 23) return null;
  const todayKey = etDayKey(new Date());
  const maxMonth = shiftMonth(todayKey.slice(0, 7), 5);
  if (dayKey < todayKey || dayKey.slice(0, 7) > maxMonth) return null;

  const staff = await prisma.staffUser.findUnique({ where: { coachName: coach } });
  if (!staff) return null;

  const day = await prisma.coachDay.findUnique({
    where: { staffUserId_dayKey: { staffUserId: staff.id, dayKey } },
  });
  if (!day || day.unavailable || !day.hours.includes(hour)) return null;

  const { startsAt, endsAt } = privateHourBounds(dayKey, hour);
  if (startsAt.getTime() <= Date.now()) return null;

  const prices = await loadPrivateQuarterbackPrices([coach]);
  const priceCents = prices[coach];
  const location = await privateLessonLocation(coach);
  const seedKey = privateSeedKey(coach, dayKey, hour);
  const title = `Quarterback Training with ${coach}`;
  const description = "One-hour private quarterback lesson.";

  const id = await prisma.$transaction(async (tx) => {
    const overlap = await tx.trainingSession.findMany({
      where: {
        status: "SCHEDULED",
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
        OR: [{ coach }, { coaches: { has: coach } }],
      },
    });
    const exact = overlap.find(
      (session) =>
        isPrivateQuarterback(session) && sameTime(session.startsAt, startsAt) && sameTime(session.endsAt, endsAt),
    );
    if (exact) return exact.id;
    if (overlap.length > 0) return null;

    const seeded = await tx.trainingSession.findUnique({ where: { seedKey } });
    if (seeded?.status === "SCHEDULED" && sameTime(seeded.startsAt, startsAt) && sameTime(seeded.endsAt, endsAt)) {
      return seeded.id;
    }
    if (seeded) return null;

    const created = await tx.trainingSession.create({
      data: {
        seedKey,
        kind: "PRIVATE",
        program: QUARTERBACK_PROGRAM,
        title,
        coach,
        description,
        location,
        startsAt,
        endsAt,
        capacity: 1,
        priceCents,
        status: "SCHEDULED",
      },
    });
    return created.id;
  });

  if (!id) return null;
  const session = await prisma.trainingSession.findUnique({ where: { id } });
  if (!session || session.status !== "SCHEDULED") return null;
  return session.id;
}

export async function bookPrivateQuarterbackHour(formData: FormData) {
  const coach = String(formData.get("coach") ?? "").trim();
  if (isPlaceholderCoach(coach)) redirect("/");
  const dayKey = String(formData.get("day") ?? "");
  const hour = Number(formData.get("hour"));
  let id: string | null = null;
  try {
    id = await ensurePrivateQuarterbackHour(coach, dayKey, hour);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.trainingSession.findUnique({
        where: { seedKey: privateSeedKey(coach, dayKey, hour) },
      });
      if (existing && existing.status === "SCHEDULED") id = existing.id;
    } else {
      throw error;
    }
  }
  if (!id) redirect("/");
  revalidatePath("/");
  redirect(`/book/${id}`);
}
