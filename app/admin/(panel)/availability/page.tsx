import { redirect } from "next/navigation";
import { CoachAvailability } from "@/components/coach-availability";
import { AdminError } from "@/components/admin-error";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
  const days = await prisma.coachDay.findMany({
    where: {
      staffUserId: session.user.id,
      dayKey: { gte: monthDays[0], lte: monthDays[monthDays.length - 1] },
    },
  });
  const saved: Record<string, { unavailable: boolean; hours: number[] }> = {};
  for (const day of days) saved[day.dayKey] = { unavailable: day.unavailable, hours: day.hours };
  const initialDay = params.day && monthDays.includes(params.day) && params.day >= todayKey ? params.day : todayKey.startsWith(month) ? todayKey : monthDays[0];

  return (
    <div>
      <h1 className="font-display text-4xl uppercase">Availability</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Eastern Time. This month is the earliest you can open. Pick a day, turn hours on or off, then save that day. Not available closes the whole day and clears its hours. Sunday and Saturday run 8 AM–5 PM, Monday through Wednesday 9 AM–9 PM, and Thursday and Friday 9 AM–5 PM.
      </p>
      <div className="mt-4">
        <AdminError message={params.error} />
        <CoachAvailability
          month={month}
          minMonth={currentMonth}
          maxMonth={maxMonth}
          todayKey={todayKey}
          initialDay={initialDay}
          days={saved}
          savedNotice={params.saved === "1"}
        />
      </div>
    </div>
  );
}
