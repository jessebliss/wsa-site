-- Girls flag prices are per coach and per role. Null hides that coach under that role.

ALTER TABLE "coach_prices" ADD COLUMN "flagQuarterbackCents" INTEGER;
ALTER TABLE "coach_prices" ADD COLUMN "flagAthleteCents" INTEGER;
