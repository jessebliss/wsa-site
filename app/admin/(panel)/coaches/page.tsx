import { createCoach, deleteCoach } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { ConfirmForm } from "@/components/confirm-form";
import { DisclosurePanel } from "@/components/disclosure-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { coachEditPath, loadCoachDirectory } from "@/lib/coach-directory";
import { Trash2 } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";
export const metadata = { title: "Coaches" };

export default async function CoachesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const { entries, scheduleNames } = await loadCoachDirectory();

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Coaches</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Open a coach for the price parents see and their booking code.
      </p>
      <AdminError message={params.error} />
      {params.saved ? <p className="mt-3 text-sm font-semibold text-primary">Saved. Parents see the new price.</p> : null}
      <DisclosurePanel label="Add coach" hideLabel="Hide form" className="mt-4">
        <form action={createCoach} className="grid gap-3 rounded-2xl bg-white p-4 sm:grid-cols-2">
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
              {scheduleNames.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <Button type="submit">Add coach</Button>
          </div>
        </form>
      </DisclosurePanel>
      <ul className="mt-6 space-y-2">
        {entries.length === 0 ? <li className="text-sm text-muted-foreground">No coaches yet.</li> : null}
        {entries.map((coach) => (
          <li key={coach.coachName} className="flex items-center gap-3 rounded-xl bg-white p-3" data-coach-row={coach.coachName}>
            <Link href={coachEditPath(coach.coachName)} className="min-w-0 flex-1 py-1">
              <p className="font-semibold">{coach.login?.name ?? coach.coachName}</p>
              {coach.login ? <p className="text-sm text-muted-foreground">{coach.login.email}</p> : null}
              <p className="text-sm">Parents see {coach.coachName}</p>
            </Link>
            {coach.login ? (
              <ConfirmForm
                action={deleteCoach}
                message={`Delete ${coach.coachName}'s login, QR code, and saved availability? If an upcoming booking names only them, this is refused. Past attendance and payments stay.`}
              >
                <input type="hidden" name="id" value={coach.login.id} />
                <button
                  type="submit"
                  aria-label={`Delete ${coach.coachName}`}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-primary"
                >
                  <Trash2 aria-hidden="true" className="h-5 w-5" />
                </button>
              </ConfirmForm>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
