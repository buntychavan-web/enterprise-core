/**
 * EWOS wordmark placeholder.
 * Replace the SVG inside without changing the container to swap in a real logo later.
 *
 * `onDark` renders the wordmark for the dark-ink navigation rail (Sprint 0
 * design gate) — every other usage (login, About, design system) stays on a
 * light background and uses the default light-text variant.
 */
export function EwosLogo({
  className = "",
  onDark = false,
}: {
  className?: string;
  onDark?: boolean;
}) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand text-ink"
      >
        <span className="text-sm font-bold tracking-tight">E</span>
      </div>
      <span
        className={`text-base font-semibold tracking-tight ${onDark ? "text-white" : "text-foreground"}`}
      >
        EWOS
      </span>
    </div>
  );
}
