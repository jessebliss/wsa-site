-- Fixed and percent registration and tax on one-time checkout.

ALTER TABLE "registrations" ADD COLUMN "registrationCents" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "registrations" ADD COLUMN "taxCents" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "checkout_fees" (
    "id" TEXT NOT NULL DEFAULT 'site',
    "registrationFixedCents" INTEGER NOT NULL DEFAULT 0,
    "registrationBps" INTEGER NOT NULL DEFAULT 0,
    "taxFixedCents" INTEGER NOT NULL DEFAULT 0,
    "taxBps" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "checkout_fees_pkey" PRIMARY KEY ("id")
);
