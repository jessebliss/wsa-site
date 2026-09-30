import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckoutForm } from "@/components/checkout-form";
import { countOccupied } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatEtLong } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SessionCheckoutPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.status !== "SCHEDULED") notFound();
  const taken = await countOccupied(session.id);
  const spotsLeft = session.capacity - taken;
  const waiver = await prisma.waiver.findFirst({
    where: { isCurrent: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/" className="text-sm font-semibold text-primary">Back to the schedule</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{session.program}</p>
      <h1 className="font-display text-4xl uppercase">{session.title}</h1>
      <p className="mt-2 text-sm">{formatEtLong(session.startsAt)} ET</p>
      <p className="text-sm text-muted-foreground">{session.location}</p>
      {session.coach ? <p className="text-sm">{session.coach}</p> : null}
      {session.description ? <p className="mt-3 text-sm leading-relaxed">{session.description}</p> : null}
      <p className="mt-3 text-sm font-semibold">
        {spotsLeft <= 0 ? "Sold out" : `${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left`} · {formatMoney(session.priceCents)}
      </p>
      {session.kind === "GROUP" ? (
        <p className="mt-2 text-sm text-muted-foreground">
          If this email has an active {session.program} plan with sessions left, confirming the spot uses one session instead of a card.
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">This is a one-time payment. Monthly plans do not cover it.</p>
      )}
      {spotsLeft <= 0 || !waiver ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">
          {spotsLeft <= 0 ? "This session is sold out." : "The waiver is not published yet."}
        </p>
      ) : (
        <div className="mt-6">
          <CheckoutForm
            sessionId={session.id}
            priceCents={session.priceCents}
            waiver={waiver.body}
            allowPromo
          />
        </div>
      )}
    </div>
  );
}
