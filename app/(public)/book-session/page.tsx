import Link from "next/link";
import { offerings } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { occupiedCounts } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { rangeForDayKeys, upcomingDayKeys } from "@/lib/time";
import { ScheduleBoard } from "@/components/schedule-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Book Session" };

export default async function BookSessionPage({
  searchParams,
}: {
  searchParams: Promise<{ program?: string; coach?: string }>;
}) {
  const params = await searchParams;
  const dayKeys = upcomingDayKeys(21);
  const range = rangeForDayKeys(dayKeys);
  const [sessions, plans] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { status: "SCHEDULED", startsAt: { gte: range.start, lt: range.end } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);
  const counts = await occupiedCounts(sessions.map((session) => session.id));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Book a session</p>
      <h1 className="font-display text-5xl uppercase">Schedule</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Times are Eastern. Group sessions can use a monthly plan. Camps and private lessons are paid once. A full session shows as sold out.
      </p>

      <div className="mt-6">
        <ScheduleBoard
          dayKeys={dayKeys}
          initialProgram={params.program ?? ""}
          initialCoach={params.coach ?? ""}
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
        />
      </div>

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

      <section className="mt-12">
        <h2 className="font-display text-3xl uppercase">Train with</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {offerings.map((offer) => (
            <Link key={offer.title} href={offer.href} className="overflow-hidden rounded-2xl bg-white">
              <img
                src={offer.image}
                alt=""
                className="h-72 w-full object-cover"
                style={{ objectPosition: offer.imagePosition }}
              />
              <div className="p-4">
                <p className="text-xs text-muted-foreground">{offer.detail}</p>
                <h3 className="mt-1 font-display text-2xl uppercase leading-none">{offer.title}</h3>
                <p className="mt-3 text-sm font-semibold text-primary">Book</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
