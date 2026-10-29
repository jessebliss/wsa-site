export function CalendarLegend() {
  return (
    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-2 text-xs font-semibold" data-calendar-legend="yes">
      <span className="inline-flex items-center gap-1.5">
        <i className="h-3 w-3 rounded-sm bg-group" aria-hidden="true" />
        Group
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-3 w-3 rounded-sm bg-private" aria-hidden="true" />
        Private
      </span>
      <span className="inline-flex items-center gap-1.5">
        <i className="h-3 w-3 rounded-sm bg-group/25" aria-hidden="true" />
        Canceled
      </span>
    </div>
  );
}
