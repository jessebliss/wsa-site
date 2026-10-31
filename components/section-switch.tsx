"use client";

import { useState, type ReactNode } from "react";

export function SectionSwitch({
  sections,
}: {
  sections: { id: string; label: string; body: ReactNode }[];
}) {
  const [current, setCurrent] = useState(sections[0]?.id ?? "");
  const active = sections.find((section) => section.id === current) ?? sections[0];

  return (
    <div className="mt-6">
      <div className="grid grid-cols-2 gap-2" role="tablist" aria-label="Coach tools">
        {sections.map((section) => {
          const selected = section.id === active?.id;
          return (
            <button
              key={section.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setCurrent(section.id)}
              className={`min-h-11 rounded-full px-3 text-sm font-semibold ${selected ? "bg-ink text-white" : "bg-white"}`}
            >
              {section.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4" role="tabpanel">
        {active?.body}
      </div>
    </div>
  );
}
