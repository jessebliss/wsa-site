"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { refundRegistration } from "@/lib/billing";
import { ensurePlanStripePrice } from "@/lib/billing";
import { dollarsToCents, optionalDollarsToCents } from "@/lib/money";
import { isEventColorId } from "@/lib/plan-options";
import { percentToBps } from "@/lib/fees";
import { prisma } from "@/lib/prisma";
import { type RepeatRule } from "@/lib/recurrence";
import { cancelEvent, createEvent, deleteEvent, updateEvent, type EventInput, type EventScope } from "@/lib/series";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { deleteCoachLogin } from "@/lib/coach-admin";
import {
  cancelAtPeriodEnd,
  cancelNow,
  changeSubscriptionPlan,
  createVenmoSubscription,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  setCustomPrice,
  setNextBillDate,
} from "@/lib/subscription-admin";
import { hourStartsForDay } from "@/lib/availability";
import { hashPassword } from "@/lib/password";
import { etDayKey, shiftMonth } from "@/lib/time";
import { normalizeEmail } from "@/lib/utils";
import { Prisma, type BillingInterval } from "@prisma/client";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (session.user.role === "coach") redirect("/admin/availability");
  return session;
}

async function requireCoach() {
  const session = await auth();
  const staffUserId = session?.user?.role === "coach" ? session.user.id : undefined;
  if (!staffUserId) redirect("/admin/login");
  return staffUserId;
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function createCoach(formData: FormData) {
  await requireAdmin();
  try {
    const name = String(formData.get("name") ?? "").trim();
    const email = normalizeEmail(String(formData.get("email") ?? ""));
    const password = String(formData.get("password") ?? "");
    const coachName = String(formData.get("coachName") ?? "").trim();
    if (!name || !coachName) throw new Error("Name and the coach on the schedule are required.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Enter a real email address.");
    if (password.length < 8) throw new Error("Use a password of at least 8 characters.");
    const adminEmail = process.env.ADMIN_EMAIL ? normalizeEmail(process.env.ADMIN_EMAIL) : "";
    if (adminEmail && email === adminEmail) throw new Error("That email is the academy admin login.");
    await prisma.$transaction([
      prisma.retiredCoach.deleteMany({ where: { coachName } }),
      prisma.staffUser.create({
        data: {
          name,
          email,
          passwordHash: await hashPassword(password),
          coachName,
        },
      }),
    ]);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      fail("/admin/coaches", new Error("That email or schedule coach already has a login."));
    }
    fail("/admin/coaches", error);
  }
  revalidatePath("/admin/coaches");
  redirect("/admin/coaches");
}

export async function saveCoachPrices(formData: FormData) {
  await requireAdmin();
  const coachName = String(formData.get("coachName") ?? "").trim();
  try {
    if (!coachName) throw new Error("Choose a coach.");
    const data: { privateQuarterbackCents?: number; speedCents?: number } = {};
    if (formData.has("privateQuarterback")) {
      data.privateQuarterbackCents = dollarsToCents(String(formData.get("privateQuarterback") ?? ""));
    }
    if (formData.has("speed")) {
      data.speedCents = dollarsToCents(String(formData.get("speed") ?? ""));
    }
    if (data.privateQuarterbackCents == null && data.speedCents == null) {
      throw new Error("Nothing to save for this coach.");
    }
    await prisma.coachPrice.upsert({
      where: { coachName },
      create: { coachName, ...data },
      update: data,
    });
  } catch (error) {
    fail(coachName ? `/admin/coaches/${encodeURIComponent(coachName)}` : "/admin/coaches", error);
  }
  revalidatePath("/");
  revalidatePath("/admin/coaches");
  redirect(`/admin/coaches/${encodeURIComponent(coachName)}?saved=1`);
}

export type CoachDaySave =
  | { ok: true; dayKey: string; unavailable: boolean; hours: number[] }
  | { ok: false; error: string };

