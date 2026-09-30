"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { ScheduleBoard, type ScheduleSession } from "@/components/schedule-board";
import {
  packageMatchesFilter,
  visibleDayKeys,
  type ScheduleFilter,
  type ScheduleKind,
} from "@/lib/schedule-filter";

export type OfferingCard = {
  title: string;
  detail: string;
  image: string;
  imagePosition: string;
  href: string;
  program: string;
  coach: string;
};

export function PublicSchedule({
  sessions,
  dayKeys,
  initialProgram = "",
  initialCoach = "",
  offerings,
  children,
}: {
  sessions: ScheduleSession[];
  dayKeys: string[];
  initialProgram?: string;
  initialCoach?: string;
  offerings: OfferingCard[];
  children?: ReactNode;
}) {
  const [kind, setKind] = useState<ScheduleKind>("ALL");
  const [program, setProgram] = useState(initialProgram || "");
  const [coach, setCoach] = useState(initialCoach);
  const [day, setDay] = useState("");

  // A refresh with no program param is All programs, including when iOS restores the page.
  useLayoutEffect(() => {
    if (!new URLSearchParams(window.location.search).get("program")) setProgram("");
  }, []);
  useEffect(() => {
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      if (!new URLSearchParams(window.location.search).get("program")) setProgram("");
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  const filter: ScheduleFilter = { kind, program, coach };
  const days = visibleDayKeys(dayKeys, sessions, offerings, filter);
  const activeDay = days.includes(day) ? day : (days[0] ?? "");
  const packages = offerings.filter((offer) => packageMatchesFilter(offer, sessions, filter));

  return (
    <>
      <div id="schedule" className="mt-6 scroll-mt-24">
        <ScheduleBoard
          sessions={sessions}
          dayKeys={days}
          day={activeDay}
          kind={kind}
          program={program}
          coach={coach}
          onDay={setDay}
          onKind={setKind}
          onProgram={setProgram}
          onCoach={setCoach}
        />
      </div>
      {children}
      <section className="mt-12">
        <h2 className="font-display text-3xl uppercase">Train with</h2>
        {packages.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">No packages match these filters.</p>
        ) : (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {packages.map((offer) => (
              <Link key={offer.title} href={offer.href} className="block overflow-hidden rounded-2xl bg-white">
                <img
                  src={offer.image}
                  alt=""
                  className="h-72 w-full object-cover"
                  style={{ objectPosition: offer.imagePosition }}
                />
                <div className="p-4">
                  <p className="text-xs text-muted-foreground">{offer.detail}</p>
                  <h3 className="mt-1 font-display text-2xl uppercase leading-none">{offer.title}</h3>
                  <p className="mt-3 text-sm font-semibold text-primary">Book</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </>
  );
}
