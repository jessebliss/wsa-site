-- A session belongs to one type. Parents choose that type, then a session.

CREATE TABLE "training_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "nextStep" TEXT NOT NULL DEFAULT 'Choose a coach',
    "offeringKey" TEXT,
    "colorProgram" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "training_types_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "training_types_name_key" ON "training_types"("name");
CREATE UNIQUE INDEX "training_types_offeringKey_key" ON "training_types"("offeringKey");

ALTER TABLE "event_series" ADD COLUMN "typeId" TEXT;
ALTER TABLE "sessions" ADD COLUMN "typeId" TEXT;

ALTER TABLE "event_series" ADD CONSTRAINT "event_series_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "training_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "training_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

UPDATE "sessions"
SET "description" = replace("description", 'monthly plan', 'monthly session')
WHERE "description" LIKE '%monthly plan%';
