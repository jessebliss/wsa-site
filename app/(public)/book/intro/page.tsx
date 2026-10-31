import Link from "next/link";
import { CheckoutForm } from "@/components/checkout-form";
import { chargeLines, checkoutLineItems } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { INTRO_CHECKOUT_ID, INTRO_LABEL, INTRO_NOTE, INTRO_PRICE_CENTS } from "@/lib/intro";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "QB Introduction Session" };

export default async function IntroCheckoutPage() {
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
      <Link href="/" className="text-sm font-semibold text-primary">Back to the schedule</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{INTRO_LABEL}</p>
      <h1 className="font-display text-4xl uppercase">{INTRO_LABEL}</h1>
      <p className="mt-2 text-sm">{INTRO_NOTE}</p>
      <p className="mt-3 text-sm font-semibold">{formatMoney(INTRO_PRICE_CENTS)}</p>
      <p className="mt-2 text-sm text-muted-foreground">This is a one-time payment. It is not on the calendar. Monthly sessions do not cover it.</p>
      {!waiver ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">The waiver is not published yet.</p>
      ) : (
        <div className="mt-6">
          <CheckoutForm sessionId={INTRO_CHECKOUT_ID} priceCents={charge.totalCents} lines={lines} waiver={waiver.body} allowPromo />
        </div>
      )}
    </div>
  );
}
