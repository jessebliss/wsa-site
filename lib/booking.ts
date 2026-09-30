import { hoursCoveredBySession } from "@/lib/availability";
import { prisma } from "@/lib/prisma";
import { etDayKey } from "@/lib/time";
import { normalizeEmail } from "@/lib/utils";
import type { PromoCode, TrainingSession } from "@prisma/client";

const HOLD_MS = 30 * 60 * 1000;

export class BookingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BookingError";
  }
}

export type PersonInput = {
  parentName: string;
  email: string;
  phone: string;
  playerName: string;
};

function occupiedWhere(now: Date) {
  return {
    OR: [
      { paymentStatus: "PAID" as const },
      { paymentStatus: "PENDING" as const, holdExpiresAt: { gt: now } },
    ],
  };
}

export async function countOccupied(sessionId: string, now = new Date()) {
  return prisma.registration.count({
    where: { sessionId, ...occupiedWhere(now) },
  });
}

export async function occupiedCounts(sessionIds: string[], now = new Date()) {
  if (sessionIds.length === 0) return new Map<string, number>();
  const rows = await prisma.registration.groupBy({
    by: ["sessionId"],
    where: { sessionId: { in: sessionIds }, ...occupiedWhere(now) },
    _count: { _all: true },
  });
  return new Map(rows.map((row) => [row.sessionId, row._count._all]));
}

async function lockSession(tx: Pick<typeof prisma, "$queryRaw">, sessionId: string) {
  await tx.$queryRaw`SELECT id FROM sessions WHERE id = ${sessionId} FOR UPDATE`;
}

async function assertCoachOpen(session: TrainingSession, tx: typeof prisma) {
  if (!session.coach) return;
  const staff = await tx.staffUser.findUnique({ where: { coachName: session.coach } });
  if (!staff) return;
  const day = await tx.coachDay.findUnique({
    where: { staffUserId_dayKey: { staffUserId: staff.id, dayKey: etDayKey(session.startsAt) } },
  });
  const covered = hoursCoveredBySession(session.startsAt, session.endsAt);
  if (!day || day.unavailable || !covered.every((hour) => day.hours.includes(hour))) {
    throw new BookingError("That coach is not available for this session.");
  }
}

async function assertBookable(session: TrainingSession, email: string, now: Date, tx: typeof prisma) {
  if (session.status !== "SCHEDULED") throw new BookingError("This session is not available.");
  if (session.startsAt.getTime() <= now.getTime()) {
    throw new BookingError("This session has already started.");
  }
  await assertCoachOpen(session, tx);
  const existing = await tx.registration.findFirst({
    where: {
      sessionId: session.id,
      email,
      OR: [
        { paymentStatus: "PAID" },
        { paymentStatus: "PENDING", holdExpiresAt: { gt: now } },
      ],
    },
  });
  if (existing) throw new BookingError("This email is already booked for this session.");
  const taken = await tx.registration.count({
    where: { sessionId: session.id, ...occupiedWhere(now) },
  });
  if (taken >= session.capacity) throw new BookingError("This session is sold out.");
}

export async function findCoveringSubscription(email: string, program: string, now = new Date()) {
  const subs = await prisma.subscription.findMany({
    where: { email, status: "ACTIVE" },
    include: { plan: true },
  });
  const matches = subs.filter((sub) => {
    if (!sub.plan.active) return false;
    if (sub.plan.program !== program) return false;
    if (sub.currentPeriodEnd && sub.currentPeriodEnd.getTime() < now.getTime()) return false;
    return sub.sessionsUsed < sub.sessionsIncluded;
  });
  matches.sort((a, b) => b.sessionsIncluded - b.sessionsUsed - (a.sessionsIncluded - a.sessionsUsed));
  return matches[0] ?? null;
}

export async function previewCredit(emailRaw: string, sessionId: string) {
  const email = normalizeEmail(emailRaw);
  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "SCHEDULED") {
    return { covered: false as const, priceCents: 0, message: "This session is not available." };
  }
  if (session.kind !== "GROUP") {
    return {
      covered: false as const,
      priceCents: session.priceCents,
      message: "Camps and private lessons are paid on their own.",
    };
  }
  const sub = await findCoveringSubscription(email, session.program);
  if (!sub) {
    return {
      covered: false as const,
      priceCents: session.priceCents,
      message: "No active plan with sessions left for this program. This booking is a one-time payment.",
    };
  }
  const left = sub.sessionsIncluded - sub.sessionsUsed;
  return {
    covered: true as const,
    priceCents: 0,
    planName: sub.plan.name,
    sessionsLeft: left,
    message: `Covered by ${sub.plan.name}. ${left} session${left === 1 ? "" : "s"} left this period.`,
  };
}

