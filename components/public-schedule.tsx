"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { bookPrivateQuarterbackHour } from "@/app/(public)/private-lesson";
import { CalendarLegend, legendItems } from "@/components/calendar-legend";
import { DayEventsPanel } from "@/components/day-events";
import { MonthCalendar, type CalendarBlock } from "@/components/month-calendar";
import { type OpeningsByCoach } from "@/lib/availability";
import { INTRO_KEY, INTRO_LABEL, INTRO_NOTE, INTRO_PRICE_CENTS, isIntro } from "@/lib/intro";
import { formatMoney } from "@/lib/money";
import {
  PRIVATE_QUARTERBACK_KEY,
  PRIVATE_QUARTERBACK_LABEL,
  coachHasLogin,
  SPEED_PROGRAM,
  isPrivateQuarterback,
  openPrivateHours,
  type OpenPrivateHour,
  type PrivateHourSession,
} from "@/lib/private-quarterback";
import { colorForProgram, type PlanColorSource } from "@/lib/plan-options";
import { offeringKey, offeringLabel, offeringRank, openSessions, sessionCoachNames } from "@/lib/schedule-filter";
import { dayKeysForMonth, etDayKey, etToUtc, formatEt, formatEtTime } from "@/lib/time";

export type ScheduleSession = {
  id: string;
  kind: "GROUP" | "CAMP" | "PRIVATE";
  program: string;
  title: string;
  coach: string | null;
  coaches: string[];
  status: "SCHEDULED" | "CANCELED";
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

function possessive(name: string) {
  return /s$/i.test(name) ? `${name}'` : `${name}'s`;
}

function sessionBlock(session: ScheduleSession, plans: PlanColorSource[]): CalendarBlock {
  const color = colorForProgram(session.program, plans);
  const start = new Date(session.startsAt);
  const end = new Date(session.endsAt);
  return {
    id: session.id,
    dayKey: etDayKey(start),
    title: session.title,
    time: formatEtTime(start),
    when: `${formatEtTime(start)}–${formatEtTime(end)} ET`,
    startsAt: session.startsAt,
    program: session.program,
    coaches: sessionCoachNames(session).join(", "),
    location: session.location,
    color: color.hex,
    colorId: color.id,
    canceled: session.status === "CANCELED",
    href: session.status === "CANCELED" ? undefined : `/book/${session.id}`,
  };
}

export type PrivateCoachChoice = {
  name: string;
  priceCents: number;
};

function ContinueButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 inline-flex min-h-12 w-full items-center justify-center rounded-full bg-ink px-5 text-base font-semibold text-white disabled:opacity-60"
    >
      {pending ? "Opening checkout" : "Continue"}
    </button>
  );
}

function PrivateHourForm({
  coach,
  day,
  slots,
  prices,
  showDate,
}: {
  coach: string;
  day: string;
  slots: OpenPrivateHour[];
  prices: number[];
  showDate: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const same = prices.length > 0 && prices.every((price) => price === prices[0]);
  const heading = showDate
    ? formatEt(etToUtc(day, "12:00"), { weekday: "long", month: "long", day: "numeric" })
    : "Open times";

  return (
    <form action={bookPrivateQuarterbackHour} className="mt-4 rounded-2xl bg-white p-4" data-times="hours">
      <input type="hidden" name="coach" value={coach} />
      <input type="hidden" name="day" value={day} />
      <h3 className="font-display text-2xl uppercase">{heading}</h3>
      {same ? <p className="mt-1 text-sm font-semibold">{formatMoney(prices[0])}</p> : null}
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((slot, index) => {
          const start = new Date(slot.startsAt);
          const end = new Date(slot.endsAt);
          const on = selected === slot.hour;
          return (
            <label
              key={slot.hour}
              className={`flex min-h-11 cursor-pointer flex-col items-center justify-center rounded-xl px-2 text-center text-sm font-semibold ${on ? "bg-primary text-white" : "bg-muted"}`}
            >
              <input
                type="radio"
                name="hour"
                value={slot.hour}
                data-hour={slot.hour}
                required
                checked={on}
                onChange={() => setSelected(slot.hour)}
                className="sr-only"
              />
              {formatEtTime(start)}–{formatEtTime(end)}
              {same ? null : <span className="mt-0.5 text-xs font-semibold">{formatMoney(prices[index] ?? 0)}</span>}
            </label>
          );
        })}
      </div>
      <ContinueButton />
    </form>
  );
}

