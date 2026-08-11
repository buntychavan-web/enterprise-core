import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  serif = false,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  eyebrow?: string;
  /** EWOS identity (Sprint 0 design gate) — opt-in display serif for the Home
   * greeting and other "selected section headings." Every other screen's
   * PageHeader is untouched, on purpose: this is not a blanket typography
   * change across the app. */
  serif?: boolean;
}) {
  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {eyebrow}
          </div>
        )}
        <h1
          className={cn(
            "truncate text-2xl font-semibold tracking-tight text-foreground",
            serif && "font-serif font-normal",
          )}
        >
          {title}
        </h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </header>
  );
}
