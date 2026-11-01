import Link from "next/link";
import { coaches } from "@/lib/content";
import { prisma } from "@/lib/prisma";
import { occupiedCounts } from "@/lib/booking";
import { formatMoney } from "@/lib/money";
import { planCadence } from "@/lib/plan-options";
import { loadOpenings } from "@/lib/openings";
import { PRIVATE_QUARTERBACK_KEY, SPEED_PROGRAM, isPrivateQuarterback, matchCoachName } from "@/lib/private-quarterback";
import { loadPrivateQuarterbackPrices, loadSavedPrivatePrices, loadSavedSpeedPrices, privateQuarterbackCoachNames } from "@/lib/private-quarterback-data";
import { isPlaceholderCoach, parentCoachNames } from "@/lib/schedule-filter";
import { etDayKey, etToUtc, shiftMonth } from "@/lib/time";
import { ensureTrainingTypes, loadTrainingTypes } from "@/lib/training-types";
import { PlanDisclosure } from "@/components/plan-disclosure";
import { PublicSchedule } from "@/components/public-schedule";
import { extendSeriesHorizon } from "@/lib/series";

export const dynamic = "force-dynamic";
export const metadata = { title: "Schedule" };

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ training?: string; coach?: string }>;
}) {
  const query = await searchParams;
  const todayKey = etDayKey(new Date());
  await extendSeriesHorizon(todayKey);
  await ensureTrainingTypes();
  const currentMonth = todayKey.slice(0, 7);
  const maxMonth = shiftMonth(currentMonth, 5);
  const rangeStart = etToUtc(todayKey, "00:00");
  const rangeEnd = etToUtc(`${shiftMonth(maxMonth, 1)}-01`, "00:00");
  const [sessions, plans, openings, types, retired] = await Promise.all([
    prisma.trainingSession.findMany({
      where: { status: { in: ["SCHEDULED", "CANCELED"] }, startsAt: { gte: rangeStart, lt: rangeEnd } },
      orderBy: { startsAt: "asc" },
    }),
    prisma.plan.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
    }),
    loadOpenings(todayKey, etDayKey(new Date(rangeEnd.getTime() - 60 * 1000))),
    loadTrainingTypes(),
    prisma.retiredCoach.findMany({ select: { coachName: true } }),
  ]);
  const retiredNames = new Set(retired.map((row) => row.coachName));
  const counts = await occupiedCounts(sessions.map((session) => session.id));
  const publicOpenings = Object.fromEntries(
    Object.entries(openings).filter(([name]) => !isPlaceholderCoach(name)),
  );
  const privateCoachNames = privateQuarterbackCoachNames(
    sessions
      .filter((session) => {
        if (!session.coach || isPlaceholderCoach(session.coach) || !isPrivateQuarterback(session)) return false;
        return session.capacity - (counts.get(session.id) ?? 0) > 0;
      })
      .map((session) => session.coach as string),
  );
  for (const name of Object.keys(publicOpenings)) {
    if (!privateCoachNames.includes(name)) privateCoachNames.push(name);
  }
  const speedCoachNames = Array.from(
    new Set(
      sessions
        .filter((session) => session.program === SPEED_PROGRAM)
        .flatMap((session) => parentCoachNames(session)),
    ),
  );
  const wantsSpeed = query.training === "speed";
  const wantsQuarterback = query.training === "quarterback";
  const requestedCoach = wantsQuarterback
    ? matchCoachName(query.coach ?? "", privateCoachNames)
    : wantsSpeed
      ? matchCoachName(query.coach ?? "", speedCoachNames)
      : "";
  const linkedCoach = isPlaceholderCoach(requestedCoach) ? "" : requestedCoach;
  if (wantsQuarterback && linkedCoach && !privateCoachNames.includes(linkedCoach)) privateCoachNames.push(linkedCoach);
  for (let index = privateCoachNames.length - 1; index >= 0; index -= 1) {
    if (retiredNames.has(privateCoachNames[index])) privateCoachNames.splice(index, 1);
  }
  const speedType = types.find((type) => type.offeringKey === `program:${SPEED_PROGRAM}`);
  const privateType = types.find((type) => type.offeringKey === PRIVATE_QUARTERBACK_KEY);
  const initialTypeId = wantsSpeed && linkedCoach ? speedType?.id ?? "" : wantsQuarterback && linkedCoach ? privateType?.id ?? "" : "";
  const [privatePrices, speedPrices, savedPrivatePrices] = await Promise.all([
    loadPrivateQuarterbackPrices(privateCoachNames),
    loadSavedSpeedPrices(),
    loadSavedPrivatePrices(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Book a session</p>
      <h1 className="font-display text-5xl uppercase">Schedule</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Times are Eastern. Choose a training, then a coach and a day.
      </p>

      <PublicSchedule
        todayKey={todayKey}
        currentMonth={currentMonth}
        maxMonth={maxMonth}
        openings={publicOpenings}
        portraits={Object.fromEntries(coaches.map((coach) => [coach.name, coach.photo]))}
        nowIso={new Date().toISOString()}
        initialTypeId={initialTypeId}
        initialCoach={linkedCoach}
        initialStep={linkedCoach ? 3 : 1}
        speedPrices={speedPrices}
        savedPrivatePrices={savedPrivatePrices}
        plans={plans.map((plan) => ({
          program: plan.program,
          color: plan.color,
          active: plan.active,
          sortOrder: plan.sortOrder,
        }))}
        types={types.map((type) => ({
          id: type.id,
          name: type.name,
          description: type.description,
          nextStep: type.nextStep,
          offeringKey: type.offeringKey,
          sortOrder: type.sortOrder,
        }))}
        privateCoaches={privateCoachNames.map((name) => ({ name, priceCents: privatePrices[name] ?? 0 }))}
        sessions={sessions.map((session) => ({
          id: session.id,
          kind: session.kind,
          program: session.program,
          typeId: session.typeId,
          title: session.title,
          coach: session.coach,
          coaches: session.coaches,
          status: session.status,
          startsAt: session.startsAt.toISOString(),
          endsAt: session.endsAt.toISOString(),
          capacity: session.capacity,
          spotsLeft: session.capacity - (counts.get(session.id) ?? 0),
          priceCents: session.priceCents,
          location: session.location,
        }))}
      >
        <PlanDisclosure>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Each session includes group times in that program, billed monthly or once a year. Unused times do not roll over. Camps and private lessons are not included.
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {plans.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sessions will show here once the academy publishes them.</p>
            ) : (
              plans.map((plan) => (
                <Link key={plan.id} href={`/sessions/${plan.id}`} className="rounded-2xl bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-primary">{plan.program}</p>
                  <h3 className="font-display text-3xl uppercase">{plan.name}</h3>
                  <p className="mt-2 font-display text-4xl" data-plan-cadence={planCadence(plan.billingInterval)}>
                    {formatMoney(plan.priceCents)}<span className="text-base"> {planCadence(plan.billingInterval)}</span>
                  </p>
                  <p className="mt-1 text-sm">{plan.sessionsPerMonth} group times {plan.billingInterval === "YEAR" ? "each year" : "each month"}</p>
                </Link>
              ))
            )}
          </div>
        </PlanDisclosure>
      </PublicSchedule>
    </div>
  );
}
