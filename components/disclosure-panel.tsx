"use client";

import { useState, type ReactNode } from "react";

export function DisclosurePanel({
  label,
  hideLabel = "Hide",
  children,
  className = "",
}: {
  label: string;
  hideLabel?: string;
  children: ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={className}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex min-h-11 items-center rounded-full bg-ink px-5 text-sm font-semibold text-white"
      >
        {open ? hideLabel : label}
      </button>
      {open ? <div className="mt-4">{children}</div> : null}
    </div>
  );
}
