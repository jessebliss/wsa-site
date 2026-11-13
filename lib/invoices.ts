import { Prisma } from "@prisma/client";
import type Stripe from "stripe";
import { chargeLines, type FeeSettings } from "@/lib/fees";
import { INTRO_LABEL } from "@/lib/intro";
import { prisma } from "@/lib/prisma";

type Tx = Prisma.TransactionClient;

export async function readNextInvoiceNumber() {
  const row = await prisma.invoiceSequence.findUnique({ where: { id: "site" } });
  return row?.nextNumber ?? 1000;
}

export async function setNextInvoiceNumber(next: number) {
  if (!Number.isInteger(next) || next < 1) throw new Error("Enter a whole number for the next invoice.");
  const highest = await prisma.invoice.aggregate({ _max: { number: true } });
  const floor = (highest._max.number ?? 0) + 1;
  if (next < floor) {
    throw new Error(`Next invoice number has to be ${floor} or higher. Issued numbers are not reused.`);
  }
  await prisma.invoiceSequence.upsert({
    where: { id: "site" },
    create: { id: "site", nextNumber: next },
    update: { nextNumber: next },
  });
}

async function allocateInvoiceNumber(tx: Tx) {
  await tx.$executeRaw`
    INSERT INTO "invoice_sequences" ("id", "nextNumber", "updatedAt")
    VALUES ('site', 1000, CURRENT_TIMESTAMP)
    ON CONFLICT ("id") DO NOTHING
  `;
  const rows = await tx.$queryRaw<{ nextNumber: number }[]>`
    UPDATE "invoice_sequences"
    SET "nextNumber" = "nextNumber" + 1, "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = 'site'
    RETURNING "nextNumber"
  `;
  const next = rows[0]?.nextNumber;
  if (next == null) throw new Error("Could not assign an invoice number.");
  return next - 1;
}

export async function resolveInvoiceActivity(value: string) {
  if (value === "misc") return "Miscellaneous";
  if (value.startsWith("type:")) {
    const type = await prisma.trainingType.findUnique({ where: { id: value.slice(5) } });
    if (!type) throw new Error("Choose an activity.");
    return type.name;
  }
  if (value.startsWith("plan:")) {
    const plan = await prisma.plan.findUnique({ where: { id: value.slice(5) } });
    if (!plan) throw new Error("Choose an activity.");
    return plan.name;
  }
  if (value.startsWith("session:")) {
    const session = await prisma.trainingSession.findUnique({ where: { id: value.slice(8) } });
    if (!session) throw new Error("Choose an activity.");
    return session.title;
  }
  throw new Error("Choose an activity.");
}

export function invoiceCharge(amountCents: number, fees: FeeSettings) {
  return chargeLines(amountCents, fees);
}

type InvoiceWrite = {
  customerName: string;
  email: string;
  phone: string;
  playerName: string;
  activity: string;
  amountCents: number;
  fees: FeeSettings;
  registrationCents: number;
  taxCents: number;
  totalCents: number;
  paymentMethod: "STRIPE" | "VENMO";
  status: "OPEN" | "PAID";
  source: string;
  stripeCheckoutSessionId?: string | null;
  checkoutUrl?: string | null;
  paidAt?: Date | null;
};

async function insertInvoice(tx: Tx, input: InvoiceWrite) {
  const number = await allocateInvoiceNumber(tx);
  return tx.invoice.create({
    data: {
      number,
      customerName: input.customerName,
      email: input.email,
      phone: input.phone,
      playerName: input.playerName,
      activity: input.activity,
      amountCents: input.amountCents,
      registrationFixedCents: input.fees.registrationFixedCents,
      registrationBps: input.fees.registrationBps,
      taxFixedCents: input.fees.taxFixedCents,
      taxBps: input.fees.taxBps,
      registrationCents: input.registrationCents,
      taxCents: input.taxCents,
      totalCents: input.totalCents,
      paymentMethod: input.paymentMethod,
      status: input.status,
      source: input.source,
      stripeCheckoutSessionId: input.stripeCheckoutSessionId ?? null,
      checkoutUrl: input.checkoutUrl ?? null,
      paidAt: input.paidAt ?? null,
    },
  });
}