export async function saveCoachDay(formData: FormData): Promise<CoachDaySave> {
  const staffUserId = await requireCoach();
  const dayKey = String(formData.get("dayKey") ?? "");
  const month = dayKey.slice(0, 7);
  try {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKey)) throw new Error("Choose a day on the calendar.");
    const todayKey = etDayKey(new Date());
    const currentMonth = todayKey.slice(0, 7);
    const latest = shiftMonth(currentMonth, 11);
    if (dayKey < todayKey) throw new Error("That day has already passed.");
    if (month < currentMonth || month > latest) throw new Error("That month is outside the calendar.");
    const unavailable = String(formData.get("unavailable") ?? "") === "yes";
    const allowed = new Set(hourStartsForDay(dayKey));
    const hours = Array.from(
      new Set(
        formData
          .getAll("hours")
          .map((value) => Number(value))
          .filter((hour) => Number.isInteger(hour) && allowed.has(hour)),
      ),
    ).sort((a, b) => a - b);
    if (!unavailable && hours.length === 0) {
      throw new Error("Choose at least one hour, or mark the day not available.");
    }
    const savedHours = unavailable ? [] : hours;
    await prisma.coachDay.upsert({
      where: { staffUserId_dayKey: { staffUserId, dayKey } },
      create: {
        staffUserId,
        dayKey,
        unavailable,
        hours: savedHours,
      },
      update: { unavailable, hours: savedHours },
    });
    revalidatePath("/");
    revalidatePath("/admin/availability");
    return { ok: true, dayKey, unavailable, hours: savedHours };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    return { ok: false, error: message };
  }
}

function readScope(formData: FormData): EventScope {
  const scope = String(formData.get("scope") ?? "this");
  if (scope === "following" || scope === "all" || scope === "this") return scope;
  throw new Error("Choose this occurrence, this and following, or the whole series.");
}

function readRule(formData: FormData): RepeatRule {
  const kind = String(formData.get("repeat") ?? "none") as RepeatRule["kind"];
  const ends = String(formData.get("ends") ?? "never") as RepeatRule["ends"];
  const weekdays = formData
    .getAll("weekdays")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
  return {
    kind,
    interval: Number(formData.get("interval") ?? 1),
    weekdays,
    ordinal: Number(formData.get("ordinal") ?? 1),
    weekday: Number(formData.get("monthWeekday") ?? 0),
    ends: ends === "on" || ends === "after" ? ends : "never",
    until: String(formData.get("until") ?? ""),
    count: Number(formData.get("count") ?? 1),
  };
}

