import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

/**
 * Sprint 0 (EWOS App Shell) — the one card primitive shared by Home's Bento
 * grid and the Work Hub. A self-contained information unit: heading, one or
 * two real status lines, and a single link through to the existing (reused,
 * not rebuilt) module screen. See CTO review "Bento Home — MODIFY: fixed
 * role-aware card set for v1, not a personalized/reorderable grid."
 *
 * EWOS identity (Sprint 0 design gate) — the icon sits in a tinted brand-gold
 * chip, the approved "icon-in-chip" Bento/work-card signature, rather than
 * floating bare next to the title.
 */
export function WorkCard({
  to,
  icon,
  title,
  loading,
  error,
  children,
  cta = "Open",
}: {
  to: string;
  icon: ReactNode;
  title: string;
  loading?: boolean;
  error?: string | null;
  children?: ReactNode;
  cta?: string;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "group flex flex-col gap-3 rounded-lg border border-border bg-card p-4 text-left transition-colors",
        "hover:border-foreground/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-brand/12 text-brand transition-colors group-hover:bg-brand/18"
        >
          {icon}
        </span>
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
      </div>

      <div className="min-h-10 flex-1">
        {loading ? (
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        ) : error ? (
          <p className="text-xs text-muted-foreground">Unavailable right now</p>
        ) : (
          children
        )}
      </div>

      <span className="flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
        {cta}
        <ArrowRight
          className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
