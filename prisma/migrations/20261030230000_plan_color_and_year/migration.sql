-- A plan is monthly or yearly, and its program uses one of twelve colors on the calendars.

CREATE TYPE "BillingInterval" AS ENUM ('MONTH', 'YEAR');

ALTER TABLE "plans" ADD COLUMN "billingInterval" "BillingInterval" NOT NULL DEFAULT 'MONTH';
ALTER TABLE "plans" ADD COLUMN "color" TEXT NOT NULL DEFAULT 'red';

UPDATE "plans" SET "color" = 'blue' WHERE "program" = 'Quarterback Training';
UPDATE "plans" SET "color" = 'teal' WHERE "program" = 'Speed & Agility';
UPDATE "plans" SET "color" = 'pink' WHERE "program" = 'Girls Flag';
