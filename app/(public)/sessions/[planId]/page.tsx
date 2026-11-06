import Link from "next/link";
import { notFound } from "next/navigation";
import { PlanForm } from "@/components/plan-form";
import { formatMoney } from "@/lib/money";
import { planCadence, planIsUnlimited, planOpenForSignup } from "@/lib/plan-options";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SessionOfferPage({
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
  const open = planOpenForSignup(plan);
  const waiver = await prisma.waiver.findFirst({
    where: { isCurrent: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-lg px-4 py-8">
      <Link href="/#plans" className="text-sm font-semibold text-primary">All plans</Link>
      <p className="mt-4 text-xs font-semibold uppercase tracking-[0.16em] text-primary">{plan.program}</p>
      <h1 className="font-display text-4xl uppercase">{plan.name}</h1>
      <p className="mt-2 font-display text-4xl" data-plan-cadence={planCadence(plan.billingInterval)}>
        {formatMoney(plan.priceCents)} <span className="text-lg">{planCadence(plan.billingInterval)}</span>
      </p>
      <p className="mt-2 text-sm">
        {planIsUnlimited(plan.sessionsPerMonth)
          ? `Unlimited group ${plan.program} times.`
          : `${plan.sessionsPerMonth} group ${plan.program} times each billing period. Unused times do not roll over.`}
        {plan.billingInterval === "YEAR" ? " Yearly is one charge per year." : ""}
      </p>
      {open && query.canceled ? <p className="mt-3 text-sm font-semibold">Checkout was canceled. You can try again.</p> : null}
      {!open ? (
        <p className="mt-6 rounded-xl bg-white p-4 text-sm">This plan is not open for new signups. People already on it keep it.</p>
      ) : waiver ? (
        <div className="mt-6">
          <PlanForm
            planId={plan.id}
            priceCents={plan.priceCents}
            waiver={waiver.body}
            cadence={plan.billingInterval === "YEAR" ? "Yearly" : "Monthly"}
          />
        </div>
      ) : (
        <p className="mt-6 text-sm">The waiver is not published yet.</p>
      )}
    </div>
  );
}
