-- Plan delete can keep canceled membership history. Venmo memberships are local. Deleted coaches lose their admin QR.

CREATE TYPE "PaymentMethod" AS ENUM ('STRIPE', 'VENMO');

ALTER TABLE "subscriptions" ADD COLUMN "planName" TEXT NOT NULL DEFAULT '';
ALTER TABLE "subscriptions" ADD COLUMN "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'STRIPE';
ALTER TABLE "subscriptions" ADD COLUMN "note" TEXT;

UPDATE "subscriptions" AS s
SET "planName" = p."name"
FROM "plans" AS p
WHERE s."planId" = p."id";

ALTER TABLE "subscriptions" DROP CONSTRAINT "subscriptions_planId_fkey";
ALTER TABLE "subscriptions" ALTER COLUMN "planId" DROP NOT NULL;
ALTER TABLE "subscriptions" ADD CONSTRAINT "subscriptions_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "retired_coaches" (
    "id" TEXT NOT NULL,
    "coachName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "retired_coaches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "retired_coaches_coachName_key" ON "retired_coaches"("coachName");
