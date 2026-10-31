import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BookingError,
  bookWithPlanCredit,
  discountCents,
  expireRegistration,
  findActivePromo,
  holdIntro,
  holdOneTime,
  previewCredit,
} from "@/lib/booking";
import { chargeLines, checkoutLineItems } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { INTRO_CHECKOUT_ID, INTRO_LABEL, INTRO_PRICE_CENTS } from "@/lib/intro";
import { listedSessionPrice } from "@/lib/private-quarterback-data";
import { coachAllowsSession } from "@/lib/openings";
import { personSchema, zodMessage } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";
import { formatMoney } from "@/lib/money";
import type { TrainingSession } from "@prisma/client";

async function priceOneTime(session: TrainingSession, promoCode?: string | null) {
  const listPrice = await listedSessionPrice(session);
  let sessionCents = listPrice;
  let promoName = "";
  const promo = promoCode ? await findActivePromo(promoCode) : null;
  if (promo) {
    sessionCents = discountCents(listPrice, promo);
    promoName = promo.code;
  }
  const charge = chargeLines(sessionCents, await loadCheckoutFees());
  const lines = checkoutLineItems(charge);
  const promoNote = promoName ? ` after promo ${promoName}` : "";
  const message =
    charge.registrationCents > 0 || charge.taxCents > 0
      ? `${formatMoney(charge.totalCents)} due today${promoNote}.`
      : `${formatMoney(charge.totalCents)}${promoNote || " before the card form."}`;
  return { promo, charge, lines, message };
}

async function priceIntro(promoCode?: string | null) {
  let sessionCents = INTRO_PRICE_CENTS;
  let promoName = "";
  const promo = promoCode ? await findActivePromo(promoCode) : null;
  if (promo) {
    sessionCents = discountCents(INTRO_PRICE_CENTS, promo);
    promoName = promo.code;
  }
  const charge = chargeLines(sessionCents, await loadCheckoutFees());
  const lines = checkoutLineItems(charge).map((line) =>
    line.label === "Session" ? { ...line, label: INTRO_LABEL } : line,
  );
  const promoNote = promoName ? ` after promo ${promoName}` : "";
  const message =
    charge.registrationCents > 0 || charge.taxCents > 0
      ? `${formatMoney(charge.totalCents)} due today${promoNote}.`
      : `${formatMoney(charge.totalCents)}${promoNote || " before the card form."}`;
  return { promo, charge, lines, message };
}

