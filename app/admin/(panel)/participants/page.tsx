import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatEtDate } from "@/lib/time";
import { normalizeEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Participants" };

export default async function ParticipantsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ? normalizeEmail(params.email) : "";
  const subscriptions = await prisma.subscription.findMany({
    where: email ? { email } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { plan: true, waiverAcceptance: true },
  });
  const registrations = await prisma.registration.findMany({
    where: email ? { email } : undefined,
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { session: true, waiverAcceptance: true },
  });
  const exportHref = email ? `/api/admin/participants?email=${encodeURIComponent(email)}` : "/api/admin/participants";

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <h1 className="font-display text-4xl uppercase">Participants</h1>
        <a className="text-sm font-semibold text-primary" href={exportHref}>Export CSV</a>
      </div>
      <form className="mt-4 flex gap-2">
        <input name="email" defaultValue={email} placeholder="Filter by email" className="h-11 flex-1 rounded-md border border-border px-3" />
        <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-white" type="submit">Find</button>
      </form>
      <h2 className="mt-6 font-display text-2xl uppercase">Monthly plans</h2>
      <ul className="mt-2 space-y-2">
        {subscriptions.length === 0 ? <li className="text-sm text-muted-foreground">No plan signups yet.</li> : null}
        {subscriptions.map((row) => (
          <li key={row.id} className="rounded-xl bg-white p-4 text-sm">
            <p className="font-semibold">{row.playerName} · {row.parentName}</p>
            <p>{row.email} · {row.phone}</p>
            <p>{row.plan.name} · {formatMoney(row.priceCents)} · {row.status}</p>
            <p className="text-muted-foreground">
              Waiver {row.waiverAcceptance ? `accepted ${row.waiverAcceptance.acceptedAt.toISOString()}` : "not stored"}
            </p>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 font-display text-2xl uppercase">Sessions</h2>
      <ul className="mt-2 space-y-2">
        {registrations.length === 0 ? <li className="text-sm text-muted-foreground">No registrations yet.</li> : null}
        {registrations.map((row) => (
          <li key={row.id} className="rounded-xl bg-white p-4 text-sm">
            <p className="font-semibold">{row.playerName} · {row.parentName}</p>
            <p>{row.email} · {row.phone}</p>
            <p>
              <Link className="font-semibold" href={`/admin/schedule/${row.sessionId}/roster`}>{row.session.title}</Link>
              {" · "}{formatEtDate(row.session.startsAt)} · {formatMoney(row.amountCents)} · {row.paymentStatus}
            </p>
            <p className="text-muted-foreground">Waiver accepted {row.waiverAcceptance.acceptedAt.toISOString()}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
