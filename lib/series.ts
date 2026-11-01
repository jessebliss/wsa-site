import { Prisma, type EventSeries, type TrainingSession } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { isPlaceholderCoach } from "@/lib/schedule-filter";
import { assertRule, defaultRule, occurrenceDays, type RepeatRule } from "@/lib/recurrence";
import { etDayKey, etToUtc, addDays } from "@/lib/time";

export type EventScope = "this" | "following" | "all";

export type EventInput = {
  kind: "GROUP" | "CAMP" | "PRIVATE";
  program: string;
  typeId: string | null;
  title: string;
  coach: string | null;
  coaches: string[];
  description: string | null;
  location: string;
  date: string;
  start: string;
  end: string;
  capacity: number;
  priceCents: number;
  rule: RepeatRule;
};

type Tx = Prisma.TransactionClient;

function clock(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value.trim());
  if (!match) throw new Error("Enter a start and end time.");
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) throw new Error("Enter a start and end time.");
  return `${match[1]}:${match[2]}`;
}

export function occurrenceBounds(day: string, start: string, end: string) {
  const startsAt = etToUtc(day, start);
  const endsAt = etToUtc(day, end);
  if (!(startsAt.getTime() < endsAt.getTime())) throw new Error("End time has to be after the start.");
  return { startsAt, endsAt };
}

function ruleFromSeries(series: EventSeries): RepeatRule {
  const kind =
    series.repeatKind === "DAILY"
      ? "daily"
      : series.repeatKind === "EVERY_N_DAYS"
        ? "every-n-days"
        : series.repeatKind === "WEEKLY"
          ? "weekly"
          : series.repeatKind === "EVERY_N_WEEKS"
            ? "every-n-weeks"
            : series.repeatKind === "MONTHLY_DATE"
              ? "monthly-date"
              : series.repeatKind === "MONTHLY_WEEKDAY"
                ? "monthly-weekday"
                : series.repeatKind === "YEARLY"
                  ? "yearly"
                  : "none";
  return {
    kind,
    interval: series.interval,
    weekdays: series.weekdays,
    ordinal: series.monthOrdinal ?? 1,
    weekday: series.monthWeekday ?? 0,
    ends: series.ends === "ON" ? "on" : series.ends === "AFTER" ? "after" : "never",
    until: series.untilDay ?? series.anchorDay,
    count: series.occurrenceCount ?? 1,
  };
}

function seriesColumns(input: EventInput, anchorDay: string) {
  const repeatKind =
    input.rule.kind === "daily"
      ? "DAILY"
      : input.rule.kind === "every-n-days"
        ? "EVERY_N_DAYS"
        : input.rule.kind === "weekly"
          ? "WEEKLY"
          : input.rule.kind === "every-n-weeks"
            ? "EVERY_N_WEEKS"
            : input.rule.kind === "monthly-date"
              ? "MONTHLY_DATE"
              : input.rule.kind === "monthly-weekday"
                ? "MONTHLY_WEEKDAY"
                : input.rule.kind === "yearly"
                  ? "YEARLY"
                  : "NONE";
  return {
    repeatKind,
    interval: Math.max(1, input.rule.interval || 1),
    weekdays: [...input.rule.weekdays].sort((a, b) => a - b),
    monthOrdinal: input.rule.kind === "monthly-weekday" ? input.rule.ordinal : null,
    monthWeekday: input.rule.kind === "monthly-weekday" ? input.rule.weekday : null,
    ends: input.rule.ends === "on" ? "ON" : input.rule.ends === "after" ? "AFTER" : "NEVER",
    untilDay: input.rule.ends === "on" ? input.rule.until : null,
    occurrenceCount: input.rule.ends === "after" ? input.rule.count : null,
    anchorDay,
    kind: input.kind,
    program: input.program,
    typeId: input.typeId,
    title: input.title,
    coach: input.kind === "GROUP" ? null : input.coach,
    coaches: input.kind === "GROUP" ? input.coaches : [],
    description: input.description,
    location: input.location,
    startTime: input.start,
    endTime: input.end,
    capacity: input.capacity,
    priceCents: input.priceCents,
  } as const;
}