function readEvent(formData: FormData): EventInput {
  const kind = String(formData.get("kind") ?? "GROUP") as EventInput["kind"];
  const coaches = formData
    .getAll("coaches")
    .map((value) => String(value).trim())
    .filter(Boolean);
  return {
    kind,
    program: String(formData.get("program") ?? "").trim(),
    title: String(formData.get("title") ?? "").trim(),
    coach: kind === "GROUP" ? null : String(formData.get("coach") ?? "").trim() || null,
    coaches: kind === "GROUP" ? Array.from(new Set(coaches)) : [],
    description: String(formData.get("description") ?? "").trim() || null,
    location: String(formData.get("location") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    start: String(formData.get("start") ?? ""),
    end: String(formData.get("end") ?? ""),
    capacity: Number(formData.get("capacity")),
    priceCents: dollarsToCents(String(formData.get("price") ?? "")),
    rule: readRule(formData),
  };
}

export async function saveSession(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = id ? `/admin/schedule/${id}` : "/admin/schedule";
  try {
    const intent = String(formData.get("intent") ?? "save");
    const scope = readScope(formData);
    if (id && intent !== "save") {
      const session = await prisma.trainingSession.findUnique({ where: { id }, select: { seriesId: true } });
      if (session?.seriesId && !formData.get("scope")) {
        throw new Error("Choose this occurrence, this and following, or the whole series.");
      }
    }
    if (intent === "cancel") {
      if (!id) throw new Error("Choose an event to cancel.");
      await cancelEvent(id, scope);
    } else if (intent === "delete") {
      if (!id) throw new Error("Choose an event to delete.");
      await deleteEvent(id, scope);
    } else if (id) {
      const session = await prisma.trainingSession.findUnique({ where: { id }, select: { seriesId: true } });
      if (session?.seriesId && !["this", "following", "all"].includes(String(formData.get("scope") ?? ""))) {
        throw new Error("Choose this occurrence, this and following, or the whole series.");
      }
      await updateEvent(id, scope, readEvent(formData));
    } else {
      await createEvent(readEvent(formData));
    }
  } catch (error) {
    fail(back, error);
  }
  revalidatePath("/");
  revalidatePath("/admin/schedule");
  redirect("/admin/schedule");
}

export async function saveCheckoutFees(formData: FormData) {
  await requireAdmin();
  try {
    const registrationFixedCents = optionalDollarsToCents(String(formData.get("registrationFixed") ?? ""));
    const taxFixedCents = optionalDollarsToCents(String(formData.get("taxFixed") ?? ""));
    const registrationBps = percentToBps(String(formData.get("registrationPercent") ?? ""));
    const taxBps = percentToBps(String(formData.get("taxPercent") ?? ""));
    await prisma.checkoutFee.upsert({
      where: { id: "site" },
      create: { id: "site", registrationFixedCents, registrationBps, taxFixedCents, taxBps },
      update: { registrationFixedCents, registrationBps, taxFixedCents, taxBps },
    });
  } catch (error) {
    fail("/admin/fees", error);
  }
  revalidatePath("/");
  revalidatePath("/admin/fees");
  redirect("/admin/fees?saved=1");
}

export async function savePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    const color = String(formData.get("color") ?? "");
    const billingValue = String(formData.get("billingInterval") ?? "MONTH");
    if (!isEventColorId(color)) throw new Error("Choose a color.");
    if (billingValue !== "MONTH" && billingValue !== "YEAR") throw new Error("Choose monthly or yearly.");
    const billingInterval: BillingInterval = billingValue === "YEAR" ? "YEAR" : "MONTH";
    const data = {
      name: String(formData.get("name") ?? "").trim(),
      program: String(formData.get("program") ?? "").trim(),
      sessionsPerMonth: Number(formData.get("sessionsPerMonth")),
      priceCents: dollarsToCents(String(formData.get("price") ?? "")),
      billingInterval,
      color,
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    };
    if (!data.name || !data.program) throw new Error("Name and program are required.");
    if (!Number.isInteger(data.sessionsPerMonth) || data.sessionsPerMonth < 1) {
      throw new Error("Sessions included has to be at least 1.");
    }
    const plan = id
      ? await prisma.plan.update({ where: { id }, data })
      : await prisma.plan.create({ data });
    await prisma.plan.updateMany({
      where: { program: data.program, NOT: { id: plan.id } },
      data: { color: data.color },
    });
    if (stripeConfigured()) {
      await ensurePlanStripePrice(plan);
    }
  } catch (error) {
    fail("/admin/plans", error);
  }
  revalidatePath("/");
  revalidatePath("/admin/plans");
  redirect("/admin/plans");
}

export async function deletePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    const plan = await prisma.plan.findUnique({ where: { id } });
    if (!plan) throw new Error("That plan is already gone.");
    const live = await prisma.subscription.count({
      where: { planId: id, status: { not: "CANCELED" } },
    });
    if (live > 0) {
      const noun = live === 1 ? "membership that is not canceled" : "memberships that are not canceled";
      throw new Error(
        `This plan still has ${live} ${noun}. Delete was refused. Those people were not canceled automatically.`,
      );
    }
    await prisma.$transaction([
      prisma.subscription.updateMany({ where: { planId: id }, data: { planName: plan.name } }),
      prisma.plan.delete({ where: { id } }),
    ]);
  } catch (error) {
    fail("/admin/plans", error);
  }
  revalidatePath("/");
  revalidatePath("/admin/plans");
  revalidatePath("/admin/subscriptions");
  redirect("/admin/plans");
}

export async function createVenmoMembership(formData: FormData) {
  await requireAdmin();
  try {
    await createVenmoSubscription({
      parentName: String(formData.get("parentName") ?? ""),
      email: String(formData.get("email") ?? ""),
      phone: String(formData.get("phone") ?? ""),
      playerName: String(formData.get("playerName") ?? ""),
      planId: String(formData.get("planId") ?? ""),
      priceCents: dollarsToCents(String(formData.get("price") ?? "")),
      note: String(formData.get("note") ?? ""),
    });
  } catch (error) {
    fail("/admin/subscriptions", error);
  }
  revalidatePath("/admin/subscriptions");
  redirect("/admin/subscriptions");
}

