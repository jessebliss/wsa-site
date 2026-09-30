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
  counts,
  onlyOpen = false,
  onSelect,
  onMonth,
}: {
  month: string;
  minMonth: string;
  maxMonth: string;
  todayKey: string;
  selected: string;
  marked: string[];
  /** Public booking calendar: how many open sessions each day has. */
  counts?: Record<string, number>;
  /** Days with no opening stay quiet and cannot be tapped. */
  onlyOpen?: boolean;
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
          const count = counts?.[key] ?? 0;
          const open = counts ? count > 0 : marks.has(key);
          const disabled = past || (onlyOpen && !open);
          const label = formatEt(etToUtc(key, "12:00"), { weekday: "long", month: "long", day: "numeric" });
          const status = counts
            ? open
              ? `, ${count} open`
              : ", no times"
            : open
              ? ", open times"
              : "";
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`${label}${status}`}
              data-date={key}
              data-marked={open ? "yes" : "no"}
              data-count={counts ? String(count) : undefined}
              onClick={() => onSelect(key)}
              className={`flex min-h-11 flex-col items-center justify-center rounded-lg text-sm font-semibold disabled:cursor-default ${
                isSelected
                  ? "bg-primary text-white"
                  : disabled
                    ? "text-muted-foreground/35"
                    : onlyOpen
                      ? "bg-primary/15 text-foreground"
                      : "hover:bg-muted"
              }`}
            >
              <span>{Number(key.slice(-2))}</span>
              {counts ? (
                <span
                  aria-hidden="true"
                  className={`mt-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold leading-none ${
                    open ? (isSelected ? "bg-white text-primary" : "bg-primary text-white") : "opacity-0"
                  }`}
                >
                  {open ? count : "0"}
                </span>
              ) : (
                <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${open ? (isSelected ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
