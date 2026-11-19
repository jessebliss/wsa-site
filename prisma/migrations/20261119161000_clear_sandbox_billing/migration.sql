-- Sandbox invoices and subscriptions are test data.
-- Coaches, plans, sessions, fees, and calendar events stay.
-- This runs once. Live billing starts at invoice 1000.

DO $$
DECLARE
  invoice_count integer;
  subscription_count integer;
BEGIN
  SELECT count(*) INTO invoice_count FROM "invoices";
  SELECT count(*) INTO subscription_count FROM "subscriptions";
  RAISE NOTICE 'sandbox_billing_removed invoices=% subscriptions=%', invoice_count, subscription_count;

  DELETE FROM "invoices";
  DELETE FROM "subscriptions";

  INSERT INTO "invoice_sequences" ("id", "nextNumber", "updatedAt")
  VALUES ('site', 1000, CURRENT_TIMESTAMP)
  ON CONFLICT ("id") DO UPDATE
  SET "nextNumber" = 1000, "updatedAt" = CURRENT_TIMESTAMP;
END $$;
