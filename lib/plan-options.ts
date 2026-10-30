/** Twelve event colors. Admin picks one swatch per plan. There is no free-form color. */
export const EVENT_COLORS = [
  { id: "red", label: "Red", hex: "#c4121a" },
  { id: "pink", label: "Pink", hex: "#d63384" },
  { id: "orange", label: "Orange", hex: "#d35400" },
  { id: "gold", label: "Gold", hex: "#8a6d00" },
  { id: "green", label: "Green", hex: "#1b7a45" },
  { id: "teal", label: "Teal", hex: "#0f766e" },
  { id: "blue", label: "Blue", hex: "#1d4e89" },
  { id: "indigo", label: "Indigo", hex: "#3730a3" },
  { id: "purple", label: "Purple", hex: "#6d28d9" },
  { id: "brown", label: "Brown", hex: "#7c3f2d" },
  { id: "slate", label: "Slate", hex: "#334155" },
  { id: "crimson", label: "Crimson", hex: "#9f1239" },
] as const;

export type EventColorId = (typeof EVENT_COLORS)[number]["id"];

const COLOR_BY_ID = new Map(EVENT_COLORS.map((color) => [color.id, color]));

const PROGRAM_DEFAULTS: Record<string, EventColorId> = {
  "quarterback training": "blue",
  "speed & agility": "teal",
  "girls flag": "pink",
};

export type PlanColorSource = {
  program: string;
  color: string;
  active?: boolean;
  sortOrder?: number;
};

export function isEventColorId(value: string): value is EventColorId {
  return COLOR_BY_ID.has(value as EventColorId);
}

export function eventColor(id: string) {
  return COLOR_BY_ID.get(id as EventColorId) ?? EVENT_COLORS[0];
}

function colorFromName(program: string) {
  const named = PROGRAM_DEFAULTS[program.trim().toLowerCase()];
  if (named) return eventColor(named);
  let hash = 0;
  for (const char of program) hash = (hash + char.charCodeAt(0)) % EVENT_COLORS.length;
  return EVENT_COLORS[hash] ?? EVENT_COLORS[0];
}

/** Sessions use the first active plan for that program. A program with no plan still gets one of the twelve. */
export function colorForProgram(program: string, plans: PlanColorSource[]) {
  const key = program.trim().toLowerCase();
  const matches = plans
    .filter((plan) => plan.program.trim().toLowerCase() === key)
    .sort((a, b) => {
      const activeDelta = Number(b.active !== false) - Number(a.active !== false);
      if (activeDelta !== 0) return activeDelta;
      return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
    });
  const chosen = matches[0];
  if (chosen && isEventColorId(chosen.color)) return eventColor(chosen.color);
  return colorFromName(program);
}

export function planCadence(interval: string | null | undefined) {
  return interval === "YEAR" ? "per year" : "per month";
}
