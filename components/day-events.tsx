import Link from "next/link";
import type { CalendarBlock } from "@/components/month-calendar";
import { etToUtc, formatEt } from "@/lib/time";

export function DayEventsPanel({ dayKey, events }: { dayKey: string; events: CalendarBlock[] }) {
  if (!dayKey) return null;
  const rows = events
    .filter((event) => event.dayKey === dayKey)
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  const heading = formatEt(etToUtc(dayKey, "12:00"), { weekday: "long", month: "long", day: "numeric" });

  return (
    <section className="mt-4 rounded-2xl bg-white p-4" data-day-panel={dayKey}>
      <h3 className="font-display text-2xl uppercase">{heading}</h3>
      {rows.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">No events this day.</p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((event) => {
            const body = (
              <div className="min-w-0">
                <p className="text-sm font-semibold" data-event-time>
                  {event.when}
                  {event.canceled ? " · Canceled" : ""}
                </p>
                <p className={`mt-1 font-display text-xl uppercase leading-none ${event.canceled ? "line-through" : ""}`} data-event-training>
                  {event.program}
                </p>
                <p className="mt-2 text-sm" data-event-coach>
                  {event.coaches || "No coach"}
                </p>
                <p className="text-sm text-muted-foreground" data-event-location>
                  {event.location}
                </p>
                {event.note ? (
                  <p className="mt-2 text-sm font-semibold" data-event-note>
                    {event.note}
                  </p>
                ) : null}
              </div>
            );
            return (
              <li
                key={event.id}
                data-day-event={event.id}
                data-canceled={event.canceled ? "yes" : "no"}
                className="rounded-xl border border-border border-l-4 p-3"
                style={{ borderLeftColor: event.color, opacity: event.canceled ? 0.55 : 1 }}
              >
                {event.href ? (
                  <Link href={event.href} className="block">
                    {body}
                  </Link>
                ) : (
                  body
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
