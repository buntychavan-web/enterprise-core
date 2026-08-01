import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AppraisalStatus } from "@/lib/api-client";

const STAGES: { status: AppraisalStatus; label: string }[] = [
  { status: "PENDING_SELF", label: "Self Review" },
  { status: "PENDING_MANAGER", label: "Manager Review" },
  { status: "PENDING_REVIEWER", label: "Reviewer Review" },
  { status: "CALIBRATION", label: "Calibration" },
  { status: "PENDING_APPROVAL", label: "Approval" },
  { status: "FINALISED", label: "Finalised" },
];

/** Sprint 24C — one appraisal's position in the self → manager → reviewer →
 *  calibration → approval → finalised chain. CANCELLED is a side-branch,
 *  shown as a plain note rather than a position on this line (mirrors
 *  CycleStageStepper's handling of the cycle-level CANCELLED status). */
export function AppraisalStageStepper({ status }: { status: AppraisalStatus }) {
  if (status === "CANCELLED") {
    return <p className="text-sm text-muted-foreground">This appraisal was cancelled.</p>;
  }
  const currentIndex = STAGES.findIndex((s) => s.status === status);

  return (
    <ol className="flex flex-wrap items-center gap-x-1 gap-y-3" aria-label="Appraisal stage">
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
