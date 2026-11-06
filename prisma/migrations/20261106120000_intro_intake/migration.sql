-- The introduction checkout records school, grade, social, and the coach the parent chose.

ALTER TABLE "registrations" ADD COLUMN "school" TEXT;
ALTER TABLE "registrations" ADD COLUMN "grade" TEXT;
ALTER TABLE "registrations" ADD COLUMN "social" TEXT;
ALTER TABLE "registrations" ADD COLUMN "coachName" TEXT;
