import Link from "next/link";
import { offerings } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { occupiedCounts } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { rangeForDayKeys, upcomingDayKeys } from "@/lib/time";
import { PublicSchedule } from "@/components/public-schedule";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

type OfferingSession = {
  id: string;
  program: string;
  title: string;
  coach: string | null;
  startsAt: Date;
  spotsLeft: number;
};

function offeringBookingHref(offer: (typeof offerings)[number], sessions: OfferingSession[]) {
  const target = new URL(offer.href, "https://wsa.local");
  const program = target.searchParams.get("program") ?? "";
  const coach = target.searchParams.get("coach") ?? "";
  const sameOffering = sessions.filter((session) => {
    if (session.program !== program) return false;
    if (coach && session.coach !== coach) return false;
    return true;
  });
  const titled = sameOffering.filter((session) => {
    const offerTitle = offer.title.toLowerCase();
    const sessionTitle = session.title.toLowerCase();
    return offerTitle.includes(sessionTitle) || sessionTitle.includes(offerTitle);
  });
  const open = (titled.length > 0 ? titled : sameOffering)
    .filter((session) => session.spotsLeft > 0)
    .sort((a, b) => a.startsAt.getTime() - b.startsAt.getTime());
  if (open[0]) return `/book/${open[0].id}`;
  return `${offer.href}#schedule`;
}

export default async function SchedulePage({
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
  const offeringSessions: OfferingSession[] = sessions.map((session) => ({
    id: session.id,
    program: session.program,
    title: session.title,
    coach: session.coach,
    startsAt: session.startsAt,
    spotsLeft: session.capacity - (counts.get(session.id) ?? 0),
  }));

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Book a session</p>
      <h1 className="font-display text-5xl uppercase">Schedule</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Times are Eastern. Group sessions can use a monthly plan. Camps and private lessons are paid once. A full session shows as sold out.
      </p>

      <PublicSchedule
        key={`${params.program ?? ""}|${params.coach ?? ""}`}
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
        offerings={offerings.map((offer) => {
          const target = new URL(offer.href, "https://wsa.local");
          return {
            title: offer.title,
            detail: offer.detail,
            image: offer.image,
            imagePosition: offer.imagePosition,
            href: offeringBookingHref(offer, offeringSessions),
            program: target.searchParams.get("program") ?? "",
            coach: target.searchParams.get("coach") ?? "",
          };
        })}
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
