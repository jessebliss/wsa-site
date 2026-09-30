import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanForm } from "@/components/plan-form";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function PlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ planId: string }>;
  searchParams: Promise<{ canceled?: string }>;
}) {
  const { planId } = await params;
  const query = await searchParams;
  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan || !plan.active) notFound();
  const waiver = await prisma.waiver.findFirst({
    where: { isCurrent: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/book-session#plans" className="text-sm font-semibold text-primary">All plans</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{plan.program}</p>
      <h1 className="font-display text-4xl uppercase">{plan.name}</h1>
      <p className="mt-2 font-display text-4xl">{formatMoney(plan.priceCents)} <span className="text-lg">per month</span></p>
      <p className="mt-2 text-sm">{plan.sessionsPerMonth} group {plan.program} sessions each billing period. Unused sessions do not roll over.</p>
      {query.canceled ? <p className="mt-3 text-sm font-semibold">Checkout was canceled. You can try again.</p> : null}
      {waiver ? (
        <div className="mt-6">
          <PlanForm planId={plan.id} priceCents={plan.priceCents} waiver={waiver.body} />
        </div>
      ) : (
        <p className="mt-6 text-sm">The waiver is not published yet.</p>
      )}
    </div>
  );
}
