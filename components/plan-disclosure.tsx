"use client";

import { useEffect, useState, type ReactNode } from "react";

export function PlanDisclosure({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      if (window.location.hash === "#sessions" || window.location.hash === "#plans") setOpen(true);
    };
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);

  return (
    <section id="sessions" className="mt-8 scroll-mt-24">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="font-display text-2xl uppercase"
      >
        {open ? "Hide sessions" : "Sessions"}
      </button>
      {open ? <div className="mt-3">{children}</div> : null}
    </section>
  );
}
