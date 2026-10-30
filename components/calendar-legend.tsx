export function CalendarLegend({ items }: { items: { label: string; hex: string }[] }) {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold" data-calendar-legend="yes">
      {items.map((item) => (
        <span key={item.label} className="inline-flex items-center gap-1.5">
          <i className="h-3 w-3 rounded-sm" style={{ backgroundColor: item.hex }} aria-hidden="true" />
          {item.label}
        </span>
      ))}
      <span className="inline-flex items-center gap-1.5 text-muted-foreground">Canceled is faded</span>
    </div>
  );
}

export function legendItems(events: { program: string; color: string }[]) {
  const seen = new Map<string, string>();
  for (const event of events) {
    if (!seen.has(event.program)) seen.set(event.program, event.color);
  }
  return Array.from(seen.entries()).map(([label, hex]) => ({ label, hex }));
}
