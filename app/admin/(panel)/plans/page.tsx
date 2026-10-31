import { deletePlan, savePlan } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { ColorSwatches } from "@/components/color-swatches";
import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput, formatMoney } from "@/lib/money";
import { eventColor, planCadence } from "@/lib/plan-options";
import { prisma } from "@/lib/prisma";

function BillingChoice({ yearly }: { yearly: boolean }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-semibold">Billing</legend>
      <div className="mt-2 flex flex-wrap gap-2">
        <label className="flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold">
          <input type="radio" name="billingInterval" value="MONTH" defaultChecked={!yearly} />
          Monthly
        </label>
        <label className="flex min-h-11 items-center gap-2 rounded-full border border-border px-3 text-sm font-semibold">
          <input type="radio" name="billingInterval" value="YEAR" defaultChecked={yearly} data-yearly="yes" />
          Yearly
        </label>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">Yearly is one charge per year.</p>
    </fieldset>
  );
}

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
        Monthly or yearly. Yearly bills once a year. A price change applies to new signups. People already on a plan keep their price and included sessions until you change that membership.
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
          <Label htmlFor="sessionsPerMonth">Sessions included</Label>
          <Input className="mt-1" id="sessionsPerMonth" name="sessionsPerMonth" type="number" min={1} required />
        </div>
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input className="mt-1" id="price" name="price" required />
        </div>
        <BillingChoice yearly={false} />
        <ColorSwatches value="red" />
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
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <i className="h-3 w-3 rounded-sm" style={{ backgroundColor: eventColor(plan.color).hex }} aria-hidden="true" />
              {plan.active ? "Active" : "Hidden"} · {formatMoney(plan.priceCents)} {planCadence(plan.billingInterval)} · {plan.sessionsPerMonth} sessions
            </p>
            <form action={savePlan} className="mt-3 grid gap-3 sm:grid-cols-2">
              <input type="hidden" name="id" value={plan.id} />
              <input type="hidden" name="sortOrder" value={plan.sortOrder} />
              <Input name="name" defaultValue={plan.name} required aria-label="Name" />
              <Input name="program" defaultValue={plan.program} required aria-label="Program" />
              <Input name="sessionsPerMonth" type="number" min={1} defaultValue={plan.sessionsPerMonth} required aria-label="Sessions included" />
              <Input name="price" defaultValue={centsToDollarInput(plan.priceCents)} required aria-label="Price" />
              <BillingChoice yearly={plan.billingInterval === "YEAR"} />
              <ColorSwatches value={plan.color} />
              <label className="flex items-center gap-2 text-sm font-semibold">
                <input type="checkbox" name="active" defaultChecked={plan.active} /> Active
              </label>
              <Button type="submit" variant="outline">Save plan</Button>
            </form>
            <ConfirmForm
              action={deletePlan}
              className="mt-3"
              message="Delete this plan so it is no longer offered? Memberships that are not canceled will block this. People are not canceled automatically."
            >
              <input type="hidden" name="id" value={plan.id} />
              <Button type="submit" variant="outline">Delete plan</Button>
            </ConfirmForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
