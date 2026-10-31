"use client";

import type { CSSProperties } from "react";
import Link from "next/link";
import { weekdayIndexForDayKey } from "@/lib/availability";
import { dayKeysForMonth, etToUtc, formatEt, formatMonthLabel } from "@/lib/time";

const weekdayLabels = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type CalendarBlock = {
  id: string;
  dayKey: string;
  title: string;
  time: string;
  when: string;
  startsAt: string;
  program: string;
  coaches: string;
  location: string;
  color: string;
  colorId: string;
  canceled: boolean;
  href?: string;
  /** Extra booking line, such as price and spots. Omit when the row already says enough. */
  note?: string;
};

function blockStyle(color: string, canceled: boolean): CSSProperties {
  if (canceled) {
    return { backgroundColor: `${color}33`, color, textDecoration: "line-through" };
  }
  return { backgroundColor: color, color: "#fff" };
}

export function MonthCalendar({
  month,
  minMonth,
  maxMonth,
  todayKey,
  selected,
  marked,
  counts,
  onlyOpen = false,
  allowPast = false,
  events,
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
  /** Admin can open events that already happened. */
  allowPast?: boolean;
  /** Color blocks drawn on the day. Omit this on the compact day picker. */
  events?: CalendarBlock[];
  onSelect: (dayKey: string) => void;
  onMonth: (monthKey: string) => void;
}) {
  const keys = dayKeysForMonth(month);
  const leading = weekdayIndexForDayKey(keys[0] ?? `${month}-01`);
  const marks = new Set(marked);
  const eventsByDay = new Map<string, CalendarBlock[]>();
  for (const event of events ?? []) {
    const list = eventsByDay.get(event.dayKey) ?? [];
    list.push(event);
    eventsByDay.set(event.dayKey, list);
  }
  const showingBlocks = events != null;
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
          Previous
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
          const past = key < todayKey && !allowPast;
          const isSelected = key === selected;
          const count = counts?.[key] ?? 0;
          const open = counts ? count > 0 : marks.has(key);
          const dayEvents = eventsByDay.get(key) ?? [];
          const canSelect = dayEvents.length > 0 || (!past && !(onlyOpen && !open));
          const disabled = !canSelect;
          const label = formatEt(etToUtc(key, "12:00"), { weekday: "long", month: "long", day: "numeric" });
          const status = counts
            ? open
              ? `, ${count} open`
              : ", no times"
            : open
              ? ", open times"
              : "";
          if (showingBlocks) {
            return (
              <div
                key={key}
                data-date={key}
                data-selected={isSelected ? "yes" : "no"}
                data-count={counts ? String(count) : undefined}
                onClick={() => {
                  if (canSelect) onSelect(key);
                }}
                className={`flex min-h-24 flex-col rounded-lg p-0.5 sm:min-h-28 ${
                  isSelected ? "ring-2 ring-ink" : past ? "text-muted-foreground/50" : open && onlyOpen ? "bg-primary/10" : "bg-muted/40"
                }`}
              >
                <button
                  type="button"
                  disabled={!canSelect}
                  aria-pressed={isSelected}
                  aria-label={`${label}${status}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    if (canSelect) onSelect(key);
                  }}
                  className="min-h-6 px-0.5 text-left text-sm font-semibold disabled:cursor-default"
                >
                  {Number(key.slice(-2))}
                </button>
                <div className="mt-0.5 flex flex-col gap-1" onClick={(event) => event.stopPropagation()}>
                  {dayEvents.map((event) => {
                    const className = "block min-h-11 rounded-md px-1 py-1 text-left text-xs font-semibold leading-tight";
                    const text = <span className="block whitespace-normal">{event.time}</span>;
                    const label = `${event.time}. ${event.title}`;
                    if (event.href) {
                      return (
                        <Link
                          key={event.id}
                          href={event.href}
                          data-event={event.id}
                          data-color={event.colorId}
                          data-canceled={event.canceled ? "yes" : "no"}
                          aria-label={label}
                          title={event.title}
                          className={className}
                          style={blockStyle(event.color, event.canceled)}
                        >
                          {text}
                        </Link>
                      );
                    }
                    return (
                      <span
                        key={event.id}
                        data-event={event.id}
                        data-color={event.colorId}
                        data-canceled={event.canceled ? "yes" : "no"}
                        title={event.title}
                        className={className}
                        style={blockStyle(event.color, event.canceled)}
                      >
                        {text}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
          }
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
