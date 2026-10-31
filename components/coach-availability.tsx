"use client";

import { useState, useTransition } from "react";
import { saveCoachDay, type CoachDaySave } from "@/app/admin/(panel)/actions";
import { MonthCalendar } from "@/components/month-calendar";
import { Button } from "@/components/ui/button";
import { formatHourLabel, hourStartsForDay, type DayOpening } from "@/lib/availability";
import { dayKeysForMonth, etToUtc, formatEt } from "@/lib/time";

function DayEditor({
  day,
  saved,
  onSaved,
}: {
  day: string;
  saved?: DayOpening;
  onSaved: (result: Extract<CoachDaySave, { ok: true }>) => void;
}) {
  const [unavailable, setUnavailable] = useState(Boolean(saved?.unavailable));
  const [hours, setHours] = useState<number[]>(saved && !saved.unavailable ? saved.hours : []);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const choices = hourStartsForDay(day);
  const label = formatEt(etToUtc(day, "12:00"), { weekday: "long", month: "long", day: "numeric" });

  function toggle(hour: number) {
    setUnavailable(false);
    setHours((current) => (current.includes(hour) ? current.filter((item) => item !== hour) : [...current, hour].sort((a, b) => a - b)));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    startTransition(async () => {
      try {
        const result = await saveCoachDay(data);
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onSaved(result);
      } catch {
        setError("Something went wrong.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 rounded-2xl bg-white p-4" data-day-editor={day}>
      <input type="hidden" name="dayKey" value={day} />
      <input type="hidden" name="unavailable" value={unavailable ? "yes" : "no"} />
      {unavailable ? null : hours.map((hour) => <input key={hour} type="hidden" name="hours" value={hour} />)}
      <h2 className="font-display text-2xl uppercase">{label}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Tap an hour to open that clock hour through the next one. 6 PM means 6:00–7:00 PM. Tap it again to turn that hour off.
      </p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4">
        {choices.map((hour) => {
          const on = !unavailable && hours.includes(hour);
          return (
            <button
              key={hour}
              type="button"
              aria-pressed={on}
              data-hour={hour}
              onClick={() => toggle(hour)}
              className={`min-h-11 rounded-xl text-sm font-semibold ${on ? "bg-primary text-white" : "bg-muted"}`}
            >
              {formatHourLabel(hour)}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        aria-pressed={unavailable}
        onClick={() => {
          setUnavailable(true);
          setHours([]);
        }}
        className={`mt-3 min-h-11 w-full rounded-xl px-4 text-sm font-semibold sm:w-auto ${
          unavailable ? "bg-ink text-white" : "bg-muted"
        }`}
      >
        Not available
      </button>
      {error ? <p className="mt-3 text-sm font-semibold text-primary">{error}</p> : null}
      <div className="mt-4">
        <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
          {pending ? "Saving" : "Save this day"}
        </Button>
      </div>
    </form>
  );
}

export function CoachAvailability({
  month,
  minMonth,
  maxMonth,
  todayKey,
  initialDay,
  days,
}: {
  month: string;
  minMonth: string;
  maxMonth: string;
  todayKey: string;
  initialDay: string;
  days: Record<string, DayOpening>;
}) {
  const [currentMonth, setCurrentMonth] = useState(month);
  const [day, setDay] = useState(initialDay);
  const [savedDays, setSavedDays] = useState(days);
  const [notice, setNotice] = useState("");

  const marked = Object.entries(savedDays)
    .filter(([, value]) => !value.unavailable && value.hours.length > 0)
    .map(([key]) => key);

  function showMonth(next: string) {
    setCurrentMonth(next);
    setNotice("");
    const keys = dayKeysForMonth(next);
    setDay(keys.find((key) => key >= todayKey) ?? keys[0] ?? "");
  }

  return (
    <div data-availability-month={currentMonth}>
      {notice ? <p className="mb-3 text-sm font-semibold text-primary">{notice}</p> : null}
      <MonthCalendar
        month={currentMonth}
        minMonth={minMonth}
        maxMonth={maxMonth}
        todayKey={todayKey}
        selected={day}
        marked={marked}
        onSelect={(next) => {
          setDay(next);
          setNotice("");
        }}
        onMonth={showMonth}
      />
      {day ? (
        <DayEditor
          key={day}
          day={day}
          saved={savedDays[day]}
          onSaved={(result) => {
            setSavedDays((current) => ({
              ...current,
              [result.dayKey]: { unavailable: result.unavailable, hours: result.hours },
            }));
            setNotice("Saved this day.");
          }}
        />
      ) : null}
    </div>
  );
}
