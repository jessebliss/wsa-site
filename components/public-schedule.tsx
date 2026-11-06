"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useFormStatus } from "react-dom";
import { bookPrivateQuarterbackHour } from "@/app/(public)/private-lesson";
import { CalendarLegend, legendItems } from "@/components/calendar-legend";
import { DayEventsPanel } from "@/components/day-events";
import { MonthCalendar, type CalendarBlock } from "@/components/month-calendar";
import { type OpeningsByCoach } from "@/lib/availability";
import { INTRO_NOTE, INTRO_PRICE_CENTS, isIntro } from "@/lib/intro";
import { formatMoney } from "@/lib/money";
import {
  PRIVATE_QUARTERBACK_KEY,
  QUARTERBACK_PROGRAM,
  coachHasLogin,
  SPEED_PROGRAM,
  isPrivateQuarterback,
  openPrivateHours,
  type OpenPrivateHour,
  type PrivateHourSession,
} from "@/lib/private-quarterback";
import { colorForProgram, type PlanColorSource } from "@/lib/plan-options";
import { hiddenFromParentList, isPlaceholderCoach, openSessions, parentCoachNames } from "@/lib/schedule-filter";
import { dayKeysForMonth, etDayKey, etToUtc, formatEt, formatEtTime } from "@/lib/time";

