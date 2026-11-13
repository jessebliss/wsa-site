-- Academy invoice numbers start at 1000 and are never reused.

CREATE TYPE "InvoicePayMethod" AS ENUM ('STRIPE', 'VENMO');
CREATE TYPE "InvoiceStatus" AS ENUM ('OPEN', 'PAID');

CREATE TABLE "invoice_sequences" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "nextNumber" INTEGER NOT NULL DEFAULT 1000,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoice_sequences_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "customerName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "playerName" TEXT NOT NULL,
    "activity" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "registrationFixedCents" INTEGER NOT NULL DEFAULT 0,
    "registrationBps" INTEGER NOT NULL DEFAULT 0,
    "taxFixedCents" INTEGER NOT NULL DEFAULT 0,
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "registrationCents" INTEGER NOT NULL DEFAULT 0,
    "taxCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "paymentMethod" "InvoicePayMethod" NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'OPEN',
    "source" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT,
    "checkoutUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invoices_number_key" ON "invoices"("number");
CREATE UNIQUE INDEX "invoices_stripeCheckoutSessionId_key" ON "invoices"("stripeCheckoutSessionId");
CREATE INDEX "invoices_createdAt_idx" ON "invoices"("createdAt");
