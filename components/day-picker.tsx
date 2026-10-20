"use client";

import { useState } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { etToUtc, formatEt } from "@/lib/time";

export function DayPicker({
  name,
  value,
  onChange,
  minMonth,
  maxMonth,
}: {
  name: string;
  value: string;
  onChange: (dayKey: string) => void;
  minMonth: string;
  maxMonth: string;
}) {
  const [month, setMonth] = useState((value || minMonth).slice(0, 7));
  const label = /^\d{4}-\d{2}-\d{2}$/.test(value)
    ? formatEt(etToUtc(value, "12:00"), { weekday: "long", month: "long", day: "numeric", year: "numeric" })
    : "Choose a day";

  return (
    <div className="rounded-2xl border border-border p-2">
      <input type="hidden" name={name} value={value} />
      <p className="px-2 pb-2 text-sm font-semibold">{label}</p>
      <MonthCalendar
        month={month < minMonth ? minMonth : month > maxMonth ? maxMonth : month}
        minMonth={minMonth}
        maxMonth={maxMonth}
        todayKey="0000-01-01"
        selected={value}
        marked={[]}
        onSelect={onChange}
        onMonth={setMonth}
      />
    </div>
  );
}
