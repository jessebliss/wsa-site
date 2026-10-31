"use client";

import { useState } from "react";
import { EVENT_COLORS, eventColor } from "@/lib/plan-options";

export function ColorSwatches({ value }: { value: string }) {
  return (
    <fieldset className="sm:col-span-2">
      <legend className="text-sm font-semibold">Color</legend>
      <div className="mt-2 flex flex-wrap gap-2" data-color-swatches="yes">
        {EVENT_COLORS.map((color) => (
          <label key={color.id} className="cursor-pointer" title={color.label}>
            <input
              type="radio"
              name="color"
              value={color.id}
              defaultChecked={color.id === value}
              aria-label={color.label}
              className="peer sr-only"
              required
            />
            <span
              data-color-swatch={color.id}
              className="block h-11 w-11 rounded-md ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-ink"
              style={{ backgroundColor: color.hex }}
            />
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function PlanColor({ value }: { value: string }) {
  const [open, setOpen] = useState(false);
  const current = eventColor(value);
  if (!open) {
    return (
      <div className="sm:col-span-2">
        <p className="text-sm font-semibold">Color</p>
        <div className="mt-2 flex items-center gap-3">
          <span className="h-11 w-11 rounded-md" style={{ backgroundColor: current.hex }} data-chosen-color={current.id} />
          <span className="text-sm">{current.label}</span>
          <button type="button" className="text-sm font-semibold text-primary" onClick={() => setOpen(true)}>
            Change
          </button>
        </div>
        <input type="hidden" name="color" value={current.id} />
      </div>
    );
  }
  return <ColorSwatches value={value} />;
}
