"use client";

import { useMemo, useState } from "react";
import { saveSession } from "@/app/admin/(panel)/actions";
import { DayPicker } from "@/components/day-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { weekdayIndexForDayKey } from "@/lib/availability";
import {
  REPEAT_OPTIONS,
  WEEKDAY_NAMES,
  WEEKDAY_SHORT,
  endSummary,
  ordinalInMonth,
  repeatSummary,
  type RepeatRule,
} from "@/lib/recurrence";
import { type SessionFormValues } from "@/lib/session-defaults";

export type { SessionFormValues };

export function SessionForm({
  roster,
  values,
  minMonth,
  maxMonth,
}: {
  roster: string[];
  values: SessionFormValues;
  minMonth: string;
  maxMonth: string;
}) {
  const [kind, setKind] = useState(values.kind);
  const [date, setDate] = useState(values.date);
  const [coaches, setCoaches] = useState(values.coaches);
  const [rule, setRule] = useState(values.rule);
  const [scope, setScope] = useState("");
  const [formError, setFormError] = useState("");
  const summary = useMemo(() => [repeatSummary(rule), endSummary(rule)].filter(Boolean).join(". "), [rule]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const intent = submitter?.value || "save";
    if (values.repeating && !scope) {
      setFormError("Choose this occurrence, this and following, or the whole series.");
      return;
    }
    if (intent === "delete" && !window.confirm("Delete removes the event completely. Cancel leaves it on the calendar marked canceled.")) {
      return;
    }
    setFormError("");
    const data = new FormData(event.currentTarget);
    data.set("intent", intent);
    data.set("scope", values.repeating ? scope : "this");
    await saveSession(data);
  }

  function changeDate(next: string) {
    const previous = weekdayIndexForDayKey(date);
    const weekday = weekdayIndexForDayKey(next);
    setDate(next);
    setRule((current) => {
      const weekdays =
        current.weekdays.length === 1 && current.weekdays[0] === previous ? [weekday] : current.weekdays;
      return { ...current, weekdays, weekday, ordinal: ordinalInMonth(next) };
    });
  }

  function toggleCoach(name: string) {
    setCoaches((current) => (current.includes(name) ? current.filter((coach) => coach !== name) : [...current, name]));
  }

  function toggleWeekday(day: number) {
    setRule((current) => {
      const weekdays = current.weekdays.includes(day)
        ? current.weekdays.filter((value) => value !== day)
        : [...current.weekdays, day];
      return { ...current, weekdays };
    });
  }

  return (
    <form onSubmit={onSubmit} className="mt-4 grid gap-4 rounded-2xl bg-white p-4 sm:grid-cols-2">
      {values.id ? <input type="hidden" name="id" value={values.id} /> : null}
      <input type="hidden" name="scope" value={values.repeating ? scope : "this"} />
      <div>
        <Label htmlFor="kind">Type</Label>
        <select
          id="kind"
          name="kind"
          value={kind}
          onChange={(event) => setKind(event.target.value as SessionFormValues["kind"])}
          className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3"
        >
          <option value="GROUP">Group</option>
          <option value="CAMP">Camp</option>
          <option value="PRIVATE">Private</option>
        </select>
      </div>
      <div>
        <Label htmlFor="program">Program</Label>
        <Input className="mt-1" id="program" name="program" list="programs" required defaultValue={values.program} placeholder="Quarterback Training" />
        <datalist id="programs">
          <option value="Quarterback Training" />
          <option value="Speed & Agility" />
          <option value="Girls Flag" />
        </datalist>
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="title">Title</Label>
        <Input className="mt-1" id="title" name="title" required defaultValue={values.title} />
      </div>
      {kind === "GROUP" ? (
        <fieldset className="sm:col-span-2">
          <legend className="text-sm font-semibold">Coaches on this event</legend>
          <p className="mt-1 text-sm text-muted-foreground">
            A new group session is on every coach. Uncheck one coach, or remove all, and it leaves that calendar. The group schedule lists whoever is still on it.
          </p>
          <div className="mt-2 flex gap-2">
            <button type="button" className="text-sm font-semibold text-primary" onClick={() => setCoaches(roster)}>
              All coaches
            </button>
            <button type="button" className="text-sm font-semibold text-primary" onClick={() => setCoaches([])}>
              Remove all
            </button>
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {roster.map((name) => (
              <label key={name} className="flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm">
                <input
                  type="checkbox"
                  name="coaches"
                  value={name}
                  data-coach-option={name}
                  checked={coaches.includes(name)}
                  onChange={() => toggleCoach(name)}
                />
                {name}
              </label>
            ))}
          </div>
        </fieldset>
      ) : (
        <div className="sm:col-span-2">
          <Label htmlFor="coach">Coach</Label>
          <Input className="mt-1" id="coach" name="coach" defaultValue={values.coach} list="coach-names" />
          <datalist id="coach-names">
            {roster.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      )}
      <div className="sm:col-span-2">
        <Label htmlFor="location">Location</Label>
        <Input className="mt-1" id="location" name="location" required defaultValue={values.location} />
      </div>
      <div className="sm:col-span-2">
        <Label>Date</Label>
        <div className="mt-1">
          <DayPicker name="date" value={date} onChange={changeDate} minMonth={minMonth} maxMonth={maxMonth} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        <div>
          <Label htmlFor="start">Start</Label>
          <Input className="mt-1" id="start" name="start" type="time" required defaultValue={values.start} />
        </div>
        <div>
          <Label htmlFor="end">End</Label>
          <Input className="mt-1" id="end" name="end" type="time" required defaultValue={values.end} />
        </div>
      </div>
      <div>
        <Label htmlFor="capacity">Capacity</Label>
        <Input className="mt-1" id="capacity" name="capacity" type="number" min={1} required defaultValue={values.capacity} />
      </div>
      <div>
        <Label htmlFor="price">Price (USD)</Label>
        <Input className="mt-1" id="price" name="price" inputMode="decimal" required defaultValue={values.price} />
      </div>
      <div className="sm:col-span-2">
        <Label htmlFor="description">Description</Label>
        <Input className="mt-1" id="description" name="description" defaultValue={values.description} />
      </div>
      <div className="sm:col-span-2 grid gap-3 rounded-2xl border border-border p-3">
        <div>
          <Label htmlFor="repeat">Repeat</Label>
          <select
            id="repeat"
            name="repeat"
            value={rule.kind}
            onChange={(event) => setRule((current) => ({ ...current, kind: event.target.value as RepeatRule["kind"] }))}
            className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3"
          >
            {REPEAT_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <p className="mt-2 text-sm">{summary}</p>
        </div>
        {rule.kind === "every-n-days" || rule.kind === "every-n-weeks" ? (
          <div>
            <Label htmlFor="interval">{rule.kind === "every-n-days" ? "Days between events" : "Weeks between events"}</Label>
            <Input
              className="mt-1 max-w-32"
              id="interval"
              name="interval"
              type="number"
              min={1}
              max={365}
              value={rule.interval}
              onChange={(event) => setRule((current) => ({ ...current, interval: Number(event.target.value) }))}
            />
          </div>
        ) : (
          <input type="hidden" name="interval" value={rule.interval} />
        )}
        {rule.kind === "weekly" || rule.kind === "every-n-weeks" ? (
          <fieldset>
            <legend className="text-sm font-semibold">Weekdays</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {WEEKDAY_SHORT.map((label, index) => (
                <label
                  key={label}
                  className={`flex h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-semibold ${rule.weekdays.includes(index) ? "bg-primary text-white" : "bg-muted"}`}
                >
                  <input
                    type="checkbox"
                    name="weekdays"
                    value={index}
                    className="sr-only"
                    checked={rule.weekdays.includes(index)}
                    onChange={() => toggleWeekday(index)}
                  />
                  <span className="sr-only">{WEEKDAY_NAMES[index]}</span>
                  {label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}
        {rule.kind === "monthly-weekday" ? (
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label htmlFor="ordinal">Which one</Label>
              <select
                id="ordinal"
                name="ordinal"
                value={rule.ordinal}
                onChange={(event) => setRule((current) => ({ ...current, ordinal: Number(event.target.value) }))}
                className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3"
              >
                <option value={1}>First</option>
                <option value={2}>Second</option>
                <option value={3}>Third</option>
                <option value={4}>Fourth</option>
                <option value={-1}>Last</option>
              </select>
            </div>
            <div>
              <Label htmlFor="monthWeekday">Weekday</Label>
              <select
                id="monthWeekday"
                name="monthWeekday"
                value={rule.weekday}
                onChange={(event) => setRule((current) => ({ ...current, weekday: Number(event.target.value) }))}
                className="mt-1 h-11 w-full rounded-md border border-border bg-white px-3"
              >
                {WEEKDAY_NAMES.map((name, index) => (
                  <option key={name} value={index}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ) : null}
        {rule.kind !== "none" ? (
          <fieldset>
            <legend className="text-sm font-semibold">Ends</legend>
            <div className="mt-2 grid gap-2">
              {(
                [
                  ["never", "Continues"],
                  ["on", "On a date"],
                  ["after", "After a number of times"],
                ] as const
              ).map(([value, label]) => (
                <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="ends"
                    value={value}
                    checked={rule.ends === value}
                    onChange={() => setRule((current) => ({ ...current, ends: value }))}
                  />
                  {label}
                </label>
              ))}
            </div>
            {rule.ends === "on" ? (
              <div className="mt-3">
                <DayPicker
                  name="until"
                  value={rule.until}
                  onChange={(until) => setRule((current) => ({ ...current, until }))}
                  minMonth={minMonth}
                  maxMonth={maxMonth}
                />
              </div>
            ) : (
              <input type="hidden" name="until" value={rule.until} />
            )}
            {rule.ends === "after" ? (
              <div className="mt-3">
                <Label htmlFor="count">Number of times</Label>
                <Input
                  className="mt-1 max-w-32"
                  id="count"
                  name="count"
                  type="number"
                  min={1}
                  max={500}
                  value={rule.count}
                  onChange={(event) => setRule((current) => ({ ...current, count: Number(event.target.value) }))}
                />
              </div>
            ) : (
              <input type="hidden" name="count" value={rule.count} />
            )}
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="ends" value="never" />
            <input type="hidden" name="until" value={rule.until} />
            <input type="hidden" name="count" value={rule.count} />
          </>
        )}
      </div>
      {values.repeating ? (
        <fieldset className="sm:col-span-2 rounded-2xl border border-border p-3">
          <legend className="text-sm font-semibold">Apply to</legend>
          <p className="mt-1 text-sm text-muted-foreground">
            This event repeats. Choose whether this change, cancellation, or deletion is just this occurrence, this and following, or the whole series.
          </p>
          <div className="mt-2 grid gap-2">
            {(
              [
                ["this", "This occurrence"],
                ["following", "This and following"],
                ["all", "All events in the series"],
              ] as const
            ).map(([value, label]) => (
              <label key={value} className="flex min-h-11 items-center gap-2 text-sm">
                <input type="radio" name="scopeChoice" value={value} checked={scope === value} onChange={() => setScope(value)} required />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
      ) : null}
      {formError ? <p className="sm:col-span-2 text-sm font-semibold text-primary">{formError}</p> : null}
      <div className="sm:col-span-2 flex flex-col gap-2 sm:flex-row">
        <Button type="submit" name="intent" value="save">
          {values.id ? "Save" : "Add session"}
        </Button>
        {values.id ? (
          <Button type="submit" name="intent" value="cancel" variant="outline">
            Cancel event
          </Button>
        ) : null}
        {values.id ? (
          <Button type="submit" name="intent" value="delete" variant="outline">
            Delete event
          </Button>
        ) : null}
      </div>
      {values.id ? (
        <p className="sm:col-span-2 text-sm text-muted-foreground">
          Cancel keeps the event on the calendar marked canceled, and that time can hold another event. Delete removes it.
        </p>
      ) : null}
    </form>
  );
}
