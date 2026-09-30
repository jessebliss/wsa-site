import Link from "next/link";
import { saveSession } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { PARK } from "@/lib/utils";
import { formatEt, formatEtTime } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function ScheduleAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const start = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const sessions = await prisma.trainingSession.findMany({
    where: { startsAt: { gte: start } },
    orderBy: { startsAt: "asc" },
  });

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Schedule</h1>
      <p className="mt-2 text-sm text-muted-foreground">Times are entered in Eastern Time. A price change applies to new checkouts only.</p>
      <AdminError message={params.error} />
      <form action={saveSession} className="mt-4 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="kind">Type</Label>
          <select id="kind" name="kind" className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="GROUP">Group</option>
            <option value="CAMP">Camp</option>
            <option value="PRIVATE">Private</option>
          </select>
        </div>
        <div>
          <Label htmlFor="program">Program</Label>
          <Input className="mt-1" id="program" name="program" list="programs" required placeholder="Quarterback Training" />
          <datalist id="programs">
            <option value="Quarterback Training" />
            <option value="Speed & Agility" />
            <option value="Girls Flag" />
          </datalist>
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="title">Title</Label>
          <Input className="mt-1" id="title" name="title" required />
        </div>
        <div>
          <Label htmlFor="coach">Coach</Label>
          <Input className="mt-1" id="coach" name="coach" />
        </div>
        <div>
          <Label htmlFor="location">Location</Label>
          <Input className="mt-1" id="location" name="location" defaultValue={PARK} required />
        </div>
        <div>
          <Label htmlFor="date">Date</Label>
          <Input className="mt-1" id="date" name="date" type="date" required />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="start">Start</Label>
            <Input className="mt-1" id="start" name="start" type="time" required />
          </div>
          <div>
            <Label htmlFor="end">End</Label>
            <Input className="mt-1" id="end" name="end" type="time" required />
          </div>
        </div>
        <div>
          <Label htmlFor="capacity">Capacity</Label>
          <Input className="mt-1" id="capacity" name="capacity" type="number" min={1} required />
        </div>
        <div>
          <Label htmlFor="price">Price (USD)</Label>
          <Input className="mt-1" id="price" name="price" inputMode="decimal" required />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Input className="mt-1" id="description" name="description" />
        </div>
        <input type="hidden" name="status" value="SCHEDULED" />
        <div className="sm:col-span-2">
          <Button type="submit" className="w-full sm:w-auto">Add session</Button>
        </div>
      </form>
      <ul className="mt-6 space-y-2">
        {sessions.length === 0 ? <li className="text-sm text-muted-foreground">No sessions in this window.</li> : null}
        {sessions.map((session) => (
          <li key={session.id} className="rounded-xl bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-primary">{session.kind} · {session.status}</p>
                <p className="font-semibold">{session.title}</p>
                <p className="text-sm text-muted-foreground">
                  {formatEt(session.startsAt, { weekday: "short", month: "short", day: "numeric" })} {formatEtTime(session.startsAt)} ET · {formatMoney(session.priceCents)} · cap {session.capacity}
                </p>
              </div>
              <div className="flex flex-col gap-2 text-sm font-semibold">
                <Link href={`/admin/schedule/${session.id}`}>Edit</Link>
                <Link href={`/admin/schedule/${session.id}/roster`}>Roster</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
