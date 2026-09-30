import Link from "next/link";
import { coaches } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { occupiedCounts } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { loadOpenings } from "@/lib/openings";
import { etDayKey, etToUtc, shiftMonth } from "@/lib/time";
import { PublicSchedule } from "@/components/public-schedule";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function SchedulePage() {
  const todayKey = etDayKey(new Date());
  const currentMonth = todayKey.slice(0, 7);
  const maxMonth = shiftMonth(currentMonth, 5);
  const rangeStart = etToUtc(todayKey, "00:00");
  const rangeEnd = etToUtc(`${shiftMonth(maxMonth, 1)}-01`, "00:00");
  const [sessions, plans, openings] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    loadOpenings(todayKey, etDayKey(new Date(rangeEnd.getTime() - 60 * 1000))),
  ]);
  const counts = await occupiedCounts(sessions.map((session) => session.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Book a session</p>
      <h1 className="font-display text-5xl uppercase">Schedule</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Times are Eastern. Pick what you want, who you want, then a day. Group sessions can use a monthly plan. Camps and private lessons are paid once.
      </p>

      <PublicSchedule
        todayKey={todayKey}
        currentMonth={currentMonth}
        maxMonth={maxMonth}
        openings={openings}
        portraits={Object.fromEntries(coaches.map((coach) => [coach.name, coach.photo]))}
        sessions={sessions.map((session) => ({
          id: session.id,
          kind: session.kind,
          program: session.program,
          title: session.title,
          coach: session.coach,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          capacity: session.capacity,
          spotsLeft: session.capacity - (counts.get(session.id) ?? 0),
          priceCents: session.priceCents,
          location: session.location,
        }))}
      >
        <section id="plans" className="mt-12 scroll-mt-24">
          <h2 className="font-display text-4xl uppercase">Monthly plans</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Each plan is a number of group sessions in that program. Unused sessions do not roll over. Camps and private lessons are not included.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Plans will show here once the academy publishes them.</p>
            ) : (
              plans.map((plan) => (
                <Link key={plan.id} href={`/plans/${plan.id}`} className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{plan.program}</p>
                  <h3 className="font-display text-3xl uppercase">{plan.name}</h3>
                  <p className="mt-2 font-display text-4xl">{formatMoney(plan.priceCents)}<span className="text-base"> / month</span></p>
                  <p className="mt-1 text-sm">{plan.sessionsPerMonth} group sessions each month</p>
                </Link>
              ))
            )}
          </div>
        </section>
      </PublicSchedule>
    </div>
  );
}
