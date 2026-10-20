-- Repeating events, coaches on a group session, and unscheduled intro checkout.

CREATE TYPE "RepeatKind" AS ENUM ('NONE', 'DAILY', 'EVERY_N_DAYS', 'WEEKLY', 'EVERY_N_WEEKS', 'MONTHLY_DATE', 'MONTHLY_WEEKDAY', 'YEARLY');

CREATE TYPE "SeriesEnd" AS ENUM ('NEVER', 'ON', 'AFTER');

CREATE TABLE "event_series" (
    "id" TEXT NOT NULL,
    "repeatKind" "RepeatKind" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "weekdays" INTEGER[] DEFAULT ARRAY[]::INTEGER[],
    "monthOrdinal" INTEGER,
    "monthWeekday" INTEGER,
    "ends" "SeriesEnd" NOT NULL DEFAULT 'NEVER',
    "untilDay" TEXT,
    "occurrenceCount" INTEGER,
    "anchorDay" TEXT NOT NULL,
    "skippedDays" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "kind" "SessionKind" NOT NULL,
    "program" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "coach" TEXT,
    "coaches" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "description" TEXT,
    "location" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_series_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "sessions" ADD COLUMN "coaches" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "sessions" ADD COLUMN "seriesId" TEXT;
ALTER TABLE "sessions" ADD COLUMN "seriesException" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "sessions" ADD COLUMN "occurrenceDay" TEXT;

UPDATE "sessions"
SET "coaches" = ARRAY["coach"]
WHERE "kind" = 'GROUP' AND "coach" IS NOT NULL AND cardinality("coaches") = 0;

CREATE UNIQUE INDEX "sessions_seriesId_occurrenceDay_key" ON "sessions"("seriesId", "occurrenceDay");
CREATE INDEX "sessions_seriesId_idx" ON "sessions"("seriesId");

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "event_series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "registrations" ADD COLUMN "product" TEXT;

ALTER TABLE "registrations" DROP CONSTRAINT "registrations_sessionId_fkey";
ALTER TABLE "registrations" ALTER COLUMN "sessionId" DROP NOT NULL;
ALTER TABLE "registrations" ADD CONSTRAINT "registrations_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