function sessionFields(input: EventInput, day: string, seriesId: string | null) {
  const { startsAt, endsAt } = occurrenceBounds(day, input.start, input.end);
  return {
    kind: input.kind,
    program: input.program,
    typeId: input.typeId,
    title: input.title,
    coach: input.kind === "GROUP" ? null : input.coach,
    coaches: input.kind === "GROUP" ? input.coaches : [],
    description: input.description,
    location: input.location,
    startsAt,
    endsAt,
    capacity: input.capacity,
    priceCents: input.priceCents,
    seriesId,
    occurrenceDay: seriesId ? day : null,
    seriesException: false,
  };
}

function checkInput(input: EventInput) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date)) throw new Error("Choose a day on the calendar.");
  input.start = clock(input.start);
  input.end = clock(input.end);
  occurrenceBounds(input.date, input.start, input.end);
  if (!input.typeId) throw new Error("Choose a type.");
  if (!input.program || !input.title || !input.location) throw new Error("Type, title, and location are required.");
  if (input.program === "QB Introduction Session") {
    throw new Error("QB Introduction Session is not scheduled. Parents book it from Choose your training.");
  }
  if (!Number.isInteger(input.capacity) || input.capacity < 1) throw new Error("Capacity has to be at least 1.");
  if (!["GROUP", "CAMP", "PRIVATE"].includes(input.kind)) throw new Error("Choose group, camp, or private.");
  assertRule(input.rule, input.date);
}

async function occupied(tx: Tx, sessionId: string) {
  const now = new Date();
  return tx.registration.count({
    where: {
      sessionId,
      OR: [{ paymentStatus: "PAID" }, { paymentStatus: "PENDING", holdExpiresAt: { gt: now } }],
    },
  });
}

async function destroySession(tx: Tx, sessionId: string) {
  await tx.registration.deleteMany({ where: { sessionId } });
  await tx.trainingSession.delete({ where: { id: sessionId } });
}

async function retireSession(tx: Tx, session: TrainingSession) {
  if ((await occupied(tx, session.id)) > 0) {
    await tx.trainingSession.update({
      where: { id: session.id },
      data: { status: "CANCELED", seriesId: null, seriesException: false },
    });
    return;
  }
  await destroySession(tx, session.id);
}

async function createOccurrence(tx: Tx, input: EventInput, day: string, seriesId: string | null, status: "SCHEDULED" | "CANCELED" = "SCHEDULED") {
  return tx.trainingSession.create({
    data: { ...sessionFields(input, day, seriesId), status },
  });
}

