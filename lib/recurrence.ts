import { weekdayIndexForDayKey } from "@/lib/availability";
import { addDays, addMonthsToDay, dayKeysForMonth, daysBetween } from "@/lib/time";

export type RepeatKind =
  | "none"
  | "daily"
  | "every-n-days"
  | "weekly"
  | "every-n-weeks"
  | "monthly-date"
  | "monthly-weekday"
  | "yearly";

export type SeriesEndMode = "never" | "on" | "after";

export type RepeatRule = {
  kind: RepeatKind;
  interval: number;
  weekdays: number[];
  ordinal: number;
  weekday: number;
  ends: SeriesEndMode;
  until: string;
  count: number;
};

export const REPEAT_OPTIONS: { value: RepeatKind; label: string }[] = [
  { value: "none", label: "Does not repeat" },
  { value: "daily", label: "Daily" },
  { value: "every-n-days", label: "Every N days" },
  { value: "weekly", label: "Weekly on chosen weekdays" },
  { value: "every-n-weeks", label: "Every N weeks on chosen weekdays" },
  { value: "monthly-date", label: "Monthly on the same date" },
  { value: "monthly-weekday", label: "Monthly on the first, second, third, fourth, or last chosen weekday" },
  { value: "yearly", label: "Yearly on the same date" },
];

export const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
export const WEEKDAY_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const ORDINAL_WORDS: Record<number, string> = {
  1: "first",
  2: "second",
  3: "third",
  4: "fourth",
  [-1]: "last",
};

export function ordinalInMonth(dayKey: string) {
  const weekday = weekdayIndexForDayKey(dayKey);
  const matches = dayKeysForMonth(dayKey.slice(0, 7)).filter((key) => weekdayIndexForDayKey(key) === weekday);
  const index = matches.indexOf(dayKey);
  if (index === -1) return 1;
  if (index === matches.length - 1 && index >= 3) return -1;
  return index + 1;
}

export function defaultRule(dayKey: string): RepeatRule {
  const weekday = weekdayIndexForDayKey(dayKey);
  return {
    kind: "none",
    interval: 2,
    weekdays: [weekday],
    ordinal: ordinalInMonth(dayKey),
    weekday,
    ends: "never",
    until: addMonthsToDay(dayKey, 3),
    count: 10,
  };
}

export function repeatSummary(rule: RepeatRule) {
  const days = [...rule.weekdays].sort((a, b) => a - b).map((day) => WEEKDAY_NAMES[day] ?? "");
  const dayList = days.length === 0 ? "the chosen weekdays" : days.join(", ");
  if (rule.kind === "none") return "Does not repeat";
  if (rule.kind === "daily") return "Daily";
  if (rule.kind === "every-n-days") return `Every ${Math.max(1, rule.interval)} days`;
  if (rule.kind === "weekly") return `Weekly on ${dayList}`;
  if (rule.kind === "every-n-weeks") return `Every ${Math.max(1, rule.interval)} weeks on ${dayList}`;
  if (rule.kind === "monthly-date") return "Monthly on the same date";
  if (rule.kind === "yearly") return "Yearly on the same date";
  const which = ORDINAL_WORDS[rule.ordinal] ?? "first";
  return `Monthly on the ${which} ${WEEKDAY_NAMES[rule.weekday] ?? "day"}`;
}

export function endSummary(rule: RepeatRule) {
  if (rule.kind === "none") return "";
  if (rule.ends === "on") return `Ends ${rule.until}`;
  if (rule.ends === "after") return `Ends after ${rule.count} times`;
  return "Continues";
}

function laterDay(left: string, right: string) {
  return left > right ? left : right;
}

function dayInMonth(monthKey: string, dayOfMonth: number) {
  const [year, month] = monthKey.split("-").map(Number);
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (dayOfMonth > last) return "";
  return `${monthKey}-${String(dayOfMonth).padStart(2, "0")}`;
}

function nthWeekday(monthKey: string, weekday: number, ordinal: number) {
  const matches = dayKeysForMonth(monthKey).filter((key) => weekdayIndexForDayKey(key) === weekday);
  if (matches.length === 0) return "";
  if (ordinal === -1) return matches[matches.length - 1] ?? "";
  return matches[ordinal - 1] ?? "";
}

function weekStart(dayKey: string) {
  return addDays(dayKey, -weekdayIndexForDayKey(dayKey));
}

/**
 * Calendar days for a series, starting on or after `start`.
 * A series with no end is filled through six months from today or from the start, whichever is later.
 */
