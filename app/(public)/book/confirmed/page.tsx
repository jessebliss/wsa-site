import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatEtLong } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "You're booked" };

export default async function ConfirmedPage({
  searchParams,
}: {
  searchParams: Promise<{ registration?: string }>;
}) {
  const { registration: id } = await searchParams;
  const registration = id
    ? await prisma.registration.findUnique({ where: { id }, include: { session: true } })
    : null;

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <h1 className="font-display text-5xl uppercase">You&apos;re booked</h1>
      {registration ? (
        <>
          <p className="mt-3 text-lg">{registration.playerName} is in for {registration.session.title}.</p>
          <p className="mt-1 text-sm">{formatEtLong(registration.session.startsAt)} ET</p>
          <p className="mt-1 text-sm text-muted-foreground">{registration.session.location}</p>
          {registration.kind === "PLAN_CREDIT" ? (
            <p className="mt-4 text-sm">This session is covered by the monthly plan on {registration.email}. One session was used.</p>
          ) : (
            <p className="mt-4 text-sm">Payment status: {registration.paymentStatus}.</p>
          )}
        </>
      ) : (
        <p className="mt-3">We could not find that registration.</p>
      )}
      <Link href="/book-session" className="mt-6 inline-block text-sm font-semibold text-primary">Back to the schedule</Link>
    </div>
  );
}
