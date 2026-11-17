-- Remember which invoices are subscription checkouts.
-- Older one-time charges stay unmarked.

ALTER TABLE "invoices" ADD COLUMN "subscription" BOOLEAN NOT NULL DEFAULT false;

UPDATE "invoices" AS invoice
SET "subscription" = true
WHERE invoice.source = 'checkout'
  AND invoice."sessionId" IS NULL
  AND (
    invoice.activity = 'Membership'
    OR EXISTS (
      SELECT 1 FROM "plans" AS plan WHERE plan.name = invoice.activity
    )
  );
