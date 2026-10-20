import Link from "next/link";
import { AdminError } from "@/components/admin-error";
import { SessionForm } from "@/components/session-form";
import { blankSessionValues } from "@/lib/session-defaults";
import { repeatSummary } from "@/lib/recurrence";
import { loadCoachRoster } from "@/lib/roster";
import { sessionCoachNames } from "@/lib/schedule-filter";
import { extendSeriesHorizon, ruleForForm } from "@/lib/series";
import { prisma } from "@/lib/prisma";
import { PARK } from "@/lib/utils";
import { addDays, addMonthsToDay, etDayKey, etToUtc, formatEt, formatEtTime } from "@/lib/time";
import { formatMoney } from "@/lib/money";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function ScheduleAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const today = etDayKey(new Date());
  await extendSeriesHorizon(today);
  const [sessions, roster] = await Promise.all([
    prisma.trainingSession.findMany({
      where: {
        startsAt: {
          gte: etToUtc(addDays(today, -7), "00:00"),
          lt: etToUtc(addMonthsToDay(today, 8), "00:00"),
        },
      },
      include: { series: true },
      orderBy: { startsAt: "asc" },
    }),
    loadCoachRoster(),
  ]);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Schedule</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Times are Eastern. Pick the day on the calendar. A group session starts on every coach until you remove someone. Cancel leaves the event on the calendar. Delete removes it.
      </p>
      <AdminError message={params.error} />
      <SessionForm
        roster={roster}
        minMonth={addMonthsToDay(today, -12).slice(0, 7)}
        maxMonth={addMonthsToDay(today, 18).slice(0, 7)}
        values={blankSessionValues(today, roster, PARK)}
      />
      <ul className="mt-6 space-y-2">
        {sessions.length === 0 ? <li className="text-sm text-muted-foreground">No sessions in this window.</li> : null}
        {sessions.map((session) => {
          const names = sessionCoachNames(session);
          const repeat = repeatSummary(ruleForForm(session.series, etDayKey(session.startsAt)));
          return (
            <li key={session.id} className="rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-primary">
                    {session.kind} · {session.status === "CANCELED" ? "Canceled" : "Scheduled"}
                    {session.seriesId ? " · Repeats" : ""}
                  </p>
                  <p className={`font-semibold ${session.status === "CANCELED" ? "line-through" : ""}`}>{session.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {formatEt(session.startsAt, { weekday: "short", month: "short", day: "numeric" })} {formatEtTime(session.startsAt)} ET · {formatMoney(session.priceCents)} · cap {session.capacity}
                  </p>
                  <p className="text-sm">{repeat}</p>
                  {names.length > 0 ? <p className="text-sm">Coaches: {names.join(", ")}</p> : <p className="text-sm">No coaches on this event</p>}
                </div>
                <div className="flex flex-col gap-2 text-sm font-semibold">
                  <Link href={`/admin/schedule/${session.id}`}>Edit</Link>
                  <Link href={`/admin/schedule/${session.id}/roster`}>Roster</Link>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
