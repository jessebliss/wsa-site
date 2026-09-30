import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatMoney } from "@/lib/money";
import { normalizeEmail } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata = { title: "Subscriptions" };

export default async function SubscriptionsPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const params = await searchParams;
  const email = params.email ? normalizeEmail(params.email) : "";
  const subs = await prisma.subscription.findMany({
    where: email ? { email } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { plan: true },
  });

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Subscriptions</h1>
      <form className="mt-4 flex gap-2">
        <input name="email" defaultValue={email} placeholder="Filter by email" className="h-11 flex-1 rounded-md border border-border px-3" />
        <button className="h-11 rounded-md bg-ink px-4 text-sm font-semibold text-white" type="submit">Find</button>
      </form>
      <ul className="mt-4 space-y-2">
        {subs.length === 0 ? <li className="text-sm text-muted-foreground">No subscriptions yet.</li> : null}
        {subs.map((sub) => (
          <li key={sub.id}>
            <Link href={`/admin/subscriptions/${sub.id}`} className="block rounded-xl bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{sub.playerName}</p>
                  <p className="text-sm text-muted-foreground">{sub.email} · {sub.plan.name}</p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{sub.status}</p>
                  <p>{formatMoney(sub.priceCents)}</p>
                  <p>{sub.sessionsUsed}/{sub.sessionsIncluded} used</p>
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
