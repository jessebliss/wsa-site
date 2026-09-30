import Link from "next/link";
import { notFound } from "next/navigation";
import { subscriptionAction } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatEtDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function SubscriptionDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const sub = await prisma.subscription.findUnique({
    where: { id },
    include: { plan: true, waiverAcceptance: true },
  });
  if (!sub) notFound();
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });

  return (
    <div>
      <Link href="/admin/subscriptions" className="text-sm font-semibold text-primary">All subscriptions</Link>
      <h1 className="mt-2 font-display text-4xl uppercase">{sub.playerName}</h1>
      <p className="text-sm">{sub.parentName} · {sub.email} · {sub.phone}</p>
      <p className="mt-2 text-sm font-semibold">
        {sub.status}{sub.cancelAtPeriodEnd ? " · cancels at period end" : ""} · {formatMoney(sub.priceCents)} / month
      </p>
      <p className="text-sm text-muted-foreground">
        {sub.plan.name} · {sub.sessionsUsed} of {sub.sessionsIncluded} used
        {sub.currentPeriodEnd ? ` · period ends ${formatEtDate(sub.currentPeriodEnd)}` : ""}
      </p>
      {sub.status === "PAST_DUE" ? (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-primary">Payment is past due.</p>
      ) : null}
      {!sub.stripeSubscriptionId ? (
        <p className="mt-3 text-sm">This record is not linked to Stripe, so billing changes are unavailable.</p>
      ) : null}
      <AdminError message={query.error} />
      <div className="mt-6 space-y-4">
        <form action={subscriptionAction} className="rounded-2xl bg-white p-4">
          <input type="hidden" name="id" value={sub.id} />
          <input type="hidden" name="action" value="plan" />
          <Label htmlFor="planId">Change plan</Label>
          <p className="text-xs text-muted-foreground">Stripe prorates the difference and invoices it now. This person moves to the new plan&apos;s price and session count.</p>
          <select id="planId" name="planId" className="mt-2 h-11 w-full rounded-md border border-border px-3" defaultValue={sub.planId}>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>{plan.name} · {formatMoney(plan.priceCents)} · {plan.sessionsPerMonth}/mo</option>
            ))}
          </select>
          <Button className="mt-3 w-full" type="submit">Update plan</Button>
        </form>
        <form action={subscriptionAction} className="rounded-2xl bg-white p-4">
          <input type="hidden" name="id" value={sub.id} />
          <input type="hidden" name="action" value="price" />
          <Label htmlFor="price">Custom price</Label>
          <p className="text-xs text-muted-foreground">Only this person. The catalog price stays the same. Stripe prorates the change.</p>
          <Input className="mt-2" id="price" name="price" defaultValue={centsToDollarInput(sub.priceCents)} />
          <Button className="mt-3 w-full" type="submit" variant="outline">Set custom price</Button>
        </form>
        <form action={subscriptionAction} className="rounded-2xl bg-white p-4">
          <input type="hidden" name="id" value={sub.id} />
          <input type="hidden" name="action" value="next-bill" />
          <Label htmlFor="date">Next bill date</Label>
          <Input className="mt-2" id="date" name="date" type="date" required />
          <Button className="mt-3 w-full" type="submit" variant="outline">Update next bill</Button>
        </form>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ["pause", "Pause"],
            ["resume", "Resume"],
            ["cancel-end", "Cancel at period end"],
            ["cancel-now", "Cancel now"],
            ["renew", "Renew"],
          ].map(([action, label]) => (
            <form key={action} action={subscriptionAction}>
              <input type="hidden" name="id" value={sub.id} />
              <input type="hidden" name="action" value={action} />
              <Button className="w-full" type="submit" variant="outline">{label}</Button>
            </form>
          ))}
        </div>
      </div>
      {sub.waiverAcceptance ? (
        <details className="mt-6 rounded-xl bg-white p-4 text-sm">
          <summary className="cursor-pointer font-semibold">Waiver accepted {sub.waiverAcceptance.acceptedAt.toISOString()}</summary>
          <pre className="mt-3 whitespace-pre-wrap font-sans">{sub.waiverAcceptance.waiverText}</pre>
        </details>
      ) : null}
    </div>
  );
}
