import { createCoach } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { CoachQrCard } from "@/components/coach-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { QUARTERBACK_COACHES } from "@/lib/private-quarterback";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/site-origin";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coaches" };

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const origin = await publicOrigin();
  const [coaches, scheduleCoaches] = await Promise.all([
    prisma.staffUser.findMany({ orderBy: { name: "asc" } }),
    prisma.trainingSession.findMany({
      where: { coach: { not: null } },
      distinct: ["coach"],
      select: { coach: true },
      orderBy: { coach: "asc" },
    }),
  ]);
  const names = scheduleCoaches.map((session) => session.coach).filter((name): name is string => Boolean(name));
  const qrNames = [...QUARTERBACK_COACHES] as string[];
  for (const coach of coaches) {
    if (!qrNames.includes(coach.coachName)) qrNames.push(coach.coachName);
  }

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Coaches</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        These logins are for coaches. They set the days and hours parents can book. The academy admin login still runs the schedule, prices, plans, promos, waiver, rosters, and attendance.
      </p>
      <AdminError message={params.error} />
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
          </li>
        ))}
      </ul>
    </div>
  );
}
