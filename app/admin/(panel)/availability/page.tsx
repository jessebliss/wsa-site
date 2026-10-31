import { redirect } from "next/navigation";
import { CoachAvailability } from "@/components/coach-availability";
import { CoachQrCard } from "@/components/coach-qr";
import { AdminError } from "@/components/admin-error";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { publicOrigin } from "@/lib/site-origin";
import { dayKeysForMonth, etDayKey, shiftMonth } from "@/lib/time";

export const dynamic = "force-dynamic";
export const metadata = { title: "Availability" };

export default async function AvailabilityPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; day?: string; saved?: string; error?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/admin/login");
  if (session.user.role !== "coach" || !session.user.id) redirect("/admin");

  const params = await searchParams;
  const todayKey = etDayKey(new Date());
  const currentMonth = todayKey.slice(0, 7);
  const maxMonth = shiftMonth(currentMonth, 11);
  const requested = params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : currentMonth;
  const month = requested < currentMonth ? currentMonth : requested > maxMonth ? maxMonth : requested;
  const monthDays = dayKeysForMonth(month);
  const lastDay = dayKeysForMonth(maxMonth).at(-1) ?? `${maxMonth}-28`;
  const days = await prisma.coachDay.findMany({
    where: {
      staffUserId: session.user.id,
      dayKey: { gte: `${currentMonth}-01`, lte: lastDay },
    },
  });
  const saved: Record<string, { unavailable: boolean; hours: number[] }> = {};
  for (const day of days) saved[day.dayKey] = { unavailable: day.unavailable, hours: day.hours };
  const initialDay = params.day && monthDays.includes(params.day) && params.day >= todayKey ? params.day : todayKey.startsWith(month) ? todayKey : monthDays.find((key) => key >= todayKey) ?? monthDays[0];
  const origin = await publicOrigin();

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Availability</h1>
      <p className="mt-2 text-sm text-muted-foreground">Eastern Time. Pick a day and save it.</p>
      <div className="mt-4">
        <AdminError message={params.error} />
        <CoachAvailability
          month={month}
          minMonth={currentMonth}
          maxMonth={maxMonth}
          todayKey={todayKey}
          initialDay={initialDay}
          days={saved}
        />
      </div>
      <details className="mt-6 rounded-2xl bg-white p-4">
        <summary className="cursor-pointer text-sm font-semibold">Academy hours</summary>
        <p className="mt-2 text-sm text-muted-foreground">
          Sunday and Saturday run 8 AM–5 PM, Monday through Wednesday 9 AM–9 PM, and Thursday and Friday 9 AM–5 PM. Not available closes the whole day and clears its hours.
        </p>
      </details>
      {session.user.coachName ? (
        <details className="mt-3 rounded-2xl bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold">Booking code</summary>
          <div className="mt-3 max-w-sm">
            <CoachQrCard coach={session.user.coachName} origin={origin} />
          </div>
        </details>
      ) : null}
    </div>
  );
}
