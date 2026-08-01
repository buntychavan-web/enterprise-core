import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { RatingBadge } from "@/components/ewos/RatingBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ApiError,
  appraisalTemplateApi,
  performanceSelfServiceApi,
  type AppraisalDto,
  type AppraisalTemplateDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/reviewer-assessment/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Reviewer Assessment ${params.id} — EWOS` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ReviewerAssessmentPage,
});

function ReviewerAssessmentPage() {
  const { id } = Route.useParams();
  const [appraisal, setAppraisal] = useState<AppraisalDto | null>(null);
  const [template, setTemplate] = useState<AppraisalTemplateDto | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .myAppraisal(id)
      .then((a) => !cancelled && setAppraisal(a))
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setNotFound(true);
        else setError(err instanceof ApiError ? err.message : "Failed to load this appraisal.");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!appraisal) return;
    appraisalTemplateApi
      .getById(appraisal.templateId)
      .then(setTemplate)
      .catch(() => setTemplate(null));
  }, [appraisal]);

  const submit = async () => {
    if (!appraisal) return;
    const value = Number(rating);
    if (rating.trim() === "" || Number.isNaN(value)) {
      toast.error("A rating is required");
      return;
    }
    if (template && (value < template.ratingScaleMin || value > template.ratingScaleMax)) {
      toast.error(
        `Rating must be between ${template.ratingScaleMin} and ${template.ratingScaleMax}`,
      );
      return;
    }
    setSubmitting(true);
    try {
      const updated = await performanceSelfServiceApi.submitReviewer(appraisal.id, {
        rating: value,
        comments: comments.trim() || undefined,
      });
      toast.success("Reviewer assessment submitted");
      setConfirmOpen(false);
      setAppraisal(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit reviewer assessment.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Link
        to="/reviewer-pending-reviews"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to pending reviews
      </Link>

      <PageHeader eyebrow="Team Performance" title="Reviewer Assessment" />

      {notFound ? (
        <EmptyState
          title="Appraisal not found"
          description="This appraisal doesn't exist or you're not the reviewer on it."
        />
      ) : error ? (
        <EmptyState title="Couldn't load this appraisal" description={error} />
      ) : !appraisal ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Self review</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <RatingBadge rating={appraisal.selfRating} scaleMax={template?.ratingScaleMax} />
                {appraisal.selfComments && (
                  <p className="text-sm text-muted-foreground">{appraisal.selfComments}</p>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">Manager review</CardTitle>
                <AppraisalStatusChip status={appraisal.status} />
              </CardHeader>
              <CardContent className="space-y-2">
                <RatingBadge rating={appraisal.managerRating} scaleMax={template?.ratingScaleMax} />
                {appraisal.managerComments && (
                  <p className="text-sm text-muted-foreground">{appraisal.managerComments}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {appraisal.status !== "PENDING_REVIEWER" ? (
            <EmptyState
              title="Not awaiting reviewer assessment"
              description={`This appraisal is currently in status ${appraisal.status.replace(/_/g, " ")}.`}
            />
          ) : (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">
                  Your assessment
                  {template && (
                    <span className="ml-1 font-normal text-muted-foreground">
                      ({template.ratingScaleMin}–{template.ratingScaleMax})
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="f-rating">
                    Rating<span className="ml-0.5 text-destructive">*</span>
                  </Label>
                  <Input
                    id="f-rating"
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    min={template?.ratingScaleMin}
                    max={template?.ratingScaleMax}
                    value={rating}
                    onChange={(e) => setRating(e.target.value)}
                    className="max-w-[10rem]"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-comments">Comments</Label>
                  <Textarea
                    id="f-comments"
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    maxLength={4000}
                    rows={6}
                  />
                </div>
                <div className="flex justify-end">
                  <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                    Submit reviewer assessment
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit reviewer assessment?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, this appraisal moves to calibration and your rating can no longer be
              edited.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void submit();
              }}
              disabled={submitting}
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
