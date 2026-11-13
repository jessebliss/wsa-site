-- Venmo and Zelle invoices are recorded unpaid. Stripe stays a Checkout payment.

ALTER TYPE "InvoicePayMethod" ADD VALUE 'ZELLE';

ALTER TABLE "invoices" ADD COLUMN "venmoHandle" TEXT;
ALTER TABLE "invoices" ADD COLUMN "zelleRecipient" TEXT;