export type ScheduleSession = {
  id: string;
  kind: "GROUP" | "CAMP" | "PRIVATE";
  program: string;
  typeId: string | null;
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
    coaches: parentCoachNames(session).join(", "),
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
      {pending ? "Opening checkout" : "Continue to checkout"}
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
export type LandingPlanCard = {
  id: string;
  name: string;
  priceLabel: string;
  cadence: string;
  detail: string;
  yearly: boolean;
};

type ScheduleType = { id: string; name: string; description: string; offeringKey: string | null; sortOrder: number };
type PathKey = "intro" | "private" | "group" | "flag" | "film" | "speed";
type Stage = "home" | "intro" | "trainings" | "coach" | "calendar";

/** Parent list. Girls Quarterback Training and Elite Quarterback Camp stay off it. */
const TRAININGS: { key: Exclude<PathKey, "intro">; label: string; description: string }[] = [
  { key: "private", label: "Private quarterback", description: "One-on-one quarterback training. You choose the coach and the time." },
  { key: "group", label: "Group quarterback", description: "Group quarterback on the schedule." },
  { key: "flag", label: "Girls flag", description: "Girls flag with the academy coaches." },
  { key: "film", label: "Film study", description: "Film on the academy calendar." },
  { key: "speed", label: "Speed & Agility", description: "Speed and agility with the academy coaches." },
];

function pathMatchesType(type: ScheduleType, key: Exclude<PathKey, "intro">) {
  const name = type.name;
  const offering = type.offeringKey ?? "";
  if (hiddenFromParentList(name) || hiddenFromParentList(offering)) return false;
  if (key === "private") return offering === PRIVATE_QUARTERBACK_KEY;
  if (key === "group") return offering === `program:${QUARTERBACK_PROGRAM}`;
  if (key === "speed") return offering === `program:${SPEED_PROGRAM}` || /speed/i.test(name);
  if (key === "flag") return /flag/i.test(name) || /flag/i.test(offering);
  return /film/i.test(name) || /film/i.test(offering);
}

function sessionOnPath(session: ScheduleSession, key: Exclude<PathKey, "intro">, typeId: string) {
  if (hiddenFromParentList(session.title) || hiddenFromParentList(session.program)) return false;
  if (typeId) return session.typeId === typeId;
  if (key === "private") return isPrivateQuarterback(session);
  if (key === "group") return session.kind === "GROUP" && session.program === QUARTERBACK_PROGRAM && !isIntro(session);
  if (key === "speed") return session.program === SPEED_PROGRAM;
  if (key === "flag") return /flag/i.test(session.program);
  return /film/i.test(session.program);
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
  initialTypeId = "",
  initialCoach = "",
  initialStage = "home",
  speedPrices = {},
  savedPrivatePrices = {},
  plans = [],
  types = [],
  landingPlans = [],
}: {
  sessions: ScheduleSession[];
  todayKey: string;
  currentMonth: string;
  maxMonth: string;
  openings: OpeningsByCoach;
  portraits: Record<string, string>;
  privateCoaches: PrivateCoachChoice[];
  nowIso: string;
  initialTypeId?: string;
  initialCoach?: string;
  initialStage?: "home" | "intro" | "intro-coach" | "trainings";
  speedPrices?: Record<string, number>;
  savedPrivatePrices?: Record<string, number>;
  plans?: PlanColorSource[];
  types?: ScheduleType[];
  landingPlans?: LandingPlanCard[];
}) {
  const startingCoach = isPlaceholderCoach(initialCoach) ? "" : initialCoach;
  const linkedPath: PathKey = (() => {
    const type = types.find((item) => item.id === initialTypeId);
    if (!type) return "group";
    const found = TRAININGS.find((item) => pathMatchesType(type, item.key));
    return found?.key ?? "group";
  })();
  const opened: Stage = startingCoach
    ? "calendar"
    : initialStage === "intro-coach"
      ? "coach"
      : initialStage === "intro"
        ? "intro"
        : initialStage === "trainings"
          ? "trainings"
          : "home";
  const [stage, setStage] = useState<Stage>(opened);
  const [path, setPath] = useState<PathKey>(startingCoach ? linkedPath : opened === "coach" || opened === "intro" ? "intro" : "group");
  const [coach, setCoach] = useState(startingCoach);
  const [month, setMonth] = useState(currentMonth);
  const [day, setDay] = useState("");

  const now = useMemo(() => new Date(nowIso), [nowIso]);
  const bookable = useMemo(() => openSessions(sessions, openings), [sessions, openings]);
  const activePath = path === "intro" ? null : path;
  const activeTypeId = activePath ? types.find((type) => pathMatchesType(type, activePath))?.id ?? "" : "";
  const coachesForPath = useMemo(() => {
    if (!activePath) return [];
    const order = Object.keys(portraits);
    const prices = new Map<string, number[]>();
    for (const session of bookable) {
      if (!sessionOnPath(session, activePath, activeTypeId)) continue;
      for (const name of parentCoachNames(session)) {
        const list = prices.get(name) ?? [];
        const speed = activePath === "speed" ? speedPrices[name] : undefined;
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
  }, [activePath, activeTypeId, bookable, portraits, speedPrices]);

  const privateBooking = path === "private";
  const usesAvailability = privateBooking && coachHasLogin(openings, coach);
  const onThisCoach = (session: ScheduleSession) =>
    activePath != null && sessionOnPath(session, activePath, activeTypeId) && parentCoachNames(session).includes(coach);
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

  function pickTraining(next: Exclude<PathKey, "intro">) {
    if (next !== path) {
      setCoach("");
      setDay("");
      setMonth(currentMonth);
    }
    setPath(next);
    setStage("coach");
  }

  function pickCoach(name: string) {
    if (isPlaceholderCoach(name)) return;
    if (path === "intro") {
      window.location.assign(`/book/intro?coach=${encodeURIComponent(name)}`);
      return;
    }
    if (name !== coach) {
      setDay("");
      setMonth(currentMonth);
    }
    setCoach(name);
    setStage("calendar");
  }

  function back() {
    setDay("");
    if (stage === "calendar") setStage("coach");
    else if (stage === "coach") setStage(path === "intro" ? "intro" : "trainings");
    else setStage("home");
  }

  const question =
    stage === "home"
      ? "Start here"
      : stage === "intro"
        ? "Introduction session"
        : stage === "trainings"
          ? "Choose a training"
          : stage === "coach"
            ? "Choose your coach"
            : day
              ? "Choose a time"
              : coach
                ? `${possessive(coach)} calendar`
                : "Choose a day";
  const trail =
    stage === "coach" || stage === "calendar"
      ? path === "intro"
        ? "Introduction session"
        : TRAININGS.find((item) => item.key === path)?.label ?? ""
      : "";
  const progress =
    stage === "home"
      ? ""
      : path === "intro"
        ? stage === "intro"
          ? "1 of 2"
          : "2 of 2"
        : stage === "trainings"
          ? "1 of 3"
          : stage === "coach"
            ? "2 of 3"
            : "3 of 3";
  const coachPhoto = portraits[coach] ?? "";
  const introCoaches = privateCoaches.map((person) => ({
    name: person.name,
    price: formatMoney(INTRO_PRICE_CENTS),
    photo: portraits[person.name] ?? "",
  }));
  const coachCards = path === "intro" ? introCoaches : privateBooking
    ? privateCoaches.map((person) => ({ name: person.name, price: formatMoney(person.priceCents), photo: portraits[person.name] ?? "" }))
    : coachesForPath;
  const coachBlocks = useMemo<CalendarBlock[]>(() => {
    if (!coach || path === "intro") return [];
    return sessions
      .filter((session) => {
        if (isIntro(session)) return false;
        if (session.kind !== "GROUP" && session.kind !== "PRIVATE" && session.kind !== "CAMP") return false;
        return onThisCoach(session);
      })
      .map((session) => {
        const block = sessionBlock(session, plans);
        if (session.status === "CANCELED") return block;
        const price =
          path === "speed" && speedPrices[coach] != null
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
  }, [sessions, coach, path, plans, speedPrices, savedPrivatePrices, onThisCoach]);
  const openHourIds = new Set(dayHours.flatMap((slot) => (slot.sessionId ? [slot.sessionId] : [])));
  const dayExtras = coachBlocks.filter((event) => event.dayKey === day && !openHourIds.has(event.id));
  const cardClass = "flex min-h-44 flex-col rounded-2xl bg-white px-5 py-5 text-left";

  return (
    <section id="schedule" className="mt-6 scroll-mt-24" data-step={stage}>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-display text-4xl uppercase leading-none">{question}</h2>
        {progress ? <p className="text-sm text-muted-foreground">{progress}</p> : null}
      </div>
      {trail ? <p className="mt-2 text-sm text-muted-foreground">{trail}</p> : null}
      {stage !== "home" ? (
        <button
          type="button"
          onClick={back}
          className="mt-3 inline-flex min-h-12 items-center rounded-full bg-ink px-5 text-base font-semibold text-white"
        >
          Back
        </button>
      ) : null}
      {stage === "calendar" && coach ? (
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

      {stage === "home" ? (
        <>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button type="button" data-choice="new" onClick={() => { setPath("intro"); setStage("intro"); }} className={cardClass}>
              <span className="block font-display text-3xl uppercase leading-none">New quarterback</span>
              <span className="mt-3 block text-sm leading-snug text-muted-foreground">
                Start with the introduction session. {formatMoney(INTRO_PRICE_CENTS)}.
              </span>
              <span className="mt-4 block text-sm font-semibold text-primary">Introduction session</span>
            </button>
            <button type="button" data-choice="existing" onClick={() => setStage("trainings")} className={cardClass}>
              <span className="block font-display text-3xl uppercase leading-none">Existing client</span>
              <span className="mt-3 block text-sm leading-snug text-muted-foreground">
                Pick the training you already do, then a coach and a time.
              </span>
              <span className="mt-4 block text-sm font-semibold text-primary">Choose a training</span>
            </button>
          </div>
            <div id="plans" className="mt-8 scroll-mt-24">
            <h2 className="font-display text-4xl uppercase leading-none">Plans</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {landingPlans.map((plan) => (
                <Link
                  key={plan.id}
                  href={`/sessions/${plan.id}`}
                  data-plan={plan.name}
                  data-yearly={plan.yearly ? "yes" : undefined}
                  className={cardClass}
                >
                  <span className="block font-display text-3xl uppercase leading-none">{plan.name}</span>
                  <span className="mt-3 block font-display text-4xl leading-none">
                    {plan.priceLabel}<span className="text-base"> {plan.cadence}</span>
                  </span>
                  <span className="mt-3 block text-sm leading-snug text-muted-foreground">{plan.detail}</span>
                  <span className="mt-4 block text-sm font-semibold text-primary">Continue to checkout</span>
                </Link>
              ))}
            </div>
          </div>
        </>
      ) : null}

      {stage === "intro" ? (
        <div className="mt-4 rounded-2xl bg-white p-5" data-intro="yes">
          <p className="font-display text-3xl uppercase leading-none">Introduction session</p>
          <p className="mt-3 text-sm leading-snug text-muted-foreground">{INTRO_NOTE}</p>
          <p className="mt-3 text-sm font-semibold">{formatMoney(INTRO_PRICE_CENTS)}</p>
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-primary"
            onClick={() => { setPath("intro"); setStage("coach"); }}
          >
            Choose a coach
          </button>
        </div>
      ) : null}

      {stage === "trainings" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {TRAININGS.filter((item) => !hiddenFromParentList(item.label)).map((item) => (
            <button key={item.key} type="button" data-training={item.label} onClick={() => pickTraining(item.key)} className={cardClass}>
              <span className="block font-display text-3xl uppercase leading-none">{item.label}</span>
              <span className="mt-3 block text-sm leading-snug text-muted-foreground">{item.description}</span>
              <span className="mt-4 block text-sm font-semibold text-primary">Choose a coach</span>
            </button>
          ))}
        </div>
      ) : null}

      {stage === "coach" && coachCards.length === 0 ? (
        <p className="mt-4 rounded-2xl bg-white p-5 text-sm text-muted-foreground">None are on the calendar yet.</p>
      ) : null}
      {stage === "coach" && coachCards.length > 0 ? (
        <div className="mt-4 grid gap-3">
          {coachCards.map((person) => (
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
            </button>
          ))}
        </div>
      ) : null}

      {stage === "calendar" ? (
        <div className="mt-4">
          <p className="mb-3 text-sm text-muted-foreground">Tap an event to book. Tap a day to list that day.</p>
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
    </section>
  );
}
