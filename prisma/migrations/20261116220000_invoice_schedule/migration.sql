-- New invoices can remember the booked day, coach, and program.
-- Older rows stay blank when those were not collected.

CREATE TYPE "InvoiceReview" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'PROPOSED');

ALTER TABLE "invoices" ADD COLUMN "program" TEXT;
ALTER TABLE "invoices" ADD COLUMN "coachName" TEXT;
ALTER TABLE "invoices" ADD COLUMN "bookedDay" TEXT;
ALTER TABLE "invoices" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "registrationId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "reviewStatus" "InvoiceReview";
ALTER TABLE "invoices" ADD COLUMN "proposedSessionId" TEXT;
ALTER TABLE "invoices" ADD COLUMN "proposedDay" TEXT;
ALTER TABLE "invoices" ADD COLUMN "proposedTime" TEXT;

CREATE UNIQUE INDEX "invoices_registrationId_key" ON "invoices"("registrationId");
CREATE INDEX "invoices_sessionId_idx" ON "invoices"("sessionId");

ALTER TABLE "invoices" ADD CONSTRAINT "invoices_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_proposedSessionId_fkey" FOREIGN KEY ("proposedSessionId") REFERENCES "sessions"("id") ON DELETE SET NULL ON UPDATE CASCADE;