export function PublicSchedule({
  sessions,
  todayKey,
  currentMonth,
  maxMonth,
  openings,
  portraits,
  privateCoaches,
  nowIso,
  initialOffering = "",
  initialCoach = "",
  initialStep = 1,
  speedPrices = {},
  savedPrivatePrices = {},
  plans = [],
  children,
}: {
  sessions: ScheduleSession[];
  todayKey: string;
  currentMonth: string;
  maxMonth: string;
  openings: OpeningsByCoach;
  portraits: Record<string, string>;
  privateCoaches: PrivateCoachChoice[];
  nowIso: string;
  initialOffering?: string;
  initialCoach?: string;
  initialStep?: 1 | 2 | 3;
  /** Saved public speed prices, keyed by coach. Missing means the session price. */
  speedPrices?: Record<string, number>;
  /** Saved private quarterback prices. Missing means the lesson keeps its own price. */
  savedPrivatePrices?: Record<string, number>;
  plans?: PlanColorSource[];
  children?: ReactNode;
}) {
  const [step, setStep] = useState<1 | 2 | 3>(initialStep);
  const [offeringId, setOfferingId] = useState(initialOffering);
  const [coach, setCoach] = useState(initialCoach);
  const [showGroups, setShowGroups] = useState(false);
  const [groupMonth, setGroupMonth] = useState(currentMonth);
  const [groupDay, setGroupDay] = useState("");
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState("");

  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const bookable = useMemo(() => openSessions(sessions, openings), [sessions, openings]);
  const offerings = useMemo(() => {
    const rows = new Map<string, { id: string; label: string; rank: number }>();
    for (const session of bookable) {
      const id = offeringKey(session);
      if (!rows.has(id)) rows.set(id, { id, label: offeringLabel(session), rank: offeringRank(session) });
    }
    if (privateCoaches.length > 0 && !rows.has(PRIVATE_QUARTERBACK_KEY)) {
      rows.set(PRIVATE_QUARTERBACK_KEY, { id: PRIVATE_QUARTERBACK_KEY, label: PRIVATE_QUARTERBACK_LABEL, rank: 0 });
    }
    if (!rows.has(INTRO_KEY)) {
      rows.set(INTRO_KEY, { id: INTRO_KEY, label: INTRO_LABEL, rank: 2 });
    }
    return Array.from(rows.values()).sort((a, b) => a.rank - b.rank || a.label.localeCompare(b.label));
  }, [bookable, privateCoaches.length]);

  const coachesForOffering = useMemo(() => {
    const order = Object.keys(portraits);
    const prices = new Map<string, number[]>();
    for (const session of bookable) {
      if (offeringKey(session) !== offeringId) continue;
      for (const name of sessionCoachNames(session)) {
        const list = prices.get(name) ?? [];
        const speed = offeringId === `program:${SPEED_PROGRAM}` ? speedPrices[name] : undefined;
        list.push(speed ?? session.priceCents);
        prices.set(name, list);
      }
    }
    return Array.from(prices.entries())
      .map(([name, cents]) => ({ name, price: priceLabel(cents), photo: portraits[name] ?? "" }))
      .sort((a, b) => {
        const ai = order.indexOf(a.name);
        const bi = order.indexOf(b.name);
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.name.localeCompare(b.name);
      });
  }, [bookable, offeringId, portraits, speedPrices]);

  const offering = offerings.find((item) => item.id === offeringId);
  const privateBooking = offeringId === PRIVATE_QUARTERBACK_KEY;
  const usesAvailability = privateBooking && coachHasLogin(openings, coach);
  const onThisCoach = (session: ScheduleSession) =>
    offeringKey(session) === offeringId && sessionCoachNames(session).includes(coach);
  const chosen = bookable.filter(onThisCoach);
  const canceledChosen = sessions.filter((session) => session.status === "CANCELED" && onThisCoach(session));
  const privatePrice = privateCoaches.find((person) => person.name === coach)?.priceCents ?? 0;
  const monthDays = useMemo(() => dayKeysForMonth(month), [month]);
  const counts = useMemo(() => {
    const tally: Record<string, number> = {};
    if (usesAvailability) {
      const slots = sessions as PrivateHourSession[];
      for (const key of monthDays) {
        if (key < todayKey) continue;
        const open = openPrivateHours({ coach, dayKey: key, openings, sessions: slots, now });
        if (open.length > 0) tally[key] = open.length;
      }
      return tally;
    }
    for (const session of [...chosen, ...canceledChosen]) {
      const key = etDayKey(new Date(session.startsAt));
      if (!monthDays.includes(key) || key < todayKey) continue;
      tally[key] = (tally[key] ?? 0) + 1;
    }
    return tally;
  }, [usesAvailability, coach, openings, sessions, now, chosen, canceledChosen, monthDays, todayKey]);
  const dayHours = useMemo(() => {
    if (!usesAvailability || !day) return [];
    return openPrivateHours({
      coach,
      dayKey: day,
      openings,
      sessions: sessions as PrivateHourSession[],
      now,
    });
  }, [usesAvailability, day, coach, openings, sessions, now]);

  function pickOffering(id: string) {
    if (id !== offeringId) {
      setCoach("");
      setDay("");
      setMonth(currentMonth);
    }
    setGroupDay("");
    setOfferingId(id);
    setStep(2);
  }

  function pickCoach(name: string) {
    if (name !== coach) {
      setDay("");
      setMonth(currentMonth);
    }
    setCoach(name);
    setShowGroups(false);
    setStep(3);
  }

  function back() {
    setDay("");
    if (step === 3) setStep(2);
    else {
      setGroupDay("");
      setStep(1);
    }
  }

  const question =
    step === 1 ? "Choose your training" : step === 2 ? "Choose your coach" : day ? "Choose a time" : coach ? `${possessive(coach)} calendar` : "Choose a day";
  const trail = offering && step > 1 ? offering.label : "";
  const coachPhoto = portraits[coach] ?? "";
  const scopedTraining = step > 1 ? offeringId : "";
  const groupBlocks = useMemo<CalendarBlock[]>(() => {
    return sessions
      .filter((session) => {
        if (session.kind !== "GROUP" || isIntro(session) || sessionCoachNames(session).length === 0) return false;
        return !scopedTraining || offeringKey(session) === scopedTraining;
      })
      .map((session) => sessionBlock(session, plans));
  }, [sessions, scopedTraining, plans]);
  const coachBlocks = useMemo<CalendarBlock[]>(() => {
    if (!coach) return [];
    return sessions
      .filter((session) => {
        if (isIntro(session)) return false;
        if (session.kind !== "GROUP" && session.kind !== "PRIVATE" && session.kind !== "CAMP") return false;
        if (offeringId && offeringKey(session) !== offeringId) return false;
        return sessionCoachNames(session).includes(coach);
      })
      .map((session) => {
        const block = sessionBlock(session, plans);
        if (session.status === "CANCELED") return block;
        const price =
          session.program === SPEED_PROGRAM && speedPrices[coach] != null
            ? speedPrices[coach]
            : isPrivateQuarterback(session) && savedPrivatePrices[coach] != null
              ? savedPrivatePrices[coach]
              : session.priceCents;
        const spots = session.spotsLeft;
        return {
          ...block,
          note: `${formatMoney(price)} · ${spots} spot${spots === 1 ? "" : "s"} left`,
        };
      });
  }, [sessions, coach, offeringId, plans, speedPrices, savedPrivatePrices]);
  const openHourIds = new Set(dayHours.flatMap((slot) => (slot.sessionId ? [slot.sessionId] : [])));
  const dayExtras = coachBlocks.filter((event) => event.dayKey === day && !openHourIds.has(event.id));

  return (
    <>
      <section id="schedule" className="mt-6 scroll-mt-24" data-step={step}>
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-4xl uppercase leading-none">{question}</h2>
          <p className="text-sm text-muted-foreground">{step} of 3</p>
        </div>
        {trail ? <p className="mt-2 text-sm text-muted-foreground">{trail}</p> : null}
        {step > 1 ? (
          <button
            type="button"
            onClick={back}
            className="mt-3 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-base font-semibold text-white"
          >
            Back
          </button>
        ) : null}
        {step === 3 && coach ? (
          <div data-selected-coach={coach} className="mt-4 flex items-center gap-4 rounded-2xl border-2 border-primary bg-white p-4">
            {coachPhoto ? (
              <img src={coachPhoto} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover object-top" />
            ) : (
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xl">
                {initials(coach)}
              </span>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Selected coach</p>
              <p className="font-display text-3xl uppercase leading-none">{coach}</p>
              <p className="mt-1 text-sm">You&apos;re on {possessive(coach)} calendar.</p>
            </div>
          </div>
        ) : null}
        {step === 1 ? (
          offerings.length === 0 ? (
            <p className="mt-4 rounded-2xl bg-white p-5 text-sm text-muted-foreground">
              Nothing is open on the schedule right now. Call 727-744-6880 and the academy will post the next session.
            </p>
          ) : (
            <div className="mt-4 grid gap-3">
              {offerings.map((item) =>
                item.id === INTRO_KEY ? (
                  <Link
                    key={item.id}
                    href="/book/intro"
                    data-offering={item.label}
                    className="block min-h-14 rounded-2xl bg-white px-4 py-4 text-left"
                  >
                    <span className="block font-display text-2xl uppercase leading-none">{item.label}</span>
                    <span className="mt-2 block text-sm leading-snug text-muted-foreground">{INTRO_NOTE} {formatMoney(INTRO_PRICE_CENTS)}.</span>
                  </Link>
                ) : (
                  <button
                    key={item.id}
                    type="button"
                    data-offering={item.label}
                    onClick={() => pickOffering(item.id)}
                    className="min-h-14 rounded-2xl bg-white px-4 py-4 text-left"
                  >
                    <span className="block font-display text-2xl uppercase leading-none">{item.label}</span>
                  </button>
                ),
              )}
            </div>
          )
        ) : null}

        {step === 2 && coachesForOffering.length === 0 && !privateBooking ? (
          <p className="mt-4 rounded-2xl bg-white p-5 text-sm text-muted-foreground">None are on the calendar yet.</p>
        ) : null}

        {step === 2 && (privateBooking || coachesForOffering.length > 0) ? (
          <div className="mt-4 grid gap-3">
            {(privateBooking ? privateCoaches.map((person) => ({
              name: person.name,
              price: formatMoney(person.priceCents),
              photo: portraits[person.name] ?? "",
            })) : coachesForOffering).map((person) => (
              <button
                key={person.name}
                type="button"
                data-coach={person.name}
                data-price={person.price}
                aria-pressed={person.name === coach}
                onClick={() => pickCoach(person.name)}
                className={`flex min-h-20 items-center gap-4 rounded-2xl bg-white p-3 text-left ${person.name === coach ? "ring-2 ring-primary" : ""}`}
              >
                {person.photo ? (
                  <img src={person.photo} alt="" className="h-16 w-16 shrink-0 rounded-full object-cover object-top" />
                ) : (
                  <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-muted font-display text-xl">
                    {initials(person.name)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block font-display text-2xl uppercase leading-none">{person.name}</span>
                  <span className="mt-1 block text-sm font-semibold">{person.price}</span>
                </span>
                {person.name === coach ? (
                  <span className="shrink-0 text-xs font-semibold uppercase tracking-wide text-primary">Selected</span>
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        {step === 3 ? (
          <div className="mt-4">
            <CalendarLegend items={legendItems(coachBlocks.filter((block) => block.dayKey.startsWith(month)))} />
            <MonthCalendar
              month={month}
              minMonth={currentMonth}
              maxMonth={maxMonth}
              todayKey={todayKey}
              selected={day}
              marked={Object.keys(counts)}
              counts={counts}
              onlyOpen
              events={coachBlocks}
              onSelect={setDay}
              onMonth={(next) => {
                setMonth(next);
                setDay("");
              }}
            />
            {Object.keys(counts).length === 0 && coachBlocks.every((block) => !block.dayKey.startsWith(month)) ? (
              <p className="mt-4 text-sm text-muted-foreground">No open days this month.</p>
            ) : null}
            {day && usesAvailability ? (
              <>
                {dayExtras.length > 0 ? <DayEventsPanel dayKey={day} events={dayExtras} /> : null}
                {dayHours.length > 0 ? (
                  <PrivateHourForm
                    coach={coach}
                    day={day}
                    slots={dayHours}
                    showDate={dayExtras.length === 0}
                    prices={dayHours.map((slot) => {
                      const existing = sessions.find((session) => session.id === slot.sessionId);
                      return savedPrivatePrices[coach] ?? existing?.priceCents ?? privatePrice;
                    })}
                  />
                ) : dayExtras.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">No open times this day.</p>
                ) : null}
              </>
            ) : (
              <DayEventsPanel dayKey={day} events={coachBlocks} />
            )}
          </div>
        ) : null}
        {step < 3 ? (
          <div className="mt-6">
            <button
              type="button"
              aria-expanded={showGroups}
              onClick={() => setShowGroups((open) => !open)}
              className="inline-flex min-h-11 items-center text-sm font-semibold text-primary"
            >
              {showGroups ? "Hide group schedule" : "Group schedule"}
            </button>
            {showGroups ? (
              <div className="mt-4" data-group-schedule="open">
                <h3 className="font-display text-3xl uppercase">Group schedule</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {scopedTraining
                    ? "Only the training you chose. Go back to see the others. Tap a day to list it under the calendar. Canceled sessions stay faded."
                    : "Group sessions on the month. Choose a training and this calendar keeps only that training. Tap a day to list it under the calendar."}
                </p>
                <div className="mt-3">
                  <CalendarLegend items={legendItems(groupBlocks.filter((block) => block.dayKey.startsWith(groupMonth)))} />
                  <MonthCalendar
                    month={groupMonth}
                    minMonth={currentMonth}
                    maxMonth={maxMonth}
                    todayKey={todayKey}
                    selected={groupDay}
                    marked={[]}
                    events={groupBlocks}
                    onSelect={setGroupDay}
                    onMonth={(next) => {
                      setGroupMonth(next);
                      setGroupDay("");
                    }}
                  />
                  {groupBlocks.every((block) => !block.dayKey.startsWith(groupMonth)) ? (
                    <p className="mt-3 text-sm text-muted-foreground">No group sessions this month.</p>
                  ) : null}
                  <DayEventsPanel dayKey={groupDay} events={groupBlocks} />
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
      {step === 1 ? children : null}
    </>
  );
}
