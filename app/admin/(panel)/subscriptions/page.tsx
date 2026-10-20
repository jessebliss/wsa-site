import Link from "next/link";
import { createVenmoMembership } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { subscriptionPlanName } from "@/lib/subscription-admin";
import { Prisma, type PaymentMethod, type SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscriptions" };

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "CANCELED", "PAST_DUE", "PAUSED", "INCOMPLETE"];

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  CANCELED: "Canceled",
  PAST_DUE: "Past due",
  PAUSED: "Paused",
  INCOMPLETE: "Incomplete",
};

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; q?: string; status?: string; pay?: string; plan?: string }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = STATUSES.includes(params.status as SubscriptionStatus) ? (params.status as SubscriptionStatus) : "";
  const pay = params.pay === "STRIPE" || params.pay === "VENMO" ? params.pay : "";
  const plan = params.plan ?? "";
  const plans = await prisma.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const planIds = new Set(plans.map((item) => item.id));
  const where: Prisma.SubscriptionWhereInput = {};
  if (status) where.status = status;
  if (pay) where.paymentMethod = pay as PaymentMethod;
  if (plan === "none") where.planId = null;
  else if (plan && planIds.has(plan)) where.planId = plan;
  if (q) {
    where.OR = [
      { parentName: { contains: q, mode: "insensitive" } },
      { playerName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }
  const subs = await prisma.subscription.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { plan: true },
  });
  const filtering = Boolean(q || status || pay || plan);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Subscriptions</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Stripe memberships are created when a parent checks out. Add a Venmo membership here when they pay outside Stripe. Canceling Venmo stops it in this app only.
      </p>
      <AdminError message={params.error} />
      <form action={createVenmoMembership} className="mt-4 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <h2 className="font-display text-2xl uppercase sm:col-span-2">Add a Venmo subscription</h2>
        <div>
          <Label htmlFor="parentName">Parent name</Label>
          <Input className="mt-1" id="parentName" name="parentName" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input className="mt-1" id="email" name="email" type="email" required autoComplete="off" />
        </div>
        <div>
          <Label htmlFor="phone">Phone</Label>
          <Input className="mt-1" id="phone" name="phone" type="tel" required autoComplete="tel" />
        </div>
        <div>
          <Label htmlFor="playerName">Player name</Label>
          <Input className="mt-1" id="playerName" name="playerName" required />
        </div>
        <div>
          <Label htmlFor="planId">Plan</Label>
          <select id="planId" name="planId" required className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3" defaultValue="">
            <option value="" disabled>Choose</option>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {formatMoney(item.priceCents)} · {item.sessionsPerMonth}/mo
              </option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input className="mt-1" id="price" name="price" required placeholder="80" />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="note">Note</Label>
          <Input className="mt-1" id="note" name="note" placeholder="Optional" />
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Add Venmo subscription</Button>
        </div>
      </form>
      <form className="mt-4 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="q">Search</Label>
          <Input className="mt-1" id="q" name="q" defaultValue={q} placeholder="Parent, player, or email" />
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue={status} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="">All statuses</option>
            {STATUSES.map((item) => (
              <option key={item} value={item}>{STATUS_LABEL[item]}</option>
            ))}
          </select>
        </div>
        <div>
          <Label htmlFor="pay">How they pay</Label>
          <select id="pay" name="pay" defaultValue={pay} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="">Stripe and Venmo</option>
            <option value="STRIPE">Stripe</option>
            <option value="VENMO">Venmo</option>
          </select>
        </div>
        <div>
          <Label htmlFor="plan">Plan</Label>
          <select id="plan" name="plan" defaultValue={planIds.has(plan) || plan === "none" ? plan : ""} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="">All plans</option>
            {plans.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            <option value="none">No plan on file</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <Button type="submit">Apply filters</Button>
          {filtering ? <Link href="/admin/subscriptions" className="text-sm font-semibold text-primary">Clear</Link> : null}
        </div>
      </form>
      <ul className="mt-4 space-y-2">
        {subs.length === 0 ? (
          <li className="text-sm text-muted-foreground">{filtering ? "No subscriptions match these filters." : "No subscriptions yet."}</li>
        ) : null}
        {subs.map((sub) => (
          <li key={sub.id}>
            <Link href={`/admin/subscriptions/${sub.id}`} className="block rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{sub.playerName}</p>
                  <p className="text-sm text-muted-foreground">{sub.parentName} · {sub.email}</p>
                  <p className="text-sm text-muted-foreground">{subscriptionPlanName(sub)} · {sub.paymentMethod === "VENMO" ? "Venmo" : "Stripe"}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{STATUS_LABEL[sub.status]}</p>
                  <p>{formatMoney(sub.priceCents)}</p>
                  <p>{sub.sessionsUsed}/{sub.sessionsIncluded} used</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
