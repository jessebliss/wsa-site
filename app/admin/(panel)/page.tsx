import Link from "next/link";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminHome() {
  const now = new Date();
  const [upcoming, active, pastDue, messages] = await Promise.all([
    prisma.trainingSession.count({ where: { status: "SCHEDULED", startsAt: { gte: now } } }),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.subscription.count({ where: { status: "PAST_DUE" } }),
    prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Overview</h1>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Link href="/admin/schedule" className="rounded-2xl bg-white p-4">
          <p className="text-sm text-muted-foreground">Upcoming sessions</p>
          <p className="font-display text-4xl">{upcoming}</p>
        </Link>
        <Link href="/admin/subscriptions" className="rounded-2xl bg-white p-4">
          <p className="text-sm text-muted-foreground">Active plans</p>
          <p className="font-display text-4xl">{active}</p>
        </Link>
        <Link href="/admin/subscriptions" className="rounded-2xl bg-white p-4">
          <p className="text-sm text-muted-foreground">Past due</p>
          <p className="font-display text-4xl">{pastDue}</p>
        </Link>
      </div>
      <h2 className="mt-8 font-display text-2xl uppercase">Recent messages</h2>
      {messages.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No contact messages yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {messages.map((message) => (
            <li key={message.id} className="rounded-xl bg-white p-3 text-sm">
              <p className="font-semibold">{message.firstName} {message.lastName}</p>
              <p className="text-muted-foreground">{message.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
