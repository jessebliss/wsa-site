import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { billingPortalUrl, getStripe } from "@/lib/stripe";
import { sendReceipt } from "@/lib/email";
import { appUrl, ACADEMY_EMAIL, ACADEMY_PHONE } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import { formatEtLong } from "@/lib/time";
import type { Plan, SubscriptionStatus } from "@prisma/client";

type InvoiceShape = Stripe.Invoice & {
  subscription?: string | { id: string } | null;
  parent?: {
    subscription_details?: { subscription?: string | { id: string } | null };
    type?: string;
  } | null;
};

type SubscriptionShape = Stripe.Subscription & {
  current_period_start?: number;
  current_period_end?: number;
};

function idOf(value: string | { id: string } | null | undefined) {
  if (!value) return null;
  return typeof value === "string" ? value : value.id;
}

export function invoiceSubscriptionId(invoice: Stripe.Invoice) {
  const shaped = invoice as InvoiceShape;
  return (
    idOf(shaped.subscription) ??
    idOf(shaped.parent?.subscription_details?.subscription) ??
    null
  );
}

function periodOf(sub: Stripe.Subscription) {
  const shaped = sub as SubscriptionShape;
  const item = sub.items.data[0] as { current_period_start?: number; current_period_end?: number } | undefined;
  const start = shaped.current_period_start ?? item?.current_period_start;
  const end = shaped.current_period_end ?? item?.current_period_end;
  return {
    start: start ? new Date(start * 1000) : null,
    end: end ? new Date(end * 1000) : null,
  };
}

export function mapSubscriptionStatus(sub: Stripe.Subscription): SubscriptionStatus {
  if (sub.pause_collection) return "PAUSED";
  switch (sub.status) {
    case "active":
    case "trialing":
      return "ACTIVE";
    case "past_due":
    case "unpaid":
      return "PAST_DUE";
    case "canceled":
    case "incomplete_expired":
      return "CANCELED";
    case "paused":
      return "PAUSED";
    default:
      return "INCOMPLETE";
  }
}

function priceCentsOf(sub: Stripe.Subscription) {
  const amount = sub.items.data[0]?.price?.unit_amount;
  return typeof amount === "number" ? amount : null;
}

export async function ensurePlanStripePrice(plan: Plan) {
  const stripe = getStripe();
  if (plan.stripePriceId) {
    const price = await stripe.prices.retrieve(plan.stripePriceId);
    if (price.unit_amount === plan.priceCents && price.active) return plan;
  }
  let productId = plan.stripeProductId;
  if (!productId) {
    const product = await stripe.products.create({
      name: plan.name,
      metadata: { planId: plan.id, program: plan.program },
    });
    productId = product.id;
  }
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: plan.priceCents,
    currency: "usd",
    recurring: { interval: "month" },
    nickname: `${plan.name} ${plan.priceCents}`,
  });
  return prisma.plan.update({
    where: { id: plan.id },
    data: { stripeProductId: productId, stripePriceId: price.id },
  });
}

export async function upsertFromStripeSubscription(
  sub: Stripe.Subscription,
  metadata: Stripe.Metadata | null | undefined,
) {
  const period = periodOf(sub);
  const status = mapSubscriptionStatus(sub);
  const priceCents = priceCentsOf(sub);
  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });
  const meta = metadata ?? {};
  const customerId = idOf(sub.customer as string | { id: string });

  if (!existing) {
    const planId = meta.planId || sub.metadata?.planId;
    if (!planId) return null;
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) return null;
    const email = (meta.email || sub.metadata?.email || "").toLowerCase();
    if (!email) return null;
    return prisma.subscription.create({
      data: {
        email,
        parentName: meta.parentName || sub.metadata?.parentName || "Parent",
        phone: meta.phone || sub.metadata?.phone || "",
        playerName: meta.playerName || sub.metadata?.playerName || "Player",
        planId: plan.id,
        priceCents: priceCents ?? plan.priceCents,
        sessionsIncluded: Number(meta.sessionsIncluded || sub.metadata?.sessionsIncluded || plan.sessionsPerMonth),
        stripeCustomerId: customerId,
        stripeSubscriptionId: sub.id,
        status,
        currentPeriodStart: period.start,
        currentPeriodEnd: period.end,
        cancelAtPeriodEnd: sub.cancel_at_period_end,
        waiverAcceptanceId: meta.waiverAcceptanceId || sub.metadata?.waiverAcceptanceId || null,
      },
    });
  }

  const periodChanged =
    existing.currentPeriodStart &&
    period.start &&
    existing.currentPeriodStart.getTime() !== period.start.getTime();

  return prisma.subscription.update({
    where: { id: existing.id },
    data: {
      status,
      stripeCustomerId: customerId ?? existing.stripeCustomerId,
      priceCents: priceCents ?? existing.priceCents,
      currentPeriodStart: period.start,
      currentPeriodEnd: period.end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      sessionsUsed: periodChanged ? 0 : existing.sessionsUsed,
    },
  });
}

async function claimEvent(id: string) {
  try {
    await prisma.stripeEvent.create({ data: { id } });
    return true;
  } catch {
    return false;
  }
}

