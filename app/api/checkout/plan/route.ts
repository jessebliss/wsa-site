import { NextResponse } from "next/server";
import { z } from "zod";
import { BookingError } from "@/lib/booking";
import { ensurePlanStripePrice } from "@/lib/billing";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { appUrl, normalizeEmail } from "@/lib/utils";
import { personSchema, zodMessage } from "@/lib/validators";

export const dynamic = "force-dynamic";

const bodySchema = personSchema.extend({
  planId: z.string().min(1),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }
  if (!stripeConfigured()) {
    return NextResponse.json(
      { error: "Monthly plans bill through Stripe. Add a test secret key to start a subscription." },
      { status: 503 },
    );
  }

  try {
    const plan = await prisma.plan.findUnique({ where: { id: parsed.data.planId } });
    if (!plan || !plan.active) {
      return NextResponse.json({ error: "That plan is not available." }, { status: 404 });
    }
    const priced = await ensurePlanStripePrice(plan);
    const waiver = await prisma.waiver.findFirst({
      where: { isCurrent: true },
      orderBy: { createdAt: "desc" },
    });
    if (!waiver) throw new BookingError("The waiver is not set up yet.");
    const email = normalizeEmail(parsed.data.email);
    const acceptance = await prisma.waiverAcceptance.create({
      data: {
        fullName: parsed.data.parentName,
        email,
        waiverText: waiver.body,
        waiverId: waiver.id,
      },
    });
    const metadata = {
      kind: "plan",
      planId: plan.id,
      email,
      parentName: parsed.data.parentName,
      phone: parsed.data.phone,
      playerName: parsed.data.playerName,
      waiverAcceptanceId: acceptance.id,
      sessionsIncluded: String(plan.sessionsPerMonth),
    };
    const checkout = await getStripe().checkout.sessions.create({
      mode: "subscription",
      customer_email: email,
      success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl()}/plans/${plan.id}?canceled=1`,
      line_items: [{ price: priced.stripePriceId!, quantity: 1 }],
      metadata,
      subscription_data: { metadata },
    });
    if (!checkout.url) throw new Error("Stripe did not return a checkout link.");
    return NextResponse.json({ redirect: checkout.url });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start the plan.";
    const status = error instanceof BookingError ? 400 : 502;
    return NextResponse.json({ error: message }, { status });
  }
}
