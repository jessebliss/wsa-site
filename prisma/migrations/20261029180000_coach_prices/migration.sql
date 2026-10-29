-- Public prices an admin sets for a coach. Null means parents still see the existing session price.

CREATE TABLE "coach_prices" (
    "coachName" TEXT NOT NULL,
    "privateQuarterbackCents" INTEGER,
    "speedCents" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_prices_pkey" PRIMARY KEY ("coachName")
);