export async function saveAdminInvoice(input: InvoiceWrite) {
  return prisma.$transaction((tx) => insertInvoice(tx, input));
}

export async function markVenmoInvoicePaid(id: string) {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) throw new Error("That invoice is already gone.");
  if (invoice.paymentMethod !== "VENMO") {
    throw new Error("Stripe invoices are marked paid when Stripe confirms the payment.");
  }
  if (invoice.status === "PAID") return invoice;
  return prisma.invoice.update({
    where: { id },
    data: { status: "PAID", paidAt: new Date() },
  });
}

function checkoutIsPaid(session: Stripe.Checkout.Session) {
  return session.payment_status === "paid";
}

async function detailsFromCheckout(session: Stripe.Checkout.Session): Promise<InvoiceWrite | null> {
  const registrationId = session.metadata?.registrationId ?? session.client_reference_id;
  if (registrationId && session.metadata?.kind !== "admin-invoice") {
    const registration = await prisma.registration.findUnique({
      where: { id: registrationId },
      include: { session: true },
    });
    if (registration) {
      const total = session.amount_total ?? registration.amountCents;
      const activity =
        registration.session?.title ??
        (registration.product === "intro" ? INTRO_LABEL : registration.product || "Session");
      return {
        customerName: registration.parentName,
        email: registration.email,
        phone: registration.phone,
        playerName: registration.playerName,
        activity,
        amountCents: Math.max(0, total - registration.registrationCents - registration.taxCents),
        fees: { registrationFixedCents: 0, registrationBps: 0, taxFixedCents: 0, taxBps: 0 },
        registrationCents: registration.registrationCents,
        taxCents: registration.taxCents,
        totalCents: total,
        paymentMethod: "STRIPE",
        status: "PAID",
        source: "checkout",
        stripeCheckoutSessionId: session.id,
        paidAt: new Date(),
      };
    }
  }

  if (session.mode !== "subscription") return null;
  const meta = session.metadata ?? {};
  const email = (meta.email || session.customer_email || session.customer_details?.email || "").trim().toLowerCase();
  if (!email) return null;
  const plan = meta.planId ? await prisma.plan.findUnique({ where: { id: meta.planId } }) : null;
  const total = session.amount_total ?? plan?.priceCents ?? 0;
  const name = (meta.parentName || session.customer_details?.name || email).trim();
  return {
    customerName: name,
    email,
    phone: meta.phone || "",
    playerName: meta.playerName || "",
    activity: plan?.name || "Membership",
    amountCents: total,
    fees: { registrationFixedCents: 0, registrationBps: 0, taxFixedCents: 0, taxBps: 0 },
    registrationCents: 0,
    taxCents: 0,
    totalCents: total,
    paymentMethod: "STRIPE",
    status: "PAID",
    source: "checkout",
    stripeCheckoutSessionId: session.id,
    paidAt: new Date(),
  };
}

/** A paid Stripe Checkout becomes one invoice. An admin checkout is marked paid instead of duplicated. */
export async function ensurePaidCheckoutInvoice(session: Stripe.Checkout.Session) {
  if (!checkoutIsPaid(session) || !session.id) return;
  const existing = await prisma.invoice.findUnique({ where: { stripeCheckoutSessionId: session.id } });
  if (existing) {
    if (existing.status !== "PAID") {
      await prisma.invoice.update({
        where: { id: existing.id },
        data: {
          status: "PAID",
          paidAt: new Date(),
          totalCents: session.amount_total ?? existing.totalCents,
        },
      });
    }
    return;
  }
  const details = await detailsFromCheckout(session);
  if (!details) return;
  try {
    await prisma.$transaction((tx) => insertInvoice(tx, details));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return;
    throw error;
  }
}
