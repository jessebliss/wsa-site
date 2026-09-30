export const TZ = "America/New_York";

export function etParts(date: Date) {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const map: Record<string, string> = {};
  for (const part of dtf.formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  if (map.hour === "24") map.hour = "00";
  return map;
}

export function etDayKey(date: Date) {
  const parts = etParts(date);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function tzOffsetMs(instant: Date) {
  const parts = etParts(instant);
  const asUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour),
    Number(parts.minute),
    Number(parts.second),
  );
  return asUtc - instant.getTime();
}

/** Interpret a calendar date and clock time as Eastern Time and return UTC. */
export function etToUtc(date: string, time: string) {
  const utcGuess = new Date(`${date}T${time}:00Z`);
  const offset = tzOffsetMs(utcGuess);
  const adjusted = new Date(utcGuess.getTime() - offset);
  const second = tzOffsetMs(adjusted);
  if (second !== offset) return new Date(utcGuess.getTime() - second);
  return adjusted;
}

export function upcomingDayKeys(count: number) {
  const keys: string[] = [];
  let cursor = etToUtc(etDayKey(new Date()), "15:00");
  for (let i = 0; i < count; i += 1) {
    keys.push(etDayKey(cursor));
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }
  return keys;
}

export function rangeForDayKeys(keys: string[]) {
  const start = etToUtc(keys[0], "00:00");
  const last = etToUtc(keys[keys.length - 1], "00:00");
  const end = new Date(last.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

export function formatEt(date: Date, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { timeZone: TZ, ...options }).format(date);
}

export function formatEtTime(date: Date) {
  return formatEt(date, { hour: "numeric", minute: "2-digit" });
}

export function formatEtDate(date: Date) {
  return formatEt(date, { weekday: "short", month: "short", day: "numeric" });
}

export function formatEtLong(date: Date) {
  return formatEt(date, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function dayStripLabel(key: string) {
  const noon = etToUtc(key, "12:00");
  return {
    weekday: formatEt(noon, { weekday: "short" }).toUpperCase(),
    date: formatEt(noon, { month: "short", day: "numeric" }),
  };
}

export function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}
