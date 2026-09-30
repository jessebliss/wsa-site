import { NextResponse } from "next/server";
import { z } from "zod";
import {
  BookingError,
  bookWithPlanCredit,
  discountCents,
  expireRegistration,
  findActivePromo,
  holdOneTime,
  previewCredit,
} from "@/lib/booking";
import { coachAllowsSession } from "@/lib/openings";
import { personSchema, zodMessage } from "@/lib/validators";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { appUrl } from "@/lib/utils";
import { formatMoney } from "@/lib/money";

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
    const session = await prisma.trainingSession.findUnique({ where: { id: rough.data.sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });
    if (!(await coachAllowsSession(session))) {
      return NextResponse.json({ error: "That coach is not available for this session." }, { status: 400 });
    }
    try {
      let amount = session.priceCents;
      let message = `${formatMoney(session.priceCents)} before the card form.`;
      if (session.kind === "GROUP" && rough.data.email) {
        const preview = await previewCredit(rough.data.email, session.id);
        amount = preview.priceCents;
        message = preview.message;
        if (preview.covered) {
          return NextResponse.json({ covered: true, amountCents: 0, message });
        }
      }
      if (rough.data.promoCode && amount > 0) {
        const promo = await findActivePromo(rough.data.promoCode);
        if (promo) {
          amount = discountCents(session.priceCents, promo);
          message = `${formatMoney(amount)} after promo ${promo.code}. Stripe charges this amount.`;
        }
      }
      return NextResponse.json({ covered: false, amountCents: amount, message });
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
    const session = await prisma.trainingSession.findUnique({ where: { id: input.sessionId } });
    if (!session) return NextResponse.json({ error: "Session not found." }, { status: 404 });

    if (session.kind === "GROUP") {
      const credit = await bookWithPlanCredit(session.id, person);
      if (credit.booked) {
        return NextResponse.json({ redirect: `/book/confirmed?registration=${credit.registrationId}` });
      }
    }

    if (!stripeConfigured()) {
      return NextResponse.json(
        {
          error:
            "Card checkout needs a Stripe test key. Monthly plan credits still confirm without a card when this email has sessions left.",
        },
        { status: 503 },
      );
    }

    const promo = await findActivePromo(input.promoCode);
    const held = await holdOneTime(session.id, person, promo);
    try {
      const stripe = getStripe();
      const checkout = await stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: person.email,
        client_reference_id: held.registration.id,
        success_url: `${appUrl()}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl()}/checkout/cancel?registration=${held.registration.id}`,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: session.priceCents,
              product_data: { name: session.title },
            },
          },
        ],
        discounts: promo?.stripePromotionCodeId
          ? [{ promotion_code: promo.stripePromotionCodeId }]
          : undefined,
        metadata: { kind: "session", registrationId: held.registration.id },
      });
      await prisma.registration.update({
        where: { id: held.registration.id },
        data: { stripeCheckoutSessionId: checkout.id },
      });
      if (!checkout.url) throw new Error("Stripe did not return a checkout link.");
      return NextResponse.json({ redirect: checkout.url });
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
