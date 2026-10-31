import { createTrainingType, deleteTrainingType, updateTrainingType } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { ConfirmForm } from "@/components/confirm-form";
import { DisclosurePanel } from "@/components/disclosure-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ensureTrainingTypes, loadTrainingTypes } from "@/lib/training-types";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Types" };

export default async function TypesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  await ensureTrainingTypes();
  const types = await loadTrainingTypes();
  const counts = await prisma.trainingSession.groupBy({
    by: ["typeId"],
    _count: { _all: true },
  });
  const countFor = new Map(counts.map((row) => [row.typeId, row._count._all]));

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Types</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        A type is one choice on the public schedule, such as Quarterback Training. Each session belongs to one type. Removing a type that still has sessions is refused.
      </p>
      <AdminError message={params.error} />
      <DisclosurePanel label="New type" hideLabel="Hide form" className="mt-4">
        <form action={createTrainingType} className="grid gap-3 rounded-2xl bg-white p-4">
          <div>
            <Label htmlFor="name">Name</Label>
            <Input className="mt-1" id="name" name="name" required placeholder="Quarterback Training" />
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Input className="mt-1" id="description" name="description" placeholder="One-on-one quarterback training." />
          </div>
          <div>
            <Label htmlFor="nextStep">Next step</Label>
            <Input className="mt-1" id="nextStep" name="nextStep" defaultValue="Choose a coach" />
          </div>
          <Button type="submit">Add type</Button>
        </form>
      </DisclosurePanel>
      <ul className="mt-6 space-y-3">
        {types.length === 0 ? <li className="text-sm text-muted-foreground">No types yet.</li> : null}
        {types.map((type) => {
          const count = countFor.get(type.id) ?? 0;
          return (
            <li key={type.id} className="rounded-2xl bg-white p-4" data-type-row={type.name}>
              <p className="text-sm text-muted-foreground">
                {count} session{count === 1 ? "" : "s"}
              </p>
              <form action={updateTrainingType} className="mt-3 grid gap-3">
                <input type="hidden" name="id" value={type.id} />
                <Input name="name" defaultValue={type.name} required aria-label="Name" />
                <Input name="description" defaultValue={type.description} aria-label="Description" />
                <Input name="nextStep" defaultValue={type.nextStep} aria-label="Next step" />
                <Button type="submit" variant="outline">Save type</Button>
              </form>
              <ConfirmForm
                action={deleteTrainingType}
                className="mt-3"
                message={`Remove ${type.name}? If it still has sessions, this is refused.`}
              >
                <input type="hidden" name="id" value={type.id} />
                <Button type="submit" variant="outline">Remove type</Button>
              </ConfirmForm>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
