import { prisma } from "@/lib/prisma";
import { ensurePlanStripePrice, mapSubscriptionStatus } from "@/lib/billing";
import { getStripe } from "@/lib/stripe";
import { etToUtc } from "@/lib/time";

async function load(id: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { plan: true },
  });
  if (!sub) throw new Error("Subscription not found.");
  if (!sub.stripeSubscriptionId || !sub.stripeCustomerId) {
    throw new Error("This subscription is not linked to Stripe, so the card cannot be changed from here.");
  }
  return sub;
}

export async function changeSubscriptionPlan(id: string, planId: string) {
  const local = await load(id);
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) throw new Error("That plan is not available.");
  const priced = await ensurePlanStripePrice(plan);
  const stripe = getStripe();
  const remote = await stripe.subscriptions.retrieve(local.stripeSubscriptionId!);
  const itemId = remote.items.data[0]?.id;
  if (!itemId || !priced.stripePriceId) throw new Error("Stripe price is missing.");
  const updated = await stripe.subscriptions.update(local.stripeSubscriptionId!, {
    items: [{ id: itemId, price: priced.stripePriceId }],
    proration_behavior: "always_invoice",
    metadata: {
      ...remote.metadata,
      planId: plan.id,
      sessionsIncluded: String(plan.sessionsPerMonth),
    },
  });
  await prisma.subscription.update({
    where: { id: local.id },
    data: {
      planId: plan.id,
      priceCents: plan.priceCents,
      sessionsIncluded: plan.sessionsPerMonth,
      status: mapSubscriptionStatus(updated),
      cancelAtPeriodEnd: updated.cancel_at_period_end,
    },
  });
}

export async function setCustomPrice(id: string, priceCents: number) {
  const local = await load(id);
  const pricedPlan = await ensurePlanStripePrice(local.plan);
  if (!pricedPlan.stripeProductId) throw new Error("Stripe product is missing.");
  const stripe = getStripe();
  const price = await stripe.prices.create({
    product: pricedPlan.stripeProductId,
    unit_amount: priceCents,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: `Custom ${local.email}`,
  });
  const remote = await stripe.subscriptions.retrieve(local.stripeSubscriptionId!);
  const itemId = remote.items.data[0]?.id;
  if (!itemId) throw new Error("Stripe subscription has no item.");
  const updated = await stripe.subscriptions.update(local.stripeSubscriptionId!, {
    items: [{ id: itemId, price: price.id }],
    proration_behavior: "always_invoice",
  });
  await prisma.subscription.update({
    where: { id: local.id },
    data: { priceCents, status: mapSubscriptionStatus(updated) },
  });
}

export async function pauseSubscription(id: string) {
  const local = await load(id);
  const updated = await getStripe().subscriptions.update(local.stripeSubscriptionId!, {
    pause_collection: { behavior: "void" },
  });
  await prisma.subscription.update({
    where: { id: local.id },
    data: { status: mapSubscriptionStatus(updated) },
  });
}

export async function resumeSubscription(id: string) {
  const local = await load(id);
  const updated = await getStripe().subscriptions.update(local.stripeSubscriptionId!, {
    pause_collection: "",
  });
  await prisma.subscription.update({
    where: { id: local.id },
    data: { status: mapSubscriptionStatus(updated) },
  });
}

export async function cancelAtPeriodEnd(id: string) {
  const local = await load(id);
  const updated = await getStripe().subscriptions.update(local.stripeSubscriptionId!, {
    cancel_at_period_end: true,
  });
  await prisma.subscription.update({
    where: { id: local.id },
    data: { cancelAtPeriodEnd: true, status: mapSubscriptionStatus(updated) },
  });
}

export async function cancelNow(id: string) {
  const local = await load(id);
  const updated = await getStripe().subscriptions.cancel(local.stripeSubscriptionId!);
  await prisma.subscription.update({
    where: { id: local.id },
    data: { status: mapSubscriptionStatus(updated), cancelAtPeriodEnd: false },
  });
}

export async function renewSubscription(id: string) {
  const local = await load(id);
  const stripe = getStripe();
  if (local.status !== "CANCELED" && local.cancelAtPeriodEnd) {
    const updated = await stripe.subscriptions.update(local.stripeSubscriptionId!, {
      cancel_at_period_end: false,
    });
    await prisma.subscription.update({
      where: { id: local.id },
      data: { cancelAtPeriodEnd: false, status: mapSubscriptionStatus(updated) },
    });
    return;
  }
  const priced = await ensurePlanStripePrice(local.plan);
  if (!priced.stripePriceId) throw new Error("Stripe price is missing.");
  const created = await stripe.subscriptions.create({
    customer: local.stripeCustomerId!,
    items: [{ price: priced.stripePriceId }],
    metadata: {
      planId: local.planId,
      email: local.email,
      parentName: local.parentName,
      phone: local.phone,
      playerName: local.playerName,
      sessionsIncluded: String(local.sessionsIncluded),
      waiverAcceptanceId: local.waiverAcceptanceId ?? "",
    },
  });
  await prisma.subscription.update({
    where: { id: local.id },
    data: {
      stripeSubscriptionId: created.id,
      status: mapSubscriptionStatus(created),
      cancelAtPeriodEnd: false,
      sessionsUsed: 0,
      priceCents: local.plan.priceCents,
    },
  });
}

export async function setNextBillDate(id: string, date: string) {
  const local = await load(id);
  const when = etToUtc(date, "09:00");
  if (when.getTime() <= Date.now()) throw new Error("The next bill date has to be in the future.");
  const updated = await getStripe().subscriptions.update(local.stripeSubscriptionId!, {
    trial_end: Math.floor(when.getTime() / 1000),
    proration_behavior: "none",
  });
  const periodEnd = new Date(Math.floor(when.getTime()));
  await prisma.subscription.update({
    where: { id: local.id },
    data: {
      status: mapSubscriptionStatus(updated),
      currentPeriodEnd: periodEnd,
    },
  });
}
