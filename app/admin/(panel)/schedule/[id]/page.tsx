import Link from "next/link";
import { notFound } from "next/navigation";
import { saveSession } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { etDayKey, etParts } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function EditSessionPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await prisma.trainingSession.findUnique({ where: { id } });
  if (!session) notFound();
  const parts = etParts(session.startsAt);
  const end = etParts(session.endsAt);

  return (
    <div>
      <Link href="/admin/schedule" className="text-sm font-semibold text-primary">Back to schedule</Link>
      <h1 className="mt-3 font-display text-4xl uppercase">Edit session</h1>
      <AdminError message={query.error} />
      <form action={saveSession} className="mt-4 grid gap-3 rounded-2xl bg-white p-4">
        <input type="hidden" name="id" value={session.id} />
        <div>
          <Label htmlFor="kind">Type</Label>
          <select id="kind" name="kind" defaultValue={session.kind} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="GROUP">Group</option>
            <option value="CAMP">Camp</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
        <div>
          <Label htmlFor="status">Status</Label>
          <select id="status" name="status" defaultValue={session.status} className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="SCHEDULED">Scheduled</option>
            <option value="CANCELED">Canceled</option>
          </select>
        </div>
        <Label htmlFor="program">Program</Label>
        <Input id="program" name="program" defaultValue={session.program} required />
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={session.title} required />
        <Label htmlFor="coach">Coach</Label>
        <Input id="coach" name="coach" defaultValue={session.coach ?? ""} />
        <Label htmlFor="location">Location</Label>
        <Input id="location" name="location" defaultValue={session.location} required />
        <Label htmlFor="date">Date</Label>
        <Input id="date" name="date" type="date" required defaultValue={etDayKey(session.startsAt)} />
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="start">Start</Label>
            <Input id="start" name="start" type="time" required defaultValue={`${parts.hour}:${parts.minute}`} />
          </div>
          <div>
            <Label htmlFor="end">End</Label>
            <Input id="end" name="end" type="time" required defaultValue={`${end.hour}:${end.minute}`} />
          </div>
        </div>
        <Label htmlFor="capacity">Capacity</Label>
        <Input id="capacity" name="capacity" type="number" min={1} required defaultValue={session.capacity} />
        <Label htmlFor="price">Price (USD)</Label>
        <Input id="price" name="price" required defaultValue={centsToDollarInput(session.priceCents)} />
        <Label htmlFor="description">Description</Label>
        <Input id="description" name="description" defaultValue={session.description ?? ""} />
        <Button type="submit">Save</Button>
      </form>
      <Link href={`/admin/schedule/${session.id}/roster`} className="mt-4 inline-block font-semibold text-primary">Open roster</Link>
    </div>
  );
}
