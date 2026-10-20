import Link from "next/link";
import { notFound } from "next/navigation";
import { AdminError } from "@/components/admin-error";
import { SessionForm } from "@/components/session-form";
import { type SessionFormValues } from "@/lib/session-defaults";
import { centsToDollarInput } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { loadCoachRoster } from "@/lib/roster";
import { ruleForForm } from "@/lib/series";
import { addMonthsToDay, etDayKey, etParts } from "@/lib/time";

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
  const session = await prisma.trainingSession.findUnique({ where: { id }, include: { series: true } });
  if (!session) notFound();
  const roster = await loadCoachRoster();
  const today = etDayKey(new Date());
  const parts = etParts(session.startsAt);
  const end = etParts(session.endsAt);
  const date = session.occurrenceDay ?? etDayKey(session.startsAt);
  const values: SessionFormValues = {
    id: session.id,
    kind: session.kind,
    program: session.program,
    title: session.title,
    coach: session.coach ?? "",
    coaches: session.kind === "GROUP" ? session.coaches : [],
    location: session.location,
    date,
    start: `${parts.hour}:${parts.minute}`,
    end: `${end.hour}:${end.minute}`,
    capacity: String(session.capacity),
    price: centsToDollarInput(session.priceCents),
    description: session.description ?? "",
    rule: ruleForForm(session.series, date),
    repeating: Boolean(session.seriesId),
  };

  return (
    <div>
      <Link href="/admin/schedule" className="text-sm font-semibold text-primary">Back to schedule</Link>
      <h1 className="mt-3 font-display text-4xl uppercase">Edit session</h1>
      {session.status === "CANCELED" ? (
        <p className="mt-2 text-sm font-semibold">This occurrence is canceled. It stays on the calendar, and the time can hold another event.</p>
      ) : null}
      <AdminError message={query.error} />
      <SessionForm
        roster={roster}
        values={values}
        minMonth={addMonthsToDay(today, -12).slice(0, 7)}
        maxMonth={addMonthsToDay(today, 18).slice(0, 7)}
      />
      <Link href={`/admin/schedule/${session.id}/roster`} className="mt-4 inline-block font-semibold text-primary">Open roster</Link>
    </div>
  );
}
