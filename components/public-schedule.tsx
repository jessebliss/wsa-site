"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { MonthCalendar } from "@/components/month-calendar";
import { Badge } from "@/components/ui/badge";
import { type OpeningsByCoach } from "@/lib/availability";
import { formatMoney } from "@/lib/money";
import { offeringKey, offeringLabel, offeringRank, openSessions, sessionsOnDay } from "@/lib/schedule-filter";
import { dayKeysForMonth, etDayKey, etToUtc, formatEt, formatEtTime } from "@/lib/time";

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

function priceLabel(cents: number[]) {
  const unique = Array.from(new Set(cents)).sort((a, b) => a - b);
  if (unique.length === 0) return "";
  if (unique.length === 1) return formatMoney(unique[0]);
  return `${formatMoney(unique[0])}–${formatMoney(unique[unique.length - 1])}`;
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("");
}

export function PublicSchedule({
  sessions,
  todayKey,
  currentMonth,
  maxMonth,
  openings,
  portraits,
  children,
}: {
  sessions: ScheduleSession[];
  todayKey: string;
  currentMonth: string;
  maxMonth: string;
  openings: OpeningsByCoach;
  portraits: Record<string, string>;
  children?: ReactNode;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [offeringId, setOfferingId] = useState("");
  const [coach, setCoach] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState("");

  const bookable = useMemo(() => openSessions(sessions, openings), [sessions, openings]);
  const offerings = useMemo(() => {
    const rows = new Map<string, { id: string; label: string; rank: number }>();
    for (const session of bookable) {
      const id = offeringKey(session);
      if (!rows.has(id)) rows.set(id, { id, label: offeringLabel(session), rank: offeringRank(session) });
    }
    return Array.from(rows.values()).sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  }, [bookable]);

  const coachesForOffering = useMemo(() => {
    const order = Object.keys(portraits);
    const prices = new Map<string, number[]>();
    for (const session of bookable) {
      if (offeringKey(session) !== offeringId || !session.coach) continue;
      const list = prices.get(session.coach) ?? [];
      list.push(session.priceCents);
      prices.set(session.coach, list);
    }
    return Array.from(prices.entries())
      .map(([name, cents]) => ({ name, price: priceLabel(cents), photo: portraits[name] ?? "" }))
      .sort((a, b) => {
        const ai = order.indexOf(a.name);
        const bi = order.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
      });
  }, [bookable, offeringId, portraits]);

  const offering = offerings.find((item) => item.id === offeringId);
  const chosen = bookable.filter((session) => offeringKey(session) === offeringId && session.coach === coach);
  const monthDays = useMemo(() => dayKeysForMonth(month), [month]);
  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    for (const session of chosen) {
      const key = etDayKey(new Date(session.startsAt));
      if (!monthDays.includes(key) || key < todayKey) continue;
      tally[key] = (tally[key] ?? 0) + 1;
    }
    return tally;
  }, [chosen, monthDays, todayKey]);
  const daySessions = sessionsOnDay(chosen, day).sort(
    (a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime(),
  );

  function pickOffering(id: string) {
    if (id !== offeringId) {
      setCoach("");
      setDay("");
      setMonth(currentMonth);
    }
    setOfferingId(id);
    setStep(2);
  }

  function pickCoach(name: string) {
    if (name !== coach) {
      setDay("");
      setMonth(currentMonth);
    }
    setCoach(name);
    setStep(3);
  }

  function back() {
    setDay("");
    if (step === 3) setStep(2);
    else setStep(1);
  }

  const question = step === 1 ? "What do you want?" : step === 2 ? "Who do you want?" : "When?";
  const trail = [offering?.label, step === 3 ? coach : ""].filter(Boolean).join(" · ");

  return (
    <>
      <section id="schedule" className="mt-6 scroll-mt-24" data-step={step}>
        <div className="flex items-center justify-between gap-3">
          {step > 1 ? (
            <button type="button" onClick={back} className="min-h-11 px-1 text-sm font-semibold">
              Back
            </button>
          ) : (
            <span />
          )}
          <p className="text-sm text-muted-foreground">{step} of 3</p>
        </div>
        <h2 className="font-display text-4xl uppercase leading-none">{question}</h2>
        {trail ? <p className="mt-2 text-sm text-muted-foreground">{trail}</p> : null}

        {step === 1 ? (
          offerings.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-5 text-sm text-muted-foreground">
              Nothing is open on the schedule right now. Call 727-744-6880 and the academy will post the next session.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {offerings.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  data-offering={item.label}
                  onClick={() => pickOffering(item.id)}
                  className="min-h-14 rounded-2xl bg-white px-4 py-4 text-left font-display text-2xl uppercase leading-none"
                >
                  {item.label}
                </button>
              ))}
            </div>
          )
        ) : null}

        {step === 2 ? (
          <div className="mt-4 grid gap-3">
            {coachesForOffering.map((person) => (
              <button
                key={person.name}
                type="button"
                data-coach={person.name}
                data-price={person.price}
                onClick={() => pickCoach(person.name)}
                className="flex min-h-20 items-center gap-4 rounded-2xl bg-white p-3 text-left"
              >
                {person.photo ? (
                  <img src={person.photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover object-top" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xl">
                    {initials(person.name)}
                  </span>
                )}
                <span>
                  <span className="block font-display text-2xl uppercase leading-none">{person.name}</span>
                  <span className="mt-1 block text-sm font-semibold">{person.price}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4">
            <MonthCalendar
              month={month}
              minMonth={currentMonth}
              maxMonth={maxMonth}
              todayKey={todayKey}
              selected={day}
              marked={Object.keys(counts)}
              counts={counts}
              onlyOpen
              onSelect={setDay}
              onMonth={(next) => {
                setMonth(next);
                setDay("");
              }}
            />
            {Object.keys(counts).length === 0 ? (
              <p className="mt-4 text-sm text-muted-foreground">No open days this month.</p>
            ) : null}
            {day ? (
              <>
                <h3 className="mt-4 font-display text-2xl uppercase">
                  {formatEt(etToUtc(day, "12:00"), { weekday: "long", month: "long", day: "numeric" })}
                </h3>
                <div className="mt-3 space-y-3">
                  {daySessions.map((session) => (
                    <Link
                      key={session.id}
                      href={`/book/${session.id}`}
                      className="block rounded-2xl border border-border bg-white p-4 shadow-sm active:scale-[0.99]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <Badge>{session.kind === "GROUP" ? "Group" : session.kind === "CAMP" ? "Camp" : "Private"}</Badge>
                          <h4 className="mt-2 font-display text-2xl uppercase leading-none">{session.title}</h4>
                        </div>
                        <p className="text-right font-display text-2xl">{formatMoney(session.priceCents)}</p>
                      </div>
                      <div className="mt-3 flex items-end justify-between gap-3 text-sm">
                        <p>
                          {formatEtTime(new Date(session.startsAt))}–{formatEtTime(new Date(session.endsAt))} ET
                        </p>
                        <p className="font-semibold">
                          {session.spotsLeft} spot{session.spotsLeft === 1 ? "" : "s"} left
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
      {children}
    </>
  );
}
