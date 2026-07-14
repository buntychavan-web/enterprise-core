/**
 * EWOS wordmark placeholder.
 * Replace the SVG inside without changing the container to swap in a real logo later.
 */
export function EwosLogo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground"
      >
        <span className="text-sm font-bold tracking-tight">E</span>
      </div>
      <span className="text-base font-semibold tracking-tight text-foreground">EWOS</span>
    </div>
  );
}
