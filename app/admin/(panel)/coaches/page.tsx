import { createCoach, deleteCoach, saveCoachPrices } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { CoachQrCard } from "@/components/coach-qr";
import { ConfirmForm } from "@/components/confirm-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { centsToDollarInput } from "@/lib/money";
import { QUARTERBACK_COACHES, QUARTERBACK_PROGRAM, SPEED_PROGRAM } from "@/lib/private-quarterback";
import { loadPrivateQuarterbackPrices } from "@/lib/private-quarterback-data";
import { prisma } from "@/lib/prisma";
import { sessionCoachNames } from "@/lib/schedule-filter";
import { privateBookingPath, publicOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coaches" };

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const origin = await publicOrigin();
  const [coaches, scheduleCoaches, retired, pricedSessions, savedPrices] = await Promise.all([
    prisma.staffUser.findMany({ orderBy: { name: "asc" } }),
    prisma.trainingSession.findMany({
      where: { coach: { not: null } },
      distinct: ["coach"],
      select: { coach: true },
      orderBy: { coach: "asc" },
    }),
    prisma.retiredCoach.findMany({ select: { coachName: true } }),
    prisma.trainingSession.findMany({
      where: { program: { in: [SPEED_PROGRAM, QUARTERBACK_PROGRAM] } },
      select: { coach: true, coaches: true, kind: true, program: true, priceCents: true, startsAt: true },
      orderBy: { startsAt: "desc" },
    }),
    prisma.coachPrice.findMany(),
  ]);
  const names = scheduleCoaches.map((session) => session.coach).filter((name): name is string => Boolean(name));
  const retiredNames = new Set(retired.map((row) => row.coachName));
  const loginNames = new Set(coaches.map((coach) => coach.coachName));
  const qrNames = (QUARTERBACK_COACHES as readonly string[]).filter(
    (name) => loginNames.has(name) || !retiredNames.has(name),
  );
  for (const coach of coaches) {
    if (!qrNames.includes(coach.coachName)) qrNames.push(coach.coachName);
  }
  const speedNames = new Set<string>();
  const privateNames = new Set<string>(
    (QUARTERBACK_COACHES as readonly string[]).filter((name) => !retiredNames.has(name)),
  );
  const latestSpeedCents = new Map<string, number>();
  for (const session of pricedSessions) {
    const names = sessionCoachNames(session);
    if (session.program === SPEED_PROGRAM) {
      for (const name of names) {
        speedNames.add(name);
        if (!latestSpeedCents.has(name)) latestSpeedCents.set(name, session.priceCents);
      }
    }
    if (session.kind === "PRIVATE" && session.program === QUARTERBACK_PROGRAM) {
      for (const name of names) privateNames.add(name);
    }
  }
  const priceNames = [...privateNames];
  for (const name of [...speedNames].sort((a, b) => a.localeCompare(b))) {
    if (!priceNames.includes(name)) priceNames.push(name);
  }
  const savedByName = new Map(savedPrices.map((row) => [row.coachName, row]));
  const privateShown = await loadPrivateQuarterbackPrices(priceNames.filter((name) => privateNames.has(name)));

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Coaches</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        These logins are for coaches. They set the days and hours parents can book. The academy admin login still runs the schedule, prices, plans, promos, waiver, rosters, and attendance.
      </p>
      <AdminError message={params.error} />
      {params.saved ? <p className="mt-3 text-sm font-semibold text-primary">Saved. Parents see the new price.</p> : null}
      <h2 className="mt-8 font-display text-3xl uppercase">Public prices</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Private quarterback is the one-hour price on that coach&apos;s booking page. Speed shows only when the coach is on speed sessions. Saving replaces what parents see.
      </p>
      <div className="mt-4 grid gap-3">
        {priceNames.map((name) => {
          const saved = savedByName.get(name);
          const offersPrivate = privateNames.has(name);
          const offersSpeed = speedNames.has(name);
          const privateDefault = saved?.privateQuarterbackCents ?? privateShown[name];
          const speedDefault = saved?.speedCents ?? latestSpeedCents.get(name);
          const viewPath = offersPrivate
            ? privateBookingPath(name)
            : `/?${new URLSearchParams({ training: "speed", coach: name }).toString()}`;
          return (
            <form key={name} action={saveCoachPrices} className="rounded-2xl bg-white p-4" data-coach-price={name}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <h3 className="font-display text-2xl uppercase">{name}</h3>
                <Button asChild variant="outline">
                  <a href={viewPath}>View booking page</a>
                </Button>
              </div>
              <input type="hidden" name="coachName" value={name} />
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {offersPrivate ? (
                  <div>
                    <Label htmlFor={`private-${name}`}>Private quarterback (USD)</Label>
                    <Input
                      className="mt-1"
                      id={`private-${name}`}
                      name="privateQuarterback"
                      defaultValue={privateDefault != null ? centsToDollarInput(privateDefault) : ""}
                      required
                    />
                  </div>
                ) : null}
                {offersSpeed ? (
                  <div>
                    <Label htmlFor={`speed-${name}`}>Speed (USD)</Label>
                    <Input
                      className="mt-1"
                      id={`speed-${name}`}
                      name="speed"
                      defaultValue={speedDefault != null ? centsToDollarInput(speedDefault) : ""}
                      required
                    />
                  </div>
                ) : null}
              </div>
              <Button className="mt-3" type="submit">Save prices</Button>
            </form>
          );
        })}
      </div>
      <form action={createCoach} className="mt-4 grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="name">Name</Label>
          <Input className="mt-1" id="name" name="name" required autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input className="mt-1" id="email" name="email" type="email" required autoComplete="off" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input className="mt-1" id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
        </div>
        <div>
          <Label htmlFor="coachName">Coach on the schedule</Label>
          <select id="coachName" name="coachName" required className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3">
            <option value="">Choose</option>
            {names.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <Button type="submit">Create coach login</Button>
        </div>
      </form>
      <h2 className="mt-8 font-display text-3xl uppercase">QR codes</h2>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Each code opens Quarterback Training with that coach already selected. The parent picks a day and a time, then checks out. A coach with a login also sees their code there.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {qrNames.map((name) => (
          <CoachQrCard key={name} coach={name} origin={origin} />
        ))}
      </div>
      <ul className="mt-6 space-y-2">
        {coaches.length === 0 ? <li className="text-sm text-muted-foreground">No coach logins yet.</li> : null}
        {coaches.map((coach) => (
          <li key={coach.id} className="rounded-xl bg-white p-4">
            <p className="font-semibold">{coach.name}</p>
            <p className="text-sm text-muted-foreground">{coach.email}</p>
            <p className="text-sm">Schedule name: {coach.coachName}</p>
            <ConfirmForm
              action={deleteCoach}
              className="mt-3"
              message={`Delete ${coach.coachName}'s login, QR code, and saved availability? If an upcoming booking names only them, this is refused. Past attendance and payments stay.`}
            >
              <input type="hidden" name="id" value={coach.id} />
              <Button type="submit" variant="outline">Delete coach</Button>
            </ConfirmForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
