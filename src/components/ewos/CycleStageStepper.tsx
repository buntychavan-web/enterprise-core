import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PerformanceCycleStatus } from "@/lib/api-client";

// The forward-only lifecycle, excluding CANCELLED (a side-branch reachable
// from any non-terminal stage — shown as a standalone chip by the caller via
// CycleStatusChip instead of a step in this line, since it doesn't fit a
// linear progress reading).
const STAGES: { status: PerformanceCycleStatus; label: string }[] = [
  { status: "DRAFT", label: "Draft" },
  { status: "OPEN", label: "Published" },
  { status: "SELF_REVIEW", label: "Self Review" },
  { status: "MANAGER_REVIEW", label: "Manager Review" },
  { status: "REVIEWER_REVIEW", label: "Reviewer Review" },
  { status: "CALIBRATION", label: "Calibration" },
  { status: "HR_REVIEW", label: "HR Review" },
  { status: "FINAL_APPROVAL", label: "Final Approval" },
  { status: "RELEASED", label: "Released" },
  { status: "CLOSED", label: "Closed" },
];

/** Sprint 24C — visual read of where a cycle sits in the Draft → Closed
 *  lifecycle. Renders nothing but a plain "Cancelled" note if the cycle was
 *  cancelled, since that's a side-branch, not a position on this line. */
export function CycleStageStepper({ status }: { status: PerformanceCycleStatus }) {
  if (status === "CANCELLED") {
    return <p className="text-sm text-muted-foreground">This cycle was cancelled.</p>;
  }
  const currentIndex = STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-3" aria-label="Cycle lifecycle stage">
      {STAGES.map((stage, i) => {
        const done = i < currentIndex;
        const active = i === currentIndex;
        return (
          <li key={stage.status} className="flex items-center gap-1">
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                done &&
                  "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                active && "border-primary/40 bg-primary/10 text-primary",
                !done && !active && "border-border text-muted-foreground",
              )}
              aria-current={active ? "step" : undefined}
            >
              {done ? (
                <Check className="h-3 w-3 shrink-0" aria-hidden />
              ) : (
                <span className="grid h-3 w-3 shrink-0 place-items-center rounded-full border border-current text-[8px]" />
              )}
              {stage.label}
            </div>
            {i < STAGES.length - 1 && (
              <span className="mx-0.5 h-px w-3 shrink-0 bg-border sm:w-4" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
