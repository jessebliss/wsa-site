import { AdminError } from "@/components/admin-error";
import { AdminMonthSchedule } from "@/components/admin-month-schedule";
import { SessionForm } from "@/components/session-form";
import { colorForProgram } from "@/lib/plan-options";
import { blankSessionValues } from "@/lib/session-defaults";
import { loadCoachRoster } from "@/lib/roster";
import { sessionCoachNames } from "@/lib/schedule-filter";
import { extendSeriesHorizon } from "@/lib/series";
import { prisma } from "@/lib/prisma";
import { PARK } from "@/lib/utils";
import { addMonthsToDay, etDayKey, etToUtc, formatEtTime, shiftMonth } from "@/lib/time";

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
  const minMonth = shiftMonth(today.slice(0, 7), -12);
  const maxMonth = shiftMonth(today.slice(0, 7), 8);
  const [sessions, roster, plans] = await Promise.all([
    prisma.trainingSession.findMany({
      where: {
        startsAt: {
          gte: etToUtc(`${minMonth}-01`, "00:00"),
          lt: etToUtc(`${shiftMonth(maxMonth, 1)}-01`, "00:00"),
        },
      },
      orderBy: { startsAt: "asc" },
    }),
    loadCoachRoster(),
    prisma.plan.findMany({ select: { program: true, color: true, active: true, sortOrder: true } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Schedule</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Times are Eastern. A group session starts on every coach until you remove someone. Cancel leaves the event on the calendar. Delete removes it.
      </p>
      <AdminError message={params.error} />
      <SessionForm
        roster={roster}
        minMonth={addMonthsToDay(today, -12).slice(0, 7)}
        maxMonth={addMonthsToDay(today, 18).slice(0, 7)}
        values={blankSessionValues(today, roster, PARK)}
      />
      <AdminMonthSchedule
        todayKey={today}
        minMonth={minMonth}
        maxMonth={maxMonth}
        events={sessions.map((session) => {
          const color = colorForProgram(session.program, plans);
          return {
            id: session.id,
            dayKey: etDayKey(session.startsAt),
            title: session.title,
            time: formatEtTime(session.startsAt),
            when: `${formatEtTime(session.startsAt)}–${formatEtTime(session.endsAt)} ET`,
            startsAt: session.startsAt.toISOString(),
            program: session.program,
            coaches: sessionCoachNames(session).join(", "),
            location: session.location,
            color: color.hex,
            colorId: color.id,
            canceled: session.status === "CANCELED",
            href: `/admin/schedule/${session.id}`,
          };
        })}
      />
    </div>
  );
}
