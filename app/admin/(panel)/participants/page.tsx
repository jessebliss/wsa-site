import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { formatEt, formatEtDate } from "@/lib/time";
import { normalizeEmail } from "@/lib/utils";

function acceptedOn(date: Date) {
  return formatEt(date, { month: "short", day: "numeric", year: "numeric" });
}

function membershipStatus(status: string) {
  const labels: Record<string, string> = {
    ACTIVE: "Active",
    CANCELED: "Canceled",
    PAST_DUE: "Past due",
    PAUSED: "Paused",
    INCOMPLETE: "Incomplete",
  };
  return labels[status] ?? status;
}

function paymentLabel(status: string) {
  const labels: Record<string, string> = {
    PENDING: "Pending",
    PAID: "Paid",
    REFUNDED: "Refunded",
    FAILED: "Failed",
    EXPIRED: "Expired",
  };
  return labels[status] ?? status;
}

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
      <h2 className="mt-6 font-display text-2xl uppercase">Sessions</h2>
      <ul className="mt-2 space-y-2">
        {subscriptions.length === 0 ? <li className="text-sm text-muted-foreground">No session signups yet.</li> : null}
        {subscriptions.map((row) => (
          <li key={row.id} className="rounded-xl bg-white p-4 text-sm">
            <p className="font-semibold">{row.playerName} · {row.parentName}</p>
            <p>{row.email} · {row.phone}</p>
            <p>{row.plan?.name || row.planName || "Deleted session"} · {formatMoney(row.priceCents)} · {membershipStatus(row.status)}</p>
            <p className="text-muted-foreground">
              {row.waiverAcceptance ? `Waiver accepted ${acceptedOn(row.waiverAcceptance.acceptedAt)}` : "No waiver on file"}
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
              {row.session && row.sessionId ? (
                <Link className="font-semibold" href={`/admin/schedule/${row.sessionId}/roster`}>{row.session.title}</Link>
              ) : (
                <span className="font-semibold">QB Introduction Session</span>
              )}
              {" · "}{row.session ? formatEtDate(row.session.startsAt) : "Not scheduled"} · {formatMoney(row.amountCents)} · {paymentLabel(row.paymentStatus)}
            </p>
            <p className="text-muted-foreground">Waiver accepted {acceptedOn(row.waiverAcceptance.acceptedAt)}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
