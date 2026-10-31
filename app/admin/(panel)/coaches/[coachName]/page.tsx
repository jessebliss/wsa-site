import Link from "next/link";
import { notFound } from "next/navigation";
import { saveCoachPrices } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { CoachQrCard } from "@/components/coach-qr";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { loadCoachDirectory } from "@/lib/coach-directory";
import { centsToDollarInput } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function CoachEditPage({
  params,
  searchParams,
}: {
  params: Promise<{ coachName: string }>;
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const { coachName: raw } = await params;
  const coachName = decodeURIComponent(raw);
  const query = await searchParams;
  const { entries, origin } = await loadCoachDirectory();
  const coach = entries.find((entry) => entry.coachName === coachName);
  if (!coach) notFound();

  return (
    <div>
      <Link href="/admin/coaches" className="text-sm font-semibold text-primary">All coaches</Link>
      <h1 className="mt-2 font-display text-4xl uppercase">{coach.coachName}</h1>
      {coach.login ? <p className="mt-2 text-sm text-muted-foreground">{coach.login.email}</p> : null}
      <p className="mt-1 text-sm">Parents see {coach.coachName}</p>
      <AdminError message={query.error} />
      {query.saved ? <p className="mt-3 text-sm font-semibold text-primary">Saved. Parents see the new price.</p> : null}
      {coach.offersPrivate || coach.offersSpeed ? (
        <form action={saveCoachPrices} className="mt-6 rounded-2xl bg-white p-4" data-coach-price={coach.coachName}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h2 className="font-display text-2xl uppercase">Prices</h2>
            <Button asChild variant="outline">
              <a href={coach.viewPath}>View booking page</a>
            </Button>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Private quarterback is the one-hour price on the booking page. Speed shows when this coach is on speed sessions.
          </p>
          <input type="hidden" name="coachName" value={coach.coachName} />
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {coach.offersPrivate ? (
              <div>
                <Label htmlFor="privateQuarterback">Private quarterback (USD)</Label>
                <Input
                  className="mt-1"
                  id="privateQuarterback"
                  name="privateQuarterback"
                  defaultValue={coach.privateCents != null ? centsToDollarInput(coach.privateCents) : ""}
                  required
                />
              </div>
            ) : null}
            {coach.offersSpeed ? (
              <div>
                <Label htmlFor="speed">Speed (USD)</Label>
                <Input
                  className="mt-1"
                  id="speed"
                  name="speed"
                  defaultValue={coach.speedCents != null ? centsToDollarInput(coach.speedCents) : ""}
                  required
                />
              </div>
            ) : null}
          </div>
          <Button className="mt-3" type="submit">Save prices</Button>
        </form>
      ) : null}
      {coach.showQr ? (
        <div className="mt-6 max-w-sm">
          <h2 className="font-display text-2xl uppercase">Booking code</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This code opens Quarterback Training with this coach already selected.
          </p>
          <div className="mt-3">
            <CoachQrCard coach={coach.coachName} origin={origin} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
