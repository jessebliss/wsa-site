"use client";

import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { saveCoachDay } from "@/app/admin/(panel)/actions";
import { MonthCalendar } from "@/components/month-calendar";
import { Button } from "@/components/ui/button";
import { formatHourLabel, hourStartsForDay, type DayOpening } from "@/lib/availability";
import { etToUtc, formatEt } from "@/lib/time";

function SaveDayButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full sm:w-auto" disabled={pending}>
      {pending ? "Saving" : "Save this day"}
    </Button>
  );
}

function DayEditor({ day, saved }: { day: string; saved?: DayOpening }) {
  const [unavailable, setUnavailable] = useState(Boolean(saved?.unavailable));
  const [hours, setHours] = useState<number[]>(saved && !saved.unavailable ? saved.hours : []);
  const choices = hourStartsForDay(day);
  const label = formatEt(etToUtc(day, "12:00"), { weekday: "long", month: "long", day: "numeric" });

  function toggle(hour: number) {
    setUnavailable(false);
    setHours((current) => (current.includes(hour) ? current.filter((item) => item !== hour) : [...current, hour].sort((a, b) => a - b)));
  }

  return (
    <form action={saveCoachDay} className="mt-4 rounded-2xl bg-white p-4">
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
      <div className="mt-4">
        <SaveDayButton />
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
  savedNotice,
}: {
  month: string;
  minMonth: string;
  maxMonth: string;
  todayKey: string;
  initialDay: string;
  days: Record<string, DayOpening>;
  savedNotice: boolean;
}) {
  const [currentMonth, setCurrentMonth] = useState(month);
  const [day, setDay] = useState(initialDay);

  useEffect(() => {
    setCurrentMonth(month);
    setDay(initialDay);
  }, [month, initialDay]);

  const marked = Object.entries(days)
    .filter(([, value]) => !value.unavailable && value.hours.length > 0)
    .map(([key]) => key);

  return (
    <div>
      {savedNotice ? <p className="mb-3 text-sm font-semibold text-primary">Saved this day.</p> : null}
      <MonthCalendar
        month={currentMonth}
        minMonth={minMonth}
        maxMonth={maxMonth}
        todayKey={todayKey}
        selected={day}
        marked={marked}
        onSelect={setDay}
        onMonth={(next) => {
          const params = new URLSearchParams({ month: next });
          window.location.assign(`/admin/availability?${params.toString()}`);
        }}
      />
      {day ? <DayEditor key={`${day}:${savedNotice ? "saved" : "edit"}`} day={day} saved={days[day]} /> : null}
    </div>
  );
}
