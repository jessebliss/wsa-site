-- Coach logins and per-day availability. The academy admin stays in env credentials.

CREATE TABLE "staff_users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "coachName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "staff_users_email_key" ON "staff_users"("email");
CREATE UNIQUE INDEX "staff_users_coachName_key" ON "staff_users"("coachName");

CREATE TABLE "coach_days" (
    "id" TEXT NOT NULL,
    "staffUserId" TEXT NOT NULL,
    "dayKey" TEXT NOT NULL,
    "unavailable" BOOLEAN NOT NULL DEFAULT false,
    "hours" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coach_days_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "coach_days_staffUserId_dayKey_key" ON "coach_days"("staffUserId", "dayKey");
CREATE INDEX "coach_days_dayKey_idx" ON "coach_days"("dayKey");

ALTER TABLE "coach_days" ADD CONSTRAINT "coach_days_staffUserId_fkey" FOREIGN KEY ("staffUserId") REFERENCES "staff_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