async function startCardCheckout(
  registrationId: string,
  email: string,
  lines: { label: string; cents: number }[],
  names: Record<string, string>,
) {
  const stripe = getStripe();
  const checkout = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    client_reference_id: registrationId,
    success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl()}/checkout/cancel?registration=${registrationId}`,
    line_items: lines
      .filter((line) => line.cents > 0)
      .map((line) => ({
        quantity: 1,
        price_data: {
          currency: "usd",
          unit_amount: line.cents,
          product_data: { name: names[line.label] ?? line.label },
        },
      })),
    metadata: { kind: "session", registrationId },
  });
  await prisma.registration.update({
    where: { id: registrationId },
    data: { stripeCheckoutSessionId: checkout.id },
  });
  if (!checkout.url) throw new Error("Stripe did not return a checkout link.");
  return checkout.url;
}

export const dynamic = "force-dynamic";

const bodySchema = personSchema.extend({
  sessionId: z.string().min(1),
  promoCode: z.string().trim().max(40).optional().or(z.literal("")),
  intent: z.enum(["quote", "book"]).default("book"),
});

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
  }

  const quoteOnly = typeof payload === "object" && payload && "intent" in payload && payload.intent === "quote";
  if (quoteOnly) {
    const rough = z
      .object({
        sessionId: z.string().min(1),
        email: z.string().optional(),
        promoCode: z.string().optional(),
      })
      .safeParse(payload);
    if (!rough.success) return NextResponse.json({ error: "Check the form and try again." }, { status: 400 });
    if (rough.data.sessionId === INTRO_CHECKOUT_ID) {
      try {
        const priced = await priceIntro(rough.data.promoCode);
        return NextResponse.json({
          covered: false,
          amountCents: priced.charge.totalCents,
          lines: priced.lines,
          message: priced.message,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Could not check that price.";
        return NextResponse.json({ error: message }, { status: 400 });
      }
    }
    const session = await prisma.trainingSession.findUnique({ where: { id: rough.data.sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    if (!(await coachAllowsSession(session))) {
      return NextResponse.json({ error: "That coach is not available for this session." }, { status: 400 });
    }
    try {
      if (session.kind === "GROUP" && rough.data.email) {
        const preview = await previewCredit(rough.data.email, session.id);
        if (preview.covered) {
          return NextResponse.json({ covered: true, amountCents: 0, lines: [], message: preview.message });
        }
      }
      const priced = await priceOneTime(session, rough.data.promoCode);
      return NextResponse.json({
        covered: false,
        amountCents: priced.charge.totalCents,
        lines: priced.lines,
        message: priced.message,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not check that price.";
      return NextResponse.json({ error: message }, { status: 400 });
    }
  }

  const parsed = bodySchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: zodMessage(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;
  const person = {
    parentName: input.parentName,
    email: input.email,
    phone: input.phone,
    playerName: input.playerName,
  };

  try {
    if (input.sessionId === INTRO_CHECKOUT_ID) {
      const priced = await priceIntro(input.promoCode);
      const held = await holdIntro(person, priced.promo, priced.charge);
      if (priced.charge.totalCents === 0) {
        await prisma.registration.update({
          where: { id: held.registration.id },
          data: { paymentStatus: "PAID", holdExpiresAt: null },
        });
        return NextResponse.json({ redirect: `/book/confirmed?registration=${held.registration.id}` });
      }
      if (!stripeConfigured()) {
        await expireRegistration(held.registration.id);
        return NextResponse.json({ error: "Card checkout needs a Stripe test key." }, { status: 503 });
      }
      try {
        const url = await startCardCheckout(held.registration.id, person.email, priced.lines, {
          [INTRO_LABEL]: INTRO_LABEL,
          Registration: "Registration",
          Tax: "Tax",
        });
        return NextResponse.json({ redirect: url });
      } catch (error) {
        await expireRegistration(held.registration.id);
        const message = error instanceof Error ? error.message : "Payment could not be started.";
        return NextResponse.json({ error: message }, { status: 502 });
      }
    }

    const session = await prisma.trainingSession.findUnique({ where: { id: input.sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    if (session.kind === "GROUP") {
      const credit = await bookWithPlanCredit(session.id, person);
      if (credit.booked) {
        return NextResponse.json({ redirect: `/book/confirmed?registration=${credit.registrationId}` });
      }
    }

    const priced = await priceOneTime(session, input.promoCode);
    if (priced.charge.totalCents === 0) {
      const held = await holdOneTime(session.id, person, priced.promo, priced.charge);
      await prisma.registration.update({
        where: { id: held.registration.id },
        data: { paymentStatus: "PAID", holdExpiresAt: null },
      });
      return NextResponse.json({ redirect: `/book/confirmed?registration=${held.registration.id}` });
    }

    if (!stripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Card checkout needs a Stripe test key. Monthly session credits still confirm without a card when this email has times left.",
        },
        { status: 503 },
      );
    }

    const held = await holdOneTime(session.id, person, priced.promo, priced.charge);
    try {
      // The promo is already taken off the session line. Stripe must not apply it again,
      // or it would also discount registration and tax.
      const url = await startCardCheckout(held.registration.id, person.email, priced.lines, {
        Session: session.title,
        Registration: "Registration",
        Tax: "Tax",
      });
      return NextResponse.json({ redirect: url });
    } catch (error) {
      await expireRegistration(held.registration.id);
      const message = error instanceof Error ? error.message : "Payment could not be started.";
      return NextResponse.json({ error: message }, { status: 502 });
    }
  } catch (error) {
    if (error instanceof BookingError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
