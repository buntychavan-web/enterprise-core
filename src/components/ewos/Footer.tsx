export function Footer() {
  return (
    <footer className="border-t border-border bg-card px-4 py-3 text-xs text-muted-foreground sm:px-6">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
        <div>&copy; {new Date().getFullYear()} EWOS — Enterprise Workforce Operating System</div>
        <div className="flex items-center gap-3">
          <span>v1.0.0</span>
          <span aria-hidden>·</span>
          <a href="/design-system" className="hover:text-foreground">
            Design System
          </a>
        </div>
      </div>
    </footer>
  );
}
