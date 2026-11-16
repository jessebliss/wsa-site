import { AdminError } from "@/components/admin-error";
import { AdminMonthSchedule } from "@/components/admin-month-schedule";
import { DisclosurePanel } from "@/components/disclosure-panel";
import { SessionForm } from "@/components/session-form";
import { colorForProgram } from "@/lib/plan-options";
import { blankSessionValues } from "@/lib/session-defaults";
import { ensureTrainingTypes, loadTrainingTypes } from "@/lib/training-types";
import { loadCoachRoster } from "@/lib/roster";
import { sessionCoachNames } from "@/lib/schedule-filter";
import { extendSeriesHorizon } from "@/lib/series";
import { prisma } from "@/lib/prisma";
import { transactionProposal } from "@/components/transaction-rows";
import { PARK } from "@/lib/utils";
import { addMonthsToDay, etDayKey, etToUtc, formatEtTime, shiftMonth } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function ScheduleAdmin({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; day?: string; event?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const openedDay = /^\d{4}-\d{2}-\d{2}$/.test(params.day ?? "") ? params.day ?? "" : "";
  const today = etDayKey(new Date());
  await extendSeriesHorizon(today);
  await ensureTrainingTypes();
  const minMonth = shiftMonth(today.slice(0, 7), -12);
  const maxMonth = shiftMonth(today.slice(0, 7), 8);
  const [sessions, roster, plans, types, reviews] = await Promise.all([
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
    loadTrainingTypes(),
    prisma.invoice.findMany({
      where: { sessionId: { not: null } },
      orderBy: { number: "desc" },
    }),
  ]);
  const reviewsBySession = new Map<string, typeof reviews>();
  for (const invoice of reviews) {
    if (!invoice.sessionId) continue;
    const list = reviewsBySession.get(invoice.sessionId) ?? [];
    list.push(invoice);
    reviewsBySession.set(invoice.sessionId, list);
  }

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Schedule</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Times are Eastern. A group session starts on every coach until you remove someone. Cancel leaves the event on the calendar. Delete removes it.
      </p>
      <AdminError message={params.error} />
      {params.saved === "review" ? <p className="mt-3 text-sm font-semibold text-primary">Saved on that transaction.</p> : null}
      <AdminMonthSchedule
        todayKey={today}
        minMonth={minMonth}
        maxMonth={maxMonth}
        initialDay={openedDay}
        focusEventId={params.event ?? ""}
        slots={sessions
          .filter((session) => session.status === "SCHEDULED")
          .map((session) => ({
            id: session.id,
            label: `${etDayKey(session.startsAt)} · ${formatEtTime(session.startsAt)} · ${session.title}`,
          }))}
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
            reviews: (reviewsBySession.get(session.id) ?? []).map((invoice) => ({
              id: invoice.id,
              number: invoice.number,
              parentName: invoice.customerName,
              playerName: invoice.playerName,
              reviewStatus: invoice.reviewStatus,
              proposal: transactionProposal(invoice),
            })),
          };
        })}
      />
      <DisclosurePanel label="New session" hideLabel="Hide new session" className="mt-8">
        <SessionForm
          roster={roster}
          types={types.map((type) => ({ id: type.id, name: type.name }))}
          minMonth={addMonthsToDay(today, -12).slice(0, 7)}
          maxMonth={addMonthsToDay(today, 18).slice(0, 7)}
          values={blankSessionValues(today, roster, PARK)}
        />
      </DisclosurePanel>
    </div>
  );
}
