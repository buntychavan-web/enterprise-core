import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Award, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { AppraisalStageStepper } from "@/components/ewos/AppraisalStageStepper";
import { RatingBadge } from "@/components/ewos/RatingBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ApiError,
  appraisalTemplateApi,
  performanceCycleApi,
  performanceSelfServiceApi,
  type AppraisalDto,
  type AppraisalTemplateDto,
  type PerformanceCycleDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-appraisal")({
  head: () => ({
    meta: [{ title: "My Appraisal — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyAppraisalPage,
});

const TERMINAL: AppraisalDto["status"][] = ["FINALISED", "CANCELLED"];

function MyAppraisalPage() {
  const [appraisal, setAppraisal] = useState<AppraisalDto | null | undefined>(undefined);
  // Cycle/template names come from PERF_READ-gated endpoints — self-service
  // appraisers may not hold that authority, so these are best-effort and
  // never block the page if they fail.
  const [cycle, setCycle] = useState<PerformanceCycleDto | null>(null);
  const [template, setTemplate] = useState<AppraisalTemplateDto | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .myAppraisals()
      .then((all) => {
        if (cancelled) return;
        const current = all.find((a) => !TERMINAL.includes(a.status)) ?? all[0] ?? null;
        setAppraisal(current);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load your appraisal.");
        setAppraisal(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!appraisal) return;
    let cancelled = false;
    performanceCycleApi
      .getById(appraisal.cycleId)
      .then((c) => !cancelled && setCycle(c))
      .catch(() => !cancelled && setCycle(null));
    appraisalTemplateApi
      .getById(appraisal.templateId)
      .then((t) => !cancelled && setTemplate(t))
      .catch(() => !cancelled && setTemplate(null));
    return () => {
      cancelled = true;
    };
  }, [appraisal]);

  if (appraisal === undefined) {
    return (
      <div className="grid place-items-center p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="My Appraisal"
        description={
          cycle ? `${cycle.name} — ${cycle.periodStart} to ${cycle.periodEnd}` : undefined
        }
      />

      {error ? (
        <EmptyState title="Couldn't load your appraisal" description={error} />
      ) : !appraisal ? (
        <EmptyState
          icon={Award}
          title="No appraisal yet"
          description="You don't have an appraisal in any cycle yet. Once HR launches a cycle covering you, it will appear here."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="flex-row flex-wrap items-center justify-between gap-2 pb-2">
              <CardTitle className="text-sm font-semibold">Status</CardTitle>
              <div className="flex items-center gap-2">
                <AppraisalStatusChip status={appraisal.status} />
                {appraisal.status === "PENDING_SELF" && (
                  <Button size="sm" asChild>
                    <Link to="/my-appraisal-self-review">Submit self review</Link>
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <AppraisalStageStepper status={appraisal.status} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <RatingCard
              label="Self rating"
              rating={appraisal.selfRating}
              comments={appraisal.selfComments}
              scaleMax={template?.ratingScaleMax}
            />
            <RatingCard
              label="Manager rating"
              rating={appraisal.managerRating}
              comments={appraisal.managerComments}
              scaleMax={template?.ratingScaleMax}
            />
            <RatingCard
              label="Reviewer rating"
              rating={appraisal.reviewerRating}
              comments={appraisal.reviewerComments}
              scaleMax={template?.ratingScaleMax}
            />
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Final outcome</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RatingBadge rating={appraisal.finalRating} scaleMax={template?.ratingScaleMax} />
                {appraisal.finalBand && (
                  <div className="text-sm text-muted-foreground">Band: {appraisal.finalBand}</div>
                )}
                {appraisal.incrementRecommendation &&
                  appraisal.incrementRecommendation !== "NONE" && (
                    <div className="text-sm text-muted-foreground">
                      Increment: {appraisal.incrementRecommendation.replace(/_/g, " ")}
                      {appraisal.incrementPercent !== undefined &&
                        ` (${appraisal.incrementPercent}%)`}
                    </div>
                  )}
                {appraisal.promotionRecommendation &&
                  appraisal.promotionRecommendation !== "NONE" && (
                    <div className="text-sm text-muted-foreground">
                      Promotion: {appraisal.promotionRecommendation.replace(/_/g, " ")}
                    </div>
                  )}
                {!appraisal.finalRating && (
                  <p className="text-sm text-muted-foreground">Not yet finalised for this cycle.</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-primary">
            <Link to="/my-appraisal-history" className="hover:underline">
              View appraisal history
            </Link>
            <span className="text-muted-foreground">·</span>
            <Link to="/my-performance-timeline" className="hover:underline">
              View performance timeline
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function RatingCard({
  label,
  rating,
  comments,
  scaleMax,
}: {
  label: string;
  rating?: number;
  comments?: string;
  scaleMax?: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{label}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <RatingBadge rating={rating} scaleMax={scaleMax} />
        {comments && <p className="text-sm text-muted-foreground">{comments}</p>}
      </CardContent>
    </Card>
  );
}
