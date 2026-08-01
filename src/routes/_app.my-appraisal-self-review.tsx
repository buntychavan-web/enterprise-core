import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
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

export const Route = createFileRoute("/_app/my-appraisal-self-review")({
  head: () => ({
    meta: [{ title: "Self Review — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: SelfReviewPage,
});

function SelfReviewPage() {
  const [appraisal, setAppraisal] = useState<AppraisalDto | null | undefined>(undefined);
  const [template, setTemplate] = useState<AppraisalTemplateDto | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [rating, setRating] = useState("");
  const [comments, setComments] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .myAppraisals()
      .then((all) => {
        if (cancelled) return;
        const pending = all.find((a) => a.status === "PENDING_SELF") ?? null;
        setAppraisal(pending);
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
      await performanceSelfServiceApi.submitSelf(appraisal.id, {
        rating: value,
        comments: comments.trim() || undefined,
      });
      toast.success("Self review submitted");
      setConfirmOpen(false);
      setAppraisal({ ...appraisal, status: "PENDING_MANAGER", selfRating: value });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit self review.");
    } finally {
      setSubmitting(false);
    }
  };

  if (appraisal === undefined) {
    return (
      <div className="grid place-items-center p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        to="/my-appraisal"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to my appraisal
      </Link>

      <PageHeader
        eyebrow="My Performance"
        title="Self Review"
        description="Rate your own performance for the current appraisal cycle and add supporting comments."
      />

      {error ? (
        <EmptyState title="Couldn't load your appraisal" description={error} />
      ) : !appraisal ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing to review"
          description="You have no appraisal currently awaiting your self review."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/my-appraisal">View my appraisal</Link>
            </Button>
          }
        />
      ) : appraisal.status !== "PENDING_SELF" ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Self review already submitted"
          description="Your self review has already been recorded for this appraisal."
          action={
            <Button asChild size="sm" variant="outline">
              <Link to="/my-appraisal">View my appraisal</Link>
            </Button>
          }
        />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Your rating
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
                placeholder="Summarise your achievements, challenges, and areas for growth this cycle."
                maxLength={4000}
                rows={6}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setConfirmOpen(true)} disabled={submitting}>
                Submit self review
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit self review?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, this appraisal moves to your manager for review and your rating can no
              longer be edited.
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