export async function deleteCoach(formData: FormData) {
  await requireAdmin();
  try {
    await deleteCoachLogin(String(formData.get("id") ?? ""));
  } catch (error) {
    fail("/admin/coaches", error);
  }
  revalidatePath("/");
  revalidatePath("/admin/coaches");
  revalidatePath("/admin/schedule");
  redirect("/admin/coaches");
}

export async function savePromo(formData: FormData) {
  await requireAdmin();
  try {
    if (!stripeConfigured()) throw new Error("Promo codes are created in Stripe. Add a test secret key first.");
    const code = String(formData.get("code") ?? "").trim().toUpperCase();
    if (!/^[A-Z0-9-]{3,40}$/.test(code)) throw new Error("Use 3–40 letters, numbers, or dashes.");
    const kind = String(formData.get("discountKind"));
    const percent = kind === "percent" ? Number(formData.get("percent")) : null;
    const amount = kind === "amount" ? dollarsToCents(String(formData.get("amount") ?? "")) : null;
    if (percent != null && (!Number.isInteger(percent) || percent < 1 || percent > 100)) {
      throw new Error("Percent off has to be 1–100.");
    }
    const stripe = getStripe();
    const coupon = await stripe.coupons.create({
      duration: "once",
      name: code,
      percent_off: percent ?? undefined,
      amount_off: amount ?? undefined,
      currency: amount ? "usd" : undefined,
    });
    const promotion = await stripe.promotionCodes.create({
      code,
      promotion: { type: "coupon", coupon: coupon.id },
    });
    await prisma.promoCode.create({
      data: {
        code,
        percentOff: percent,
        amountOffCents: amount,
        stripeCouponId: coupon.id,
        stripePromotionCodeId: promotion.id,
      },
    });
  } catch (error) {
    fail("/admin/promos", error);
  }
  redirect("/admin/promos");
}

export async function disablePromo(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    const promo = await prisma.promoCode.findUnique({ where: { id } });
    if (!promo) throw new Error("Promo code not found.");
    if (promo.stripePromotionCodeId && stripeConfigured()) {
      await getStripe().promotionCodes.update(promo.stripePromotionCodeId, { active: false });
    }
    await prisma.promoCode.update({ where: { id }, data: { active: false } });
  } catch (error) {
    fail("/admin/promos", error);
  }
  redirect("/admin/promos");
}

export async function saveWaiver(formData: FormData) {
  await requireAdmin();
  const body = String(formData.get("body") ?? "").trim();
  if (body.length < 20) fail("/admin/waiver", new Error("The waiver needs the text parents will accept."));
  await prisma.$transaction([
    prisma.waiver.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } }),
    prisma.waiver.create({ data: { body, isCurrent: true } }),
  ]);
  revalidatePath("/");
  redirect("/admin/waiver");
}

export async function setAttendance(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const sessionId = String(formData.get("sessionId") ?? "");
  const attended = String(formData.get("attended")) === "yes";
  await prisma.registration.update({ where: { id }, data: { attended } });
  revalidatePath(`/admin/schedule/${sessionId}/roster`);
}

export async function refundOneTime(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = String(formData.get("back") ?? "/admin/participants");
  try {
    await refundRegistration(id);
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}

export async function subscriptionAction(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const action = String(formData.get("action") ?? "");
  const back = `/admin/subscriptions/${id}`;
  try {
    if (action === "plan") await changeSubscriptionPlan(id, String(formData.get("planId")));
    else if (action === "price") await setCustomPrice(id, dollarsToCents(String(formData.get("price") ?? "")));
    else if (action === "pause") await pauseSubscription(id);
    else if (action === "resume") await resumeSubscription(id);
    else if (action === "cancel-end") await cancelAtPeriodEnd(id);
    else if (action === "cancel-now") await cancelNow(id);
    else if (action === "renew") await renewSubscription(id);
    else if (action === "next-bill") await setNextBillDate(id, String(formData.get("date") ?? ""));
    else throw new Error("Unknown action.");
  } catch (error) {
    fail(back, error);
  }
  redirect(back);
}
