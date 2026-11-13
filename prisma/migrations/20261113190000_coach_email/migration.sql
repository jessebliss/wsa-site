-- An address saved on the coach, separate from a staff login.

CREATE TABLE "coach_profiles" (
    "coachName" TEXT NOT NULL,
    "email" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coach_profiles_pkey" PRIMARY KEY ("coachName")
);
