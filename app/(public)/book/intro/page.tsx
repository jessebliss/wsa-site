import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { chargeLines, checkoutLineItems } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { INTRO_CHECKOUT_ID, INTRO_LABEL, INTRO_NOTE, INTRO_PRICE_CENTS } from "@/lib/intro";
import { formatMoney } from "@/lib/money";
import { loadIntroCoachNames } from "@/lib/private-quarterback-data";
import { matchCoachName } from "@/lib/private-quarterback";
import { isPlaceholderCoach } from "@/lib/schedule-filter";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "QB Introduction Session" };

export default async function IntroCheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ coach?: string }>;
}) {
  const query = await searchParams;
  const coaches = await loadIntroCoachNames();
  const requested = matchCoachName(query.coach ?? "", coaches);
  const coach = !requested || isPlaceholderCoach(requested) || !coaches.includes(requested) ? "" : requested;
  const waiver = await prisma.waiver.findFirst({
    where: { isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
  const charge = chargeLines(INTRO_PRICE_CENTS, await loadCheckoutFees());
  const lines = checkoutLineItems(charge).map((line) =>
    line.label === "Session" ? { ...line, label: INTRO_LABEL } : line,
  );

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href={coach ? "/?start=new-coach" : "/?start=new"} className="text-sm font-semibold text-primary">
        {coach ? "Choose a coach" : "Back"}
      </Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{INTRO_LABEL}</p>
      <h1 className="font-display text-4xl uppercase">{INTRO_LABEL}</h1>
      <p className="mt-2 text-sm">{INTRO_NOTE}</p>
      <p className="mt-3 text-sm font-semibold">{formatMoney(INTRO_PRICE_CENTS)}</p>
      {coach ? <p className="mt-2 text-sm" data-intro-coach={coach}>With {coach}</p> : null}
      <p className="mt-2 text-sm text-muted-foreground">This is a one-time payment. It is not on the calendar. Monthly sessions do not cover it.</p>
      {!coach ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">
          Choose a coach for the introduction session before payment.{" "}
          <Link href="/?start=new-coach" className="font-semibold text-primary">Choose a coach</Link>
        </p>
      ) : !waiver ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">The waiver is not published yet.</p>
      ) : (
        <div className="mt-6">
          <CheckoutForm
            sessionId={INTRO_CHECKOUT_ID}
            priceCents={charge.totalCents}
            lines={lines}
            waiver={waiver.body}
            allowPromo
            intake="intro"
            coachName={coach}
          />
        </div>
      )}
    </div>
  );
}
