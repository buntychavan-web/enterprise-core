import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { HistoryTimeline, type HistoryEntry } from "@/components/ewos/HistoryTimeline";
import { Card, CardContent } from "@/components/ui/card";
import { ApiError, performanceSelfServiceApi, type AppraisalDto } from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-performance-timeline")({
  head: () => ({
    meta: [{ title: "Performance Timeline — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyPerformanceTimelinePage,
});

// A real, live-data-derived timeline built from the timestamp fields already
// on each AppraisalDto (self/manager/reviewer submission, calibration) —
// there is no separate audit-history API for appraisals, so this mirrors the
// same "derive from DTO timestamps" approach used by the Onboarding Progress
// Timeline (see _app.onboarding-plans.$id.tsx's timelineEntries).
function buildTimeline(appraisals: AppraisalDto[]): HistoryEntry[] {
  const entries: HistoryEntry[] = [];
  for (const a of appraisals) {
    if (a.selfSubmittedAt) {
      entries.push({
        id: `${a.id}-self`,
        occurredAt: a.selfSubmittedAt,
        action: "Self review submitted",
        notes: a.selfComments,
      });
    }
    if (a.managerSubmittedAt) {
      entries.push({
        id: `${a.id}-manager`,
        occurredAt: a.managerSubmittedAt,
        action: "Manager review submitted",
        notes: a.managerComments,
      });
    }
    if (a.reviewerSubmittedAt) {
      entries.push({
        id: `${a.id}-reviewer`,
        occurredAt: a.reviewerSubmittedAt,
        action: "Reviewer review submitted",
        notes: a.reviewerComments,
      });
    }
    if (a.calibratedAt) {
      entries.push({
        id: `${a.id}-calibrated`,
        occurredAt: a.calibratedAt,
        action: "Rating calibrated",
        notes: a.calibrationNotes,
      });
    }
  }
  return entries.sort((x, y) => (x.occurredAt < y.occurredAt ? 1 : -1));
}

function MyPerformanceTimelinePage() {
  const [appraisals, setAppraisals] = useState<AppraisalDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .myAppraisals()
      .then((data) => !cancelled && setAppraisals(data))
      .catch((err) => {
        if (cancelled) return;
        setError(
          err instanceof ApiError ? err.message : "Failed to load your performance timeline.",
        );
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const timeline = useMemo(() => buildTimeline(appraisals ?? []), [appraisals]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="Performance Timeline"
        description="A chronological view of your review activity across every appraisal."
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load your timeline" description={error} />
      ) : (
        <Card>
          <CardContent className="pt-6">
            <HistoryTimeline entries={timeline} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
