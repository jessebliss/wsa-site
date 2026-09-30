"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { refundRegistration } from "@/lib/billing";
import { ensurePlanStripePrice } from "@/lib/billing";
import { dollarsToCents } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import {
  cancelAtPeriodEnd,
  cancelNow,
  changeSubscriptionPlan,
  pauseSubscription,
  renewSubscription,
  resumeSubscription,
  setCustomPrice,
  setNextBillDate,
} from "@/lib/subscription-admin";
import { etToUtc } from "@/lib/time";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
}

function fail(path: string, error: unknown): never {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  redirect(`${path}?error=${encodeURIComponent(message)}`);
}

export async function logout() {
  await signOut({ redirectTo: "/admin/login" });
}

export async function saveSession(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const back = id ? `/admin/schedule/${id}` : "/admin/schedule";
  try {
    const date = String(formData.get("date") ?? "");
    const start = String(formData.get("start") ?? "");
    const end = String(formData.get("end") ?? "");
    const startsAt = etToUtc(date, start);
    const endsAt = etToUtc(date, end);
    if (!(startsAt.getTime() < endsAt.getTime())) throw new Error("End time has to be after the start.");
    const data = {
      kind: String(formData.get("kind")) as "GROUP" | "CAMP" | "PRIVATE",
      program: String(formData.get("program") ?? "").trim(),
      title: String(formData.get("title") ?? "").trim(),
      coach: String(formData.get("coach") ?? "").trim() || null,
      description: String(formData.get("description") ?? "").trim() || null,
      location: String(formData.get("location") ?? "").trim(),
      startsAt,
      endsAt,
      capacity: Number(formData.get("capacity")),
      priceCents: dollarsToCents(String(formData.get("price") ?? "")),
      status: String(formData.get("status") ?? "SCHEDULED") as "SCHEDULED" | "CANCELED",
    };
    if (!data.program || !data.title || !data.location) throw new Error("Program, title, and location are required.");
    if (!Number.isInteger(data.capacity) || data.capacity < 1) throw new Error("Capacity has to be at least 1.");
    if (id) {
      await prisma.trainingSession.update({ where: { id }, data });
    } else {
      await prisma.trainingSession.create({ data });
    }
  } catch (error) {
    fail(back, error);
  }
  revalidatePath("/");
  revalidatePath("/admin/schedule");
  redirect("/admin/schedule");
}

export async function savePlan(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  try {
    const data = {
      name: String(formData.get("name") ?? "").trim(),
      program: String(formData.get("program") ?? "").trim(),
      sessionsPerMonth: Number(formData.get("sessionsPerMonth")),
      priceCents: dollarsToCents(String(formData.get("price") ?? "")),
      active: formData.get("active") === "on",
      sortOrder: Number(formData.get("sortOrder") ?? 0) || 0,
    };
    if (!data.name || !data.program) throw new Error("Name and program are required.");
    if (!Number.isInteger(data.sessionsPerMonth) || data.sessionsPerMonth < 1) {
      throw new Error("Sessions per month has to be at least 1.");
    }
    const plan = id
      ? await prisma.plan.update({ where: { id }, data })
      : await prisma.plan.create({ data });
    if (stripeConfigured()) {
      await ensurePlanStripePrice(plan);
    }
  } catch (error) {
    fail("/admin/plans", error);
  }
  revalidatePath("/");
  redirect("/admin/plans");
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
