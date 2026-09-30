"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { dayStripLabel, etDayKey, formatEtTime } from "@/lib/time";

export type ScheduleSession = {
  id: string;
  kind: "GROUP" | "CAMP" | "PRIVATE";
  program: string;
  title: string;
  coach: string | null;
  startsAt: string;
  endsAt: string;
  spotsLeft: number;
  capacity: number;
  priceCents: number;
  location: string;
};

const kinds = [
  { id: "ALL", label: "All" },
  { id: "GROUP", label: "Group" },
  { id: "CAMP", label: "Camp" },
  { id: "PRIVATE", label: "Private" },
] as const;

export function ScheduleBoard({
  sessions,
  dayKeys,
  initialProgram = "",
  initialCoach = "",
}: {
  sessions: ScheduleSession[];
  dayKeys: string[];
  initialProgram?: string;
  initialCoach?: string;
}) {
  const [day, setDay] = useState(dayKeys[0] ?? "");
  const [kind, setKind] = useState<(typeof kinds)[number]["id"]>("ALL");
  const [program, setProgram] = useState(initialProgram);
  const [coach, setCoach] = useState(initialCoach);

  const programs = useMemo(() => {
    return Array.from(new Set(sessions.map((session) => session.program)));
  }, [sessions]);

  const visible = sessions.filter((session) => {
    const key = etDayKey(new Date(session.startsAt));
    if (key !== day) return false;
    if (kind !== "ALL" && session.kind !== kind) return false;
    if (program && session.program !== program) return false;
    if (coach && session.coach !== coach) return false;
    return true;
  });

  return (
    <div>
      <div className="flex gap-2 overflow-x-auto pb-2" aria-label="Session type">
        {kinds.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setKind(item.id)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
              kind === item.id ? "bg-primary text-white" : "bg-white text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-3 flex gap-2 overflow-x-auto pb-2" aria-label="Program">
        <button
          type="button"
          onClick={() => setProgram("")}
          className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
            program === "" ? "bg-ink text-white" : "bg-white"
          }`}
        >
          All programs
        </button>
        {programs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setProgram(item)}
            className={`min-h-11 shrink-0 rounded-full px-4 text-sm font-semibold ${
              program === item ? "bg-ink text-white" : "bg-white"
            }`}
          >
            {item}
          </button>
        ))}
      </div>
      {coach ? (
        <button type="button" className="mt-2 text-sm font-semibold text-primary" onClick={() => setCoach("")}>
          Showing {coach}. Clear coach filter.
        </button>
      ) : null}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-2" aria-label="Dates">
        {dayKeys.map((key) => {
          const label = dayStripLabel(key);
          const count = sessions.filter((session) => etDayKey(new Date(session.startsAt)) === key).length;
          const selected = key === day;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setDay(key)}
              className={`min-w-16 shrink-0 rounded-xl px-3 py-2 text-center ${
                selected ? "bg-primary text-white" : "bg-white"
              }`}
            >
              <span className="block text-[11px] font-semibold tracking-wide">{label.weekday}</span>
              <span className="block text-sm font-semibold">{label.date}</span>
              <span className={`mt-1 block h-1.5 w-1.5 rounded-full mx-auto ${count ? (selected ? "bg-white" : "bg-primary") : "bg-transparent"}`} />
            </button>
          );
        })}
      </div>
      <div className="mt-4 space-y-3">
        {visible.length === 0 ? (
          <p className="rounded-xl bg-white p-5 text-sm text-muted-foreground">
            No sessions this day for these filters. Try another date, or call 727-744-6880 and the academy will post the next one.
          </p>
        ) : (
          visible.map((session) => {
            const soldOut = session.spotsLeft <= 0;
            const body = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Badge>{session.kind === "GROUP" ? "Group" : session.kind === "CAMP" ? "Camp" : "Private"}</Badge>
                    <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{session.program}</p>
                    <h3 className="font-display text-2xl uppercase leading-none">{session.title}</h3>
                    {session.coach ? <p className="mt-1 text-sm">{session.coach}</p> : null}
                  </div>
                  <p className="text-right font-display text-2xl">{formatMoney(session.priceCents)}</p>
                </div>
                <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                  <p>
                    {formatEtTime(new Date(session.startsAt))}–{formatEtTime(new Date(session.endsAt))} ET
                  </p>
                  <p className={soldOut ? "font-semibold text-primary" : "font-semibold"}>
                    {soldOut ? "Sold out" : `${session.spotsLeft} spot${session.spotsLeft === 1 ? "" : "s"} left`}
                  </p>
                </div>
              </>
            );
            if (soldOut) {
              return (
                <article key={session.id} className="rounded-2xl border border-border bg-white p-4 opacity-70">
                  {body}
                </article>
              );
            }
            return (
              <Link key={session.id} href={`/book/${session.id}`} className="block rounded-2xl border border-border bg-white p-4 shadow-sm active:scale-[0.99]">
                {body}
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
