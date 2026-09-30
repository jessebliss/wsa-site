import { savePlan } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plans" };

export default async function PlansAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const plans = await prisma.plan.findMany({ orderBy: { sortOrder: "asc" } });
  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Plans and prices</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Catalog changes apply to new checkouts. People already subscribed keep their price and session count until you edit that subscription. Session drop-in prices are set on each session.
      </p>
      <AdminError message={params.error} />
      <form action={savePlan} className="mt-4 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input className="mt-1" id="name" name="name" required />
        </div>
        <div>
          <Label htmlFor="program">Program</Label>
          <Input className="mt-1" id="program" name="program" required placeholder="Speed & Agility" />
        </div>
        <div>
          <Label htmlFor="sessionsPerMonth">Sessions per month</Label>
          <Input className="mt-1" id="sessionsPerMonth" name="sessionsPerMonth" type="number" min={1} required />
        </div>
        <div>
          <Label htmlFor="price">Monthly price (USD)</Label>
          <Input className="mt-1" id="price" name="price" required />
        </div>
        <label className="flex items-center gap-2 text-sm font-semibold">
          <input type="checkbox" name="active" defaultChecked /> Active
        </label>
        <div className="sm:col-span-2">
          <Button type="submit">Add plan</Button>
        </div>
      </form>
      <ul className="mt-6 space-y-4">
        {plans.map((plan) => (
          <li key={plan.id} className="rounded-2xl bg-white p-4">
            <p className="text-sm text-muted-foreground">{plan.active ? "Active" : "Hidden"} · {formatMoney(plan.priceCents)} · {plan.sessionsPerMonth} sessions</p>
            <form action={savePlan} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="sortOrder" value={plan.sortOrder} />
              <Input name="name" defaultValue={plan.name} required aria-label="Name" />
              <Input name="program" defaultValue={plan.program} required aria-label="Program" />
              <Input name="sessionsPerMonth" type="number" min={1} defaultValue={plan.sessionsPerMonth} required aria-label="Sessions per month" />
              <Input name="price" defaultValue={centsToDollarInput(plan.priceCents)} required aria-label="Price" />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="active" defaultChecked={plan.active} /> Active
              </label>
              <Button type="submit" variant="outline">Save plan</Button>
            </form>
          </li>
        ))}
      </ul>
    </div>
  );
}
