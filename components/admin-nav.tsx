"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

export function AdminNav({ links }: { links: [string, string][] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function current(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  const items = links.map(([label, href]) => (
    <Link
      key={href}
      href={href}
      aria-current={current(href) ? "page" : undefined}
      onClick={() => setOpen(false)}
      className={`flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-center text-sm font-semibold leading-tight ${
        current(href) ? "bg-white text-ink" : "bg-white/10"
      }`}
    >
      {label}
    </Link>
  ));

  if (links.length <= 1) {
    return (
      <nav className="mx-auto grid max-w-6xl grid-cols-2 gap-2 px-4 pb-3" aria-label="Admin">
        {items}
      </nav>
    );
  }

  return (
    <nav className="mx-auto max-w-6xl px-4 pb-3" aria-label="Admin">
      <button
        type="button"
        className="flex min-h-11 w-full items-center justify-center rounded-full bg-white/10 text-sm font-semibold md:hidden"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? "Close menu" : "Menu"}
      </button>
      <div className={`${open ? "mt-2 grid" : "hidden"} grid-cols-2 gap-2 md:grid md:grid-cols-5`}>
        {items}
      </div>
    </nav>
  );
}