export async function fillSeries(seriesId: string, today = etDayKey(new Date())) {
  const series = await prisma.eventSeries.findUnique({ where: { id: seriesId } });
  if (!series || series.repeatKind === "NONE") return;
  const days = occurrenceDays(series.anchorDay, ruleFromSeries(series), today);
  const existing = await prisma.trainingSession.findMany({
    where: { seriesId },
    select: { occurrenceDay: true },
  });
  const have = new Set(existing.map((session) => session.occurrenceDay));
  const skip = new Set(series.skippedDays);
  const input = inputFromSeries(series);
  for (const day of days) {
    if (have.has(day) || skip.has(day)) continue;
    try {
      await prisma.trainingSession.create({ data: { ...sessionFields(input, day, series.id), status: "SCHEDULED" } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") continue;
      throw error;
    }
  }
}

export async function extendSeriesHorizon(today = etDayKey(new Date())) {
  const rows = await prisma.eventSeries.findMany({
    where: { repeatKind: { not: "NONE" } },
    select: { id: true, ends: true, untilDay: true },
  });
  for (const row of rows) {
    if (row.ends === "ON" && row.untilDay && row.untilDay < addDays(today, -1)) continue;
    await fillSeries(row.id, today);
  }
}

function inputFromSeries(series: EventSeries): EventInput {
  return {
    kind: series.kind,
    program: series.program,
    typeId: series.typeId,
    title: series.title,
    coach: series.coach,
    coaches: series.coaches.filter((name) => !isPlaceholderCoach(name)),
    description: series.description,
    location: series.location,
    date: series.anchorDay,
    start: series.startTime,
    end: series.endTime,
    capacity: series.capacity,
    priceCents: series.priceCents,
    rule: ruleFromSeries(series),
  };
}

async function rewriteOnto(
  tx: Tx,
  moving: TrainingSession[],
  days: string[],
  input: EventInput,
  seriesId: string | null,
) {
  if (moving.length > 0) {
    await tx.trainingSession.updateMany({
      where: { id: { in: moving.map((session) => session.id) } },
      data: { occurrenceDay: null },
    });
  }
  const count = Math.max(moving.length, days.length);
  for (let index = 0; index < count; index += 1) {
    const session = moving[index];
    const day = days[index];
    if (session && day) {
      const status = session.status;
      await tx.trainingSession.update({
        where: { id: session.id },
        data: { ...sessionFields(input, day, seriesId), status, seriesException: false },
      });
    } else if (session) {
      await retireSession(tx, session);
    } else if (day) {
      await createOccurrence(tx, input, day, seriesId);
    }
  }
}

export async function createEvent(input: EventInput) {
  checkInput(input);
  const today = etDayKey(new Date());
  const days = input.rule.kind === "none" ? [input.date] : occurrenceDays(input.date, input.rule, today);
  if (days.length === 0) throw new Error("Those repeat choices do not land on a day in the calendar window.");
  await prisma.$transaction(async (tx) => {
    if (input.rule.kind === "none") {
      await createOccurrence(tx, input, input.date, null);
      return;
    }
    const series = await tx.eventSeries.create({ data: seriesColumns(input, days[0]) });
    for (const day of days) await createOccurrence(tx, input, day, series.id);
  });
}

async function loadOwned(id: string) {
  const session = await prisma.trainingSession.findUnique({ where: { id }, include: { series: true } });
  if (!session) throw new Error("That session is gone.");
  return session;
}

export async function updateEvent(id: string, scope: EventScope, input: EventInput) {
  checkInput(input);
  const session = await loadOwned(id);
  const today = etDayKey(new Date());
  if (!session.seriesId || !session.series) {
    if (input.rule.kind === "none") {
      await prisma.trainingSession.update({
        where: { id },
        data: sessionFields(input, input.date, null),
      });
      return;
    }
    const days = occurrenceDays(input.date, input.rule, today);
    if (days.length === 0) throw new Error("Those repeat choices do not land on a day in the calendar window.");
    await prisma.$transaction(async (tx) => {
      const series = await tx.eventSeries.create({ data: seriesColumns(input, days[0]) });
      await tx.trainingSession.update({
        where: { id },
        data: { ...sessionFields(input, days[0], series.id), status: session.status },
      });
      for (const day of days.slice(1)) await createOccurrence(tx, input, day, series.id);
    });
    return;
  }

  const series = session.series;
  const originalDay = session.occurrenceDay ?? etDayKey(session.startsAt);
  if (scope === "this") {
    const collision = await prisma.trainingSession.findFirst({
      where: { seriesId: series.id, occurrenceDay: input.date, NOT: { id } },
    });
    if (collision) throw new Error("This series already has an event on that day.");
    await prisma.$transaction(async (tx) => {
      if (input.date !== originalDay) {
        await tx.eventSeries.update({
          where: { id: series.id },
          data: { skippedDays: Array.from(new Set([...series.skippedDays, originalDay])) },
        });
      }
      await tx.trainingSession.update({
        where: { id },
        data: { ...sessionFields(input, input.date, series.id), status: session.status, seriesException: true },
      });
    });
    return;
  }

  const siblings = await prisma.trainingSession.findMany({
    where: { seriesId: series.id },
    orderBy: { startsAt: "asc" },
  });
  const moving = scope === "following" ? siblings.filter((item) => (item.occurrenceDay ?? etDayKey(item.startsAt)) >= originalDay) : siblings;
  const days = input.rule.kind === "none" ? [input.date] : occurrenceDays(input.date, input.rule, today);
  if (days.length === 0) throw new Error("Those repeat choices do not land on a day in the calendar window.");

  await prisma.$transaction(async (tx) => {
    if (scope === "following") {
      const staying = siblings.filter((item) => (item.occurrenceDay ?? etDayKey(item.startsAt)) < originalDay);
      if (staying.length === 0) {
        await rewriteSeriesInPlace(tx, series.id, moving, days, input);
        return;
      }
      const lastStaying = staying[staying.length - 1];
      await tx.eventSeries.update({
        where: { id: series.id },
        data: { ends: "ON", untilDay: lastStaying.occurrenceDay ?? addDays(originalDay, -1) },
      });
      if (input.rule.kind === "none") {
        await rewriteOnto(tx, moving, [input.date], input, null);
        return;
      }
      const created = await tx.eventSeries.create({ data: seriesColumns(input, days[0]) });
      await rewriteOnto(tx, moving, days, input, created.id);
      return;
    }
    await rewriteSeriesInPlace(tx, series.id, moving, days, input);
  });
}

async function rewriteSeriesInPlace(tx: Tx, seriesId: string, moving: TrainingSession[], days: string[], input: EventInput) {
  if (input.rule.kind === "none") {
    await tx.trainingSession.updateMany({
      where: { seriesId },
      data: { seriesId: null, occurrenceDay: null, seriesException: false },
    });
    await tx.eventSeries.delete({ where: { id: seriesId } });
    const [first, ...rest] = moving;
    if (first) {
      await tx.trainingSession.update({
        where: { id: first.id },
        data: { ...sessionFields(input, input.date, null), status: first.status },
      });
    } else {
      await createOccurrence(tx, input, input.date, null);
    }
    for (const session of rest) await retireSession(tx, session);
    return;
  }
  await tx.trainingSession.updateMany({ where: { seriesId }, data: { occurrenceDay: null } });
  await tx.eventSeries.update({ where: { id: seriesId }, data: { ...seriesColumns(input, days[0]), skippedDays: [] } });
  await rewriteOnto(tx, moving, days, input, seriesId);
}

export async function cancelEvent(id: string, scope: EventScope) {
  const session = await loadOwned(id);
  if (!session.seriesId) {
    await prisma.trainingSession.update({ where: { id }, data: { status: "CANCELED" } });
    return;
  }
  const originalDay = session.occurrenceDay ?? etDayKey(session.startsAt);
  if (scope === "this") {
    await prisma.trainingSession.update({ where: { id }, data: { status: "CANCELED" } });
    return;
  }
  await prisma.trainingSession.updateMany({
    where: {
      seriesId: session.seriesId,
      ...(scope === "following" ? { occurrenceDay: { gte: originalDay } } : {}),
    },
    data: { status: "CANCELED" },
  });
}

export async function deleteEvent(id: string, scope: EventScope) {
  const session = await loadOwned(id);
  if (!session.seriesId || !session.series) {
    await prisma.$transaction(async (tx) => destroySession(tx, id));
    return;
  }
  const series = session.series;
  const originalDay = session.occurrenceDay ?? etDayKey(session.startsAt);
  await prisma.$transaction(async (tx) => {
    if (scope === "this") {
      await destroySession(tx, id);
      await tx.eventSeries.update({
        where: { id: series.id },
        data: { skippedDays: Array.from(new Set([...series.skippedDays, originalDay])) },
      });
      return;
    }
    if (scope === "all") {
      const rows = await tx.trainingSession.findMany({ where: { seriesId: series.id }, select: { id: true } });
      for (const row of rows) await destroySession(tx, row.id);
      await tx.eventSeries.delete({ where: { id: series.id } });
      return;
    }
    const rows = await tx.trainingSession.findMany({
      where: { seriesId: series.id, occurrenceDay: { gte: originalDay } },
      select: { id: true },
    });
    for (const row of rows) await destroySession(tx, row.id);
    const remaining = await tx.trainingSession.findFirst({
      where: { seriesId: series.id },
      orderBy: { startsAt: "desc" },
    });
    if (!remaining) {
      await tx.eventSeries.delete({ where: { id: series.id } });
      return;
    }
    await tx.eventSeries.update({
      where: { id: series.id },
      data: { ends: "ON", untilDay: remaining.occurrenceDay ?? addDays(originalDay, -1) },
    });
  });
}

export function ruleForForm(series: EventSeries | null, dayKey: string): RepeatRule {
  if (!series) return defaultRule(dayKey);
  return ruleFromSeries(series);
}
