import type { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";

export function StatCard({
  label,
  value,
  icon,
  hint,
  loading,
  unavailable,
}: {
  label: string;
  value?: number | string | null;
  icon: ReactNode;
  hint?: string;
  loading?: boolean;
  unavailable?: boolean;
}) {
  const displayValue =
    loading || unavailable || value === null || value === undefined
      ? null
      : typeof value === "number"
        ? value.toLocaleString()
        : value;

  return (
    <Card className="shadow-xs">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </div>
            <div className="mt-2 min-h-[2.25rem] text-3xl font-semibold tracking-tight text-foreground">
              {loading ? (
                <span
                  className="inline-block h-7 w-20 animate-pulse rounded bg-muted align-middle"
                  aria-label="Loading"
                />
              ) : displayValue !== null ? (
                displayValue
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {loading ? "Loading…" : unavailable ? "Coming soon" : (hint ?? "Total records")}
        </div>
      </CardContent>
    </Card>
  );
}
