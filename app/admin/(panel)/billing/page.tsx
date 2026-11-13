import Link from "next/link";
import { markInvoicePaid, saveInvoiceSequence } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { InvoiceForm, type InvoiceActivity } from "@/components/invoice-form";
import { VenmoPayQr } from "@/components/venmo-pay-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { bpsToPercentInput } from "@/lib/fees";
import { loadCheckoutFees } from "@/lib/fees-data";
import { readNextInvoiceNumber } from "@/lib/invoices";
import { centsToDollarInput, formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { subscriptionPlanName } from "@/lib/subscription-admin";
import { formatEt } from "@/lib/time";
import { Prisma, type SubscriptionStatus } from "@prisma/client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Billing" };

const STATUSES: SubscriptionStatus[] = ["ACTIVE", "CANCELED", "PAST_DUE", "PAUSED", "INCOMPLETE"];

const STATUS_LABEL: Record<SubscriptionStatus, string> = {
  ACTIVE: "Active",
  CANCELED: "Canceled",
  PAST_DUE: "Past due",
  PAUSED: "Paused",
  INCOMPLETE: "Incomplete",
};

function payLabel(method: string) {
  if (method === "VENMO") return "Venmo";
  if (method === "ZELLE") return "Zelle";
  return "Stripe";
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    sent?: string;
    saved?: string;
    id?: string;
    q?: string;
    status?: string;
    plan?: string;
  }>;
}) {
  const params = await searchParams;
  const q = (params.q ?? "").trim();
  const status = STATUSES.includes(params.status as SubscriptionStatus) ? (params.status as SubscriptionStatus) : "";
  const plan = params.plan ?? "";
  const where: Prisma.SubscriptionWhereInput = { paymentMethod: "STRIPE" };
  if (status) where.status = status;
  const plansForFilter = await prisma.plan.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] });
  const planIds = new Set(plansForFilter.map((item) => item.id));
  if (plan === "none") where.planId = null;
  else if (plan && planIds.has(plan)) where.planId = plan;
  if (q) {
    where.OR = [
      { parentName: { contains: q, mode: "insensitive" } },
      { playerName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
    ];
  }

  const [invoices, nextNumber, fees, types, sessions, linked, subs] = await Promise.all([
    prisma.invoice.findMany({ orderBy: { number: "desc" } }),
    readNextInvoiceNumber(),
    loadCheckoutFees(),
    prisma.trainingType.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
    prisma.trainingSession.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { startsAt: "asc" },
      take: 200,
    }),
    params.id ? prisma.invoice.findUnique({ where: { id: params.id } }) : Promise.resolve(null),
    prisma.subscription.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { plan: true },
    }),
  ]);

  const activities: InvoiceActivity[] = [
    ...types.map((type) => ({ value: `type:${type.id}`, label: type.name, group: "Trainings", amountCents: null })),
    ...plansForFilter.map((item) => ({ value: `plan:${item.id}`, label: item.name, group: "Plans", amountCents: item.priceCents })),
    ...sessions.map((session) => ({
      value: `session:${session.id}`,
      label: `${session.title} · ${formatEt(session.startsAt, { month: "short", day: "numeric" })}`,
      group: "Sessions",
      amountCents: session.priceCents,
    })),
  ];
  const filtering = Boolean(q || status || plan);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Billing</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Invoices are numbered in one sequence. Stripe memberships stay on this page.
      </p>
      <AdminError message={params.error} />
      {params.sent === "1" ? <p className="mt-3 text-sm font-semibold text-primary">Invoice sent. The customer has the Stripe checkout link.</p> : null}
      {params.sent === "venmo" ? (
        <p className="mt-3 text-sm font-semibold text-primary">
          {linked?.venmoHandle
            ? "Invoice saved as unpaid. The Venmo code is on that invoice."
            : "Invoice saved as unpaid."}
        </p>
      ) : null}
      {params.sent === "zelle" ? <p className="mt-3 text-sm font-semibold text-primary">Invoice saved as unpaid.</p> : null}
      {params.sent === "link" && linked?.checkoutUrl ? (
        <p className="mt-3 text-sm">
          Stripe checkout is ready. Email is not configured, so copy this link to the customer.{" "}
          <a className="font-semibold text-primary" href={linked.checkoutUrl}>{linked.checkoutUrl}</a>
        </p>
      ) : null}
      {params.saved === "next" ? <p className="mt-3 text-sm font-semibold text-primary">Next invoice number saved.</p> : null}
      {params.saved === "paid" ? <p className="mt-3 text-sm font-semibold text-primary">Marked paid.</p> : null}

      <h2 className="mt-8 font-display text-3xl uppercase">Invoices</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Stripe sends a one-time checkout. Venmo and Zelle are saved unpaid until you mark them paid.
      </p>
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
          <li key={invoice.id} className="grid gap-1 rounded-xl bg-white p-3 sm:grid-cols-6 sm:items-start sm:gap-3">
            <p className="font-semibold">{invoice.number}</p>
            <p>
              {invoice.customerName}
              <span className="block text-sm text-muted-foreground">{invoice.email}</span>
            </p>
            <p>{invoice.activity}</p>
            <p>{formatMoney(invoice.totalCents)}</p>
            <div>
              <p>{payLabel(invoice.paymentMethod)}</p>
              {invoice.zelleRecipient ? <p className="text-sm text-muted-foreground">{invoice.zelleRecipient}</p> : null}
              {invoice.venmoHandle ? <p className="text-sm text-muted-foreground">@{invoice.venmoHandle.replace(/^@+/, "")}</p> : null}
            </div>
            <div>
              <p>{invoice.status === "PAID" ? "Paid" : "Unpaid"}</p>
              {invoice.paymentMethod !== "STRIPE" && invoice.status === "OPEN" ? (
                <form action={markInvoicePaid} className="mt-2">
                  <input type="hidden" name="id" value={invoice.id} />
                  <Button type="submit" variant="outline" size="sm">Mark paid</Button>
                </form>
              ) : null}
              {invoice.paymentMethod === "STRIPE" && invoice.status === "OPEN" && invoice.checkoutUrl ? (
                <a className="mt-1 block text-sm font-semibold text-primary" href={invoice.checkoutUrl}>Payment link</a>
              ) : null}
              {invoice.paymentMethod === "VENMO" && invoice.venmoHandle && invoice.status === "OPEN" ? (
                <VenmoPayQr handle={invoice.venmoHandle} totalCents={invoice.totalCents} number={invoice.number} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <h2 className="mt-10 font-display text-3xl uppercase">Subscriptions</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Card memberships start when a parent checks out with Stripe. Venmo and Zelle are one-time invoices.
      </p>
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
          <Label htmlFor="plan">Plan</Label>
          <select id="plan" name="plan" defaultValue={planIds.has(plan) || plan === "none" ? plan : ""} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="">All plans</option>
            {plansForFilter.map((item) => (
              <option key={item.id} value={item.id}>{item.name}</option>
            ))}
            <option value="none">No plan on file</option>
          </select>
        </div>
        <div className="flex items-end gap-3">
          <Button type="submit">Apply filters</Button>
          {filtering ? <Link href="/admin/billing" className="text-sm font-semibold text-primary">Clear</Link> : null}
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
                  <p className="text-sm text-muted-foreground">{subscriptionPlanName(sub)} · Stripe</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{STATUS_LABEL[sub.status]}</p>
                  <p>{formatMoney(sub.priceCents)}</p>
                  <p>{sub.sessionsIncluded <= 0 ? "Unlimited" : `${sub.sessionsUsed}/${sub.sessionsIncluded} used`}</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
