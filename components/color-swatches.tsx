import { EVENT_COLORS } from "@/lib/plan-options";

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
