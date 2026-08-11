// Sprint 0 (EWOS App Shell) — the Design System gallery link was removed from
// this production footer (it's dev-reference documentation, not a product
// screen — see CTO review "REMOVE FROM PRODUCTION NAV: design-system
// galleries"). The route/file itself is untouched and still reachable
// directly at /design-system for anyone who needs it.
export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div>&copy; {new Date().getFullYear()} EWOS — Enterprise Workforce Operating System</div>
        <span>v1.0.0</span>
      </div>
    </footer>
  );
}
