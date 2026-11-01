import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { countOccupied } from "@/lib/booking";
import { chargeLines, checkoutLineItems } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { listedSessionPrice } from "@/lib/private-quarterback-data";
import { formatMoney } from "@/lib/money";
import { coachAllowsSession } from "@/lib/openings";
import { prisma } from "@/lib/prisma";
import { isPlaceholderCoach, isPlaceholderOnly } from "@/lib/schedule-filter";
import { formatEtLong } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SessionCheckoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "SCHEDULED" || isPlaceholderOnly(session)) notFound();
  const taken = await countOccupied(session.id);
  const spotsLeft = session.capacity - taken;
  const coachOpen = await coachAllowsSession(session);
  const waiver = await prisma.waiver.findFirst({
    where: { isCurrent: true },
    orderBy: { createdAt: "desc" },
  });
  const listPrice = await listedSessionPrice(session);
  const charge = chargeLines(listPrice, await loadCheckoutFees());
  const lines = checkoutLineItems(charge);

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-primary">Back to the schedule</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{session.program}</p>
      <h1 className="font-display text-4xl uppercase">{session.title}</h1>
      <p className="mt-2 text-sm">{formatEtLong(session.startsAt)} ET</p>
      <p className="text-sm text-muted-foreground">{session.location}</p>
      {session.coach && !isPlaceholderCoach(session.coach) ? <p className="text-sm">{session.coach}</p> : null}
      {session.description ? <p className="mt-3 text-sm leading-relaxed">{session.description}</p> : null}
      <p className="mt-3 text-sm font-semibold">
        {spotsLeft <= 0 ? "Sold out" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`} · {formatMoney(listPrice)}
      </p>
      {session.kind === "GROUP" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          If this email has an active {session.program} session with times left, confirming the spot uses one time instead of a card.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">This is a one-time payment. Monthly sessions do not cover it.</p>
      )}
      {spotsLeft <= 0 || !waiver || !coachOpen ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">
          {spotsLeft <= 0
            ? "This session is sold out."
            : !coachOpen
              ? "This coach is not available for this session."
              : "The waiver is not published yet."}
        </p>
      ) : (
        <div className="mt-6">
          <CheckoutForm
            sessionId={session.id}
            priceCents={charge.totalCents}
            lines={lines}
            waiver={waiver.body}
            allowPromo
          />
        </div>
      )}
    </div>
  );
}
