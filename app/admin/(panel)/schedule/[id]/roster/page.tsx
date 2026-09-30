import Link from "next/link";
import { notFound } from "next/navigation";
import { refundOneTime, setAttendance } from "@/app/admin/(panel)/actions";
import { AdminError } from "@/components/admin-error";
import { Button } from "@/components/ui/button";
import { formatMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import { formatEtLong } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function RosterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const session = await prisma.trainingSession.findUnique({ where: { id } });
  if (!session) notFound();
  const roster = await prisma.registration.findMany({
    where: { sessionId: id },
    orderBy: { createdAt: "asc" },
  });

  return (
    <div>
      <Link href="/admin/schedule" className="text-sm font-semibold text-primary">Schedule</Link>
      <h1 className="mt-2 font-display text-4xl uppercase">{session.title}</h1>
      <p className="text-sm text-muted-foreground">{formatEtLong(session.startsAt)} ET</p>
      <AdminError message={query.error} />
      {roster.length === 0 ? <p className="mt-4 text-sm">Nobody is on this roster yet.</p> : null}
      <ul className="mt-4 space-y-3">
        {roster.map((row) => (
          <li key={row.id} className="rounded-xl bg-white p-4 text-sm">
            <p className="font-semibold">{row.playerName}</p>
            <p>{row.parentName} · {row.email} · {row.phone}</p>
            <p className="text-muted-foreground">{row.kind} · {row.paymentStatus} · {formatMoney(row.amountCents)}</p>
            <p>Attended: {row.attended == null ? "Not marked" : row.attended ? "Yes" : "No"}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <form action={setAttendance}>
                <input type="hidden" name="id" value={row.id} />
                <input type="hidden" name="sessionId" value={session.id} />
                <input type="hidden" name="attended" value={row.attended ? "no" : "yes"} />
                <Button type="submit" variant="outline" size="sm">{row.attended ? "Clear attendance" : "Mark attended"}</Button>
              </form>
              {row.kind === "ONE_TIME" && row.paymentStatus === "PAID" ? (
                <form action={refundOneTime}>
                  <input type="hidden" name="id" value={row.id} />
                  <input type="hidden" name="back" value={`/admin/schedule/${session.id}/roster`} />
                  <Button type="submit" variant="outline" size="sm">Refund</Button>
                </form>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
