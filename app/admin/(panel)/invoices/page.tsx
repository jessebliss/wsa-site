import { markInvoicePaid, saveInvoiceSequence } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { InvoiceForm, type InvoiceActivity } from "@/components/invoice-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bpsToPercentInput } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { readNextInvoiceNumber } from "@/lib/invoices";
import { centsToDollarInput, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatEt } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Invoices" };

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string; saved?: string; id?: string }>;
}) {
  const params = await searchParams;
  const [invoices, nextNumber, fees, types, plans, sessions, linked] = await Promise.all([
    prisma.invoice.findMany({ orderBy: { number: "desc" } }),
    readNextInvoiceNumber(),
    loadCheckoutFees(),
    prisma.trainingType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.trainingSession.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    params.id ? prisma.invoice.findUnique({ where: { id: params.id } }) : Promise.resolve(null),
  ]);

  const activities: InvoiceActivity[] = [
    ...types.map((type) => ({ value: `type:${type.id}`, label: type.name, group: "Trainings", amountCents: null })),
    ...plans.map((plan) => ({ value: `plan:${plan.id}`, label: plan.name, group: "Plans", amountCents: plan.priceCents })),
    ...sessions.map((session) => ({
      value: `session:${session.id}`,
      label: `${session.title} · ${formatEt(session.startsAt, { month: "short", day: "numeric" })}`,
      group: "Sessions",
      amountCents: session.priceCents,
    })),
  ];

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Invoices</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Send a one-time Stripe checkout, or record a Venmo request. Stripe marks itself paid. Venmo stays open until you mark it paid.
      </p>
      <AdminError message={params.error} />
      {params.sent === "1" ? <p className="mt-3 text-sm font-semibold text-primary">Invoice sent. The customer has the Stripe checkout link.</p> : null}
      {params.sent === "venmo" ? <p className="mt-3 text-sm font-semibold text-primary">Invoice recorded. It stays open until you mark it paid.</p> : null}
      {params.sent === "link" && linked?.checkoutUrl ? (
        <p className="mt-3 text-sm">
          Stripe checkout is ready. Email is not configured, so copy this link to the customer.{" "}
          <a className="font-semibold text-primary" href={linked.checkoutUrl}>{linked.checkoutUrl}</a>
        </p>
      ) : null}
      {params.saved === "next" ? <p className="mt-3 text-sm font-semibold text-primary">Next invoice number saved.</p> : null}
      {params.saved === "paid" ? <p className="mt-3 text-sm font-semibold text-primary">Marked paid.</p> : null}

      <InvoiceForm
        activities={activities}
        fees={{
          registrationFixed: centsToDollarInput(fees.registrationFixedCents),
          registrationPercent: bpsToPercentInput(fees.registrationBps),
          taxFixed: centsToDollarInput(fees.taxFixedCents),
          taxPercent: bpsToPercentInput(fees.taxBps),
        }}
      />

      <form action={saveInvoiceSequence} className="mt-6 flex flex-wrap items-end gap-3 rounded-2xl bg-white p-4">
        <div>
          <Label htmlFor="nextNumber">Next invoice number</Label>
          <Input className="mt-1 w-32" id="nextNumber" name="nextNumber" inputMode="numeric" defaultValue={String(nextNumber)} required />
        </div>
        <Button type="submit" variant="outline">Save next number</Button>
        <p className="w-full text-sm text-muted-foreground">The next invoice uses this number, then the one after it. Issued numbers stay put.</p>
      </form>

      <div className="mt-6 hidden grid-cols-6 gap-3 px-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground sm:grid">
        <span>Number</span>
        <span>Customer</span>
        <span>Activity</span>
        <span>Total</span>
        <span>Paid with</span>
        <span>Status</span>
      </div>
      <ul className="mt-2 space-y-2">
        {invoices.length === 0 ? <li className="text-sm text-muted-foreground">No invoices yet.</li> : null}
        {invoices.map((invoice) => (
          <li key={invoice.id} className="grid gap-1 rounded-xl bg-white p-3 sm:grid-cols-6 sm:items-center sm:gap-3">
            <p className="font-semibold">{invoice.number}</p>
            <p>
              {invoice.customerName}
              <span className="block text-sm text-muted-foreground">{invoice.email}</span>
            </p>
            <p>{invoice.activity}</p>
            <p>{formatMoney(invoice.totalCents)}</p>
            <p>{invoice.paymentMethod === "STRIPE" ? "Stripe" : "Venmo"}</p>
            <div>
              <p>{invoice.status === "PAID" ? "Paid" : "Open"}</p>
              {invoice.paymentMethod === "VENMO" && invoice.status === "OPEN" ? (
                <form action={markInvoicePaid} className="mt-2">
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="outline" size="sm">Mark paid</Button>
                </form>
              ) : null}
              {invoice.paymentMethod === "STRIPE" && invoice.status === "OPEN" && invoice.checkoutUrl ? (
                <a className="mt-1 block text-sm font-semibold text-primary" href={invoice.checkoutUrl}>Payment link</a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
