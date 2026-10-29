"use client";

import { useState } from "react";
import { CalendarLegend } from "@/components/calendar-legend";
import { MonthCalendar, type CalendarBlock } from "@/components/month-calendar";

export function AdminMonthSchedule({
  events,
  todayKey,
  minMonth,
  maxMonth,
}: {
  events: CalendarBlock[];
  todayKey: string;
  minMonth: string;
  maxMonth: string;
}) {
  const [month, setMonth] = useState(todayKey.slice(0, 7));
  const inMonth = events.filter((event) => event.dayKey.startsWith(month));

  return (
    <div className="mt-6">
      <h2 className="font-display text-3xl uppercase">Month</h2>
      <p className="mt-1 text-sm text-muted-foreground">Tap a block to open that event. Canceled sessions stay on the calendar, faded.</p>
      <div className="mt-3">
        <CalendarLegend />
        <MonthCalendar
          month={month}
          minMonth={minMonth}
          maxMonth={maxMonth}
          todayKey={todayKey}
          selected=""
          marked={[]}
          allowPast
          events={events}
          onSelect={() => {}}
          onMonth={setMonth}
        />
        {inMonth.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No events this month.</p> : null}
      </div>
    </div>
  );
}
