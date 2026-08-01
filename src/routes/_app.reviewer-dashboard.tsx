import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, ClipboardList, Scale } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatCard } from "@/components/ewos/StatCard";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, performanceSelfServiceApi, type AppraisalDto } from "@/lib/api-client";

export const Route = createFileRoute("/_app/reviewer-dashboard")({
  head: () => ({
    meta: [{ title: "Reviewer Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: ReviewerDashboardPage,
});

function ReviewerDashboardPage() {
  const [pending, setPending] = useState<AppraisalDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .pendingReviewerReview()
      .then((data) => !cancelled && setPending(data))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load reviewer summary.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Reviewer Dashboard"
        description="Your independent-reviewer workload across active appraisal cycles."
      />

      {error ? (
        <EmptyState title="Couldn't load reviewer summary" description={error} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <StatCard
              label="Pending your review"
              icon={<Scale className="h-5 w-5" />}
              value={pending?.length}
              loading={loading}
              hint="Appraisals awaiting reviewer assessment"
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Awaiting your assessment</CardTitle>
              <Link
                to="/reviewer-pending-reviews"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                View all
                <ArrowUpRight className="h-3 w-3" />
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 text-sm text-muted-foreground">Loading…</div>
              ) : !pending || pending.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                  Nothing awaiting your reviewer assessment right now.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {pending.slice(0, 5).map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <Link
                        to="/reviewer-assessment/$id"
                        params={{ id: a.id }}
                        className="font-medium text-foreground hover:underline"
                      >
                        <ClipboardList className="mr-1.5 inline h-3.5 w-3.5 text-muted-foreground" />
                        Appraisal {a.id.slice(0, 8)}
                      </Link>
                      <AppraisalStatusChip status={a.status} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
