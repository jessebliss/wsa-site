"use client";

import { useState, type ReactNode } from "react";

export function CollapsibleSection({
  title,
  children,
  className = "",
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  className?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className={className}>
      <h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
          className="flex min-h-11 w-full items-center justify-between gap-3 text-left font-display text-3xl uppercase"
        >
          <span>{title}</span>
          <span className="text-sm font-semibold normal-case tracking-normal text-primary">{open ? "Hide" : "Show"}</span>
        </button>
      </h2>
      {open ? <div className="mt-2">{children}</div> : null}
    </section>
  );
}