export function occurrenceDays(start: string, rule: RepeatRule, today: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) return [];
  if (rule.kind === "none") return [start];

  const cap = 500;
  const wanted = rule.ends === "after" ? Math.min(Math.max(1, rule.count), cap) : cap;
  const horizon =
    rule.ends === "on"
      ? rule.until
      : rule.ends === "never"
        ? laterDay(addMonthsToDay(start, 6), addMonthsToDay(today, 6))
        : addMonthsToDay(start, rule.kind === "yearly" ? wanted * 12 + 1 : 240);
  const out: string[] = [];

  const push = (day: string) => {
    if (!day || day < start) return false;
    if (rule.ends !== "after" && day > horizon) return false;
    if (out.includes(day)) return true;
    out.push(day);
    return out.length < wanted && (rule.ends === "after" || day < horizon);
  };

  if (rule.kind === "daily" || rule.kind === "every-n-days") {
    const step = rule.kind === "daily" ? 1 : Math.max(1, rule.interval);
    for (let index = 0; index < cap; index += 1) {
      const day = addDays(start, index * step);
      if (rule.ends !== "after" && day > horizon) break;
      push(day);
      if (out.length >= wanted) break;
    }
    return out;
  }

  if (rule.kind === "weekly" || rule.kind === "every-n-weeks") {
    const step = rule.kind === "weekly" ? 1 : Math.max(1, rule.interval);
    const days = (rule.weekdays.length > 0 ? rule.weekdays : [weekdayIndexForDayKey(start)]).slice().sort((a, b) => a - b);
    const firstWeek = weekStart(start);
    for (let week = 0; week < 600; week += step) {
      const startOfWeek = addDays(firstWeek, week * 7);
      if (rule.ends !== "after" && startOfWeek > addDays(horizon, 7)) break;
      for (const weekday of days) {
        const day = addDays(startOfWeek, weekday);
        if (day < start) continue;
        if (rule.ends !== "after" && day > horizon) return out;
        push(day);
        if (out.length >= wanted) return out;
      }
    }
    return out;
  }

  if (rule.kind === "monthly-date") {
    const dayOfMonth = Number(start.slice(8, 10));
    for (let month = 0; month < cap; month += 1) {
      const key = dayInMonth(addMonthsToDay(start, month).slice(0, 7), dayOfMonth);
      if (!key) continue;
      if (rule.ends !== "after" && key > horizon) break;
      push(key);
      if (out.length >= wanted) break;
    }
    return out;
  }

  if (rule.kind === "yearly") {
    const month = start.slice(5, 7);
    const dayOfMonth = Number(start.slice(8, 10));
    const year = Number(start.slice(0, 4));
    for (let index = 0; index < cap; index += 1) {
      const key = dayInMonth(`${year + index}-${month}`, dayOfMonth);
      if (!key) continue;
      if (rule.ends !== "after" && key > horizon) break;
      push(key);
      if (out.length >= wanted) break;
    }
    return out;
  }

  for (let month = 0; month < cap; month += 1) {
    const key = nthWeekday(addMonthsToDay(start, month).slice(0, 7), rule.weekday, rule.ordinal);
    if (!key) continue;
    if (rule.ends !== "after" && key > horizon) break;
    if (key < start) continue;
    push(key);
    if (out.length >= wanted) break;
  }
  return out;
}

export function assertRule(rule: RepeatRule, start: string) {
  if (rule.kind === "none") return;
  if ((rule.kind === "every-n-days" || rule.kind === "every-n-weeks") && (!Number.isInteger(rule.interval) || rule.interval < 1 || rule.interval > 365)) {
    throw new Error("Enter how many days or weeks between events, from 1 to 365.");
  }
  if ((rule.kind === "weekly" || rule.kind === "every-n-weeks") && rule.weekdays.length === 0) {
    throw new Error("Choose at least one weekday.");
  }
  if (rule.kind === "monthly-weekday" && ![1, 2, 3, 4, -1].includes(rule.ordinal)) {
    throw new Error("Choose the first, second, third, fourth, or last weekday.");
  }
  if (rule.ends === "on") {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(rule.until)) throw new Error("Choose the date the series ends.");
    if (rule.until < start) throw new Error("The end date has to be on or after the first event.");
  }
  if (rule.ends === "after" && (!Number.isInteger(rule.count) || rule.count < 1 || rule.count > 500)) {
    throw new Error("End after 1 to 500 times.");
  }
  if (daysBetween(start, rule.ends === "on" ? rule.until : start) < 0) {
    throw new Error("Choose a start date.");
  }
}
