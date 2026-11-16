"use client";

import { useEffect, useState } from "react";
import { CalendarLegend, legendItems } from "@/components/calendar-legend";
import { DayEventsPanel } from "@/components/day-events";
import { MonthCalendar, type CalendarBlock } from "@/components/month-calendar";
import type { ReviewSlot } from "@/components/transaction-review";

export function AdminMonthSchedule({
  events,
  slots,
  todayKey,
  minMonth,
  maxMonth,
  initialDay = "",
  focusEventId = "",
}: {
  events: CalendarBlock[];
  slots: ReviewSlot[];
  todayKey: string;
  minMonth: string;
  maxMonth: string;
  initialDay?: string;
  focusEventId?: string;
}) {
  const opened = initialDay || todayKey;
  const [month, setMonth] = useState(opened.slice(0, 7));
  const [day, setDay] = useState(initialDay);
  useEffect(() => {
    if (!focusEventId) return;
    document.getElementById(`event-${focusEventId}`)?.scrollIntoView({ block: "center" });
  }, [focusEventId, day]);
  const inMonth = events.filter((event) => event.dayKey.startsWith(month));

  return (
    <div className="mt-6">
      <h2 className="font-display text-3xl uppercase">Month</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap a day to list that day under the calendar. Tap a block to open that event. Canceled sessions stay faded and do not hold the time.
      </p>
      <div className="mt-3">
        <CalendarLegend items={legendItems(inMonth)} />
        <MonthCalendar
          month={month}
          minMonth={minMonth}
          maxMonth={maxMonth}
          todayKey={todayKey}
          selected={day}
          marked={[]}
          allowPast
          events={events}
          onSelect={setDay}
          onMonth={(next) => {
            setMonth(next);
            setDay("");
          }}
        />
        {inMonth.length === 0 ? <p className="mt-3 text-sm text-muted-foreground">No events this month.</p> : null}
        <DayEventsPanel dayKey={day} events={events} slots={slots} focusEventId={focusEventId} />
      </div>
    </div>
  );
}
