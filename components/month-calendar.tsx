"use client";

import { weekdayIndexForDayKey } from "@/lib/availability";
import { dayKeysForMonth, etToUtc, formatEt, formatMonthLabel } from "@/lib/time";

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function MonthCalendar({
  month,
  minMonth,
  maxMonth,
  todayKey,
  selected,
  marked,
  onSelect,
  onMonth,
}: {
  month: string;
  minMonth: string;
  maxMonth: string;
  todayKey: string;
  selected: string;
  marked: string[];
  onSelect: (dayKey: string) => void;
  onMonth: (monthKey: string) => void;
}) {
  const keys = dayKeysForMonth(month);
  const leading = weekdayIndexForDayKey(keys[0] ?? `${month}-01`);
  const marks = new Set(marked);
  const atStart = month <= minMonth;
  const atEnd = month >= maxMonth;

  function shift(delta: number) {
    const [year, monthNumber] = month.split("-").map(Number);
    const date = new Date(Date.UTC(year, monthNumber - 1 + delta, 1));
    const next = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
    if (next < minMonth || next > maxMonth) return;
    onMonth(next);
  }

  return (
    <div className="rounded-2xl bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          className="min-h-11 rounded-full px-3 text-sm font-semibold disabled:opacity-40"
          onClick={() => shift(-1)}
          disabled={atStart}
          aria-label="Previous month"
        >
          Back
        </button>
        <p className="font-display text-2xl uppercase">{formatMonthLabel(month)}</p>
        <button
          type="button"
          className="min-h-11 rounded-full px-3 text-sm font-semibold disabled:opacity-40"
          onClick={() => shift(1)}
          disabled={atEnd}
          aria-label="Next month"
        >
          Next
        </button>
      </div>
      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground" aria-hidden="true">
        {weekdayLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      <div className="mt-1 grid grid-cols-7 gap-1" aria-label="Dates">
        {Array.from({ length: leading }, (_, index) => (
          <span key={`blank-${index}`} />
        ))}
        {keys.map((key) => {
          const past = key < todayKey;
          const isSelected = key === selected;
          const open = marks.has(key);
          const label = formatEt(etToUtc(key, "12:00"), { weekday: "long", month: "long", day: "numeric" });
          return (
            <button
              key={key}
              type="button"
              disabled={past}
              aria-pressed={isSelected}
              aria-label={`${label}${open ? ", open times" : ""}`}
              data-date={key}
              data-marked={open ? "yes" : "no"}
              onClick={() => onSelect(key)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold ${
                isSelected ? "bg-primary text-white" : past ? "text-muted-foreground/40" : "hover:bg-muted"
              }`}
            >
              <span>{Number(key.slice(-2))}</span>
              <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${open ? (isSelected ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