export async function handleStripeEvent(event: Stripe.Event) {
  const fresh = await claimEvent(event.id);
  if (!fresh) return;

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode === "payment") await markSessionPaid(session);
    if (session.mode === "subscription") {
      const subId = idOf(session.subscription as string | { id: string } | null);
      if (subId) {
        const sub = await getStripe().subscriptions.retrieve(subId);
        await upsertFromStripeSubscription(sub, { ...sub.metadata, ...session.metadata });
      }
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const sub = event.data.object as Stripe.Subscription;
    await upsertFromStripeSubscription(sub, sub.metadata);
  }

  if (event.type === "invoice.paid") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = invoiceSubscriptionId(invoice);
    if (!subId) return;
    const sub = await getStripe().subscriptions.retrieve(subId);
    const local = await upsertFromStripeSubscription(sub, sub.metadata);
    const reason = invoice.billing_reason;
    if (local && reason === "subscription_cycle") {
      await prisma.subscription.update({
        where: { id: local.id },
        data: { sessionsUsed: 0, status: "ACTIVE" },
      });
    }
    if (local && invoice.amount_paid > 0) {
      await sendSubscriptionReceipt(local.id);
    }
  }

  if (event.type === "invoice.payment_failed") {
    const invoice = event.data.object as Stripe.Invoice;
    const subId = invoiceSubscriptionId(invoice);
    if (!subId) return;
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subId },
      data: { status: "PAST_DUE" },
    });
  }

  if (event.type === "charge.refunded") {
    const charge = event.data.object as Stripe.Charge;
    const paymentIntent = idOf(charge.payment_intent as string | { id: string } | null);
    if (!paymentIntent) return;
    await prisma.registration.updateMany({
      where: { stripePaymentIntentId: paymentIntent, kind: "ONE_TIME" },
      data: { paymentStatus: "REFUNDED" },
    });
  }
}

export async function markSessionPaid(session: Stripe.Checkout.Session) {
  const registrationId = session.metadata?.registrationId ?? session.client_reference_id;
  if (!registrationId) return;
  const paymentIntent = idOf(session.payment_intent as string | { id: string } | null);
  const registration = await prisma.registration.findUnique({
    where: { id: registrationId },
    include: { session: true },
  });
  if (!registration) return;
  if (registration.paymentStatus === "PAID") return;
  await prisma.registration.update({
    where: { id: registration.id },
    data: {
      paymentStatus: "PAID",
      stripePaymentIntentId: paymentIntent,
      amountCents: session.amount_total ?? registration.amountCents,
      stripeCheckoutSessionId: session.id,
    },
  });
  const when = formatEtLong(registration.session.startsAt);
  await sendReceipt(
    registration.email,
    "Walker Sports Academy receipt",
    [
      "Thanks for registering with Walker Sports Academy.",
      "",
      `Player: ${registration.playerName}`,
      `Parent: ${registration.parentName}`,
      `Session: ${registration.session.title}`,
      `When: ${when} ET`,
      `Amount: ${formatMoney(session.amount_total ?? registration.amountCents)}`,
      "",
      `Questions: ${ACADEMY_EMAIL} or ${ACADEMY_PHONE}`,
    ].join("\n"),
  );
}

async function sendSubscriptionReceipt(subscriptionId: string) {
  const sub = await prisma.subscription.findUnique({
    where: { id: subscriptionId },
    include: { plan: true },
  });
  if (!sub) return;
  let portal = "";
  if (sub.stripeCustomerId) {
    try {
      portal = await billingPortalUrl(sub.stripeCustomerId, `${appUrl()}/`);
    } catch (error) {
      console.error("Billing portal link failed", error);
    }
  }
  await sendReceipt(
    sub.email,
    "Walker Sports Academy membership receipt",
    [
      "Thanks for joining Walker Sports Academy.",
      "",
      `Player: ${sub.playerName}`,
      `Parent: ${sub.parentName}`,
      `Plan: ${sub.plan.name}`,
      `Amount: ${formatMoney(sub.priceCents)} per month`,
      `Group sessions this period: ${sub.sessionsIncluded}`,
      "Unused sessions expire at the end of the billing period and do not roll over.",
      "Camps and private lessons are paid separately.",
      "",
      portal ? `Update your card or cancel: ${portal}` : "Contact the academy to update the card on file.",
      "",
      `Questions: ${ACADEMY_EMAIL} or ${ACADEMY_PHONE}`,
    ].join("\n"),
  );
}

export async function refundRegistration(registrationId: string) {
  const registration = await prisma.registration.findUnique({ where: { id: registrationId } });
  if (!registration) throw new Error("Registration not found.");
  if (registration.kind !== "ONE_TIME" || registration.paymentStatus !== "PAID") {
    throw new Error("Only a paid one-time charge can be refunded.");
  }
  if (!registration.stripePaymentIntentId) {
    throw new Error("This charge has no Stripe payment to refund.");
  }
  await getStripe().refunds.create({ payment_intent: registration.stripePaymentIntentId });
  await prisma.registration.update({
    where: { id: registration.id },
    data: { paymentStatus: "REFUNDED" },
  });
}