export async function bookWithPlanCredit(sessionId: string, person: PersonInput) {
  const email = normalizeEmail(person.email);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await lockSession(tx, sessionId);
    const session = await tx.trainingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BookingError("Session not found.");
    if (session.kind !== "GROUP") return { booked: false as const, session };
    await assertBookable(session, email, now, tx as unknown as typeof prisma);

    const subs = await tx.subscription.findMany({
      where: { email, status: "ACTIVE" },
      include: { plan: true },
    });
    const sub = subs
      .filter(
        (item) =>
          item.plan.active &&
          item.plan.program === session.program &&
          (!item.currentPeriodEnd || item.currentPeriodEnd.getTime() >= now.getTime()) &&
          item.sessionsUsed < item.sessionsIncluded,
      )
      .sort((a, b) => b.sessionsIncluded - b.sessionsUsed - (a.sessionsIncluded - a.sessionsUsed))[0];

    if (!sub) return { booked: false as const, session };

    const updated = await tx.subscription.updateMany({
      where: {
        id: sub.id,
        status: "ACTIVE",
        sessionsUsed: { lt: sub.sessionsIncluded },
      },
      data: { sessionsUsed: { increment: 1 } },
    });
    if (updated.count !== 1) return { booked: false as const, session };

    const waiver = await tx.waiver.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: "desc" },
    });
    if (!waiver) throw new BookingError("The waiver is not set up yet.");
    const acceptance = await tx.waiverAcceptance.create({
      data: {
        fullName: person.parentName,
        email,
        waiverText: waiver.body,
        waiverId: waiver.id,
      },
    });
    const registration = await tx.registration.create({
      data: {
        sessionId: session.id,
        email,
        parentName: person.parentName,
        phone: person.phone,
        playerName: person.playerName,
        kind: "PLAN_CREDIT",
        paymentStatus: "PAID",
        amountCents: 0,
        subscriptionId: sub.id,
        waiverAcceptanceId: acceptance.id,
      },
    });
    return { booked: true as const, registrationId: registration.id, session };
  });
}

export async function holdOneTime(
  sessionId: string,
  person: PersonInput,
  promo: PromoCode | null,
) {
  const email = normalizeEmail(person.email);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    await lockSession(tx, sessionId);
    const session = await tx.trainingSession.findUnique({ where: { id: sessionId } });
    if (!session) throw new BookingError("Session not found.");
    await assertBookable(session, email, now, tx as unknown as typeof prisma);
    const waiver = await tx.waiver.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: "desc" },
    });
    if (!waiver) throw new BookingError("The waiver is not set up yet.");
    const acceptance = await tx.waiverAcceptance.create({
      data: {
        fullName: person.parentName,
        email,
        waiverText: waiver.body,
        waiverId: waiver.id,
      },
    });
    const registration = await tx.registration.create({
      data: {
        sessionId: session.id,
        email,
        parentName: person.parentName,
        phone: person.phone,
        playerName: person.playerName,
        kind: "ONE_TIME",
        paymentStatus: "PENDING",
        amountCents: session.priceCents,
        promoCodeId: promo?.id,
        waiverAcceptanceId: acceptance.id,
        holdExpiresAt: new Date(now.getTime() + HOLD_MS),
      },
    });
    return { registration, session };
  });
}

export async function expireRegistration(id: string) {
  await prisma.registration.updateMany({
    where: { id, paymentStatus: "PENDING" },
    data: { paymentStatus: "EXPIRED" },
  });
}

export function discountCents(
  priceCents: number,
  promo: { percentOff: number | null; amountOffCents: number | null },
) {
  if (promo.percentOff) {
    return Math.max(0, priceCents - Math.round((priceCents * promo.percentOff) / 100));
  }
  if (promo.amountOffCents) return Math.max(0, priceCents - promo.amountOffCents);
  return priceCents;
}

export async function findActivePromo(code: string | undefined | null) {
  const normalized = code?.trim().toUpperCase() ?? "";
  if (!normalized) return null;
  const promo = await prisma.promoCode.findUnique({ where: { code: normalized } });
  if (!promo || !promo.active) throw new BookingError("That promo code is not active.");
  if (!promo.stripePromotionCodeId) {
    throw new BookingError("That promo code is not connected to Stripe yet.");
  }
  return promo;
}
