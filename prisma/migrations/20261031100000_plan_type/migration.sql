-- A membership session picks one type from the type list.

ALTER TABLE "plans" ADD COLUMN "typeId" TEXT;

ALTER TABLE "plans" ADD CONSTRAINT "plans_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "training_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
