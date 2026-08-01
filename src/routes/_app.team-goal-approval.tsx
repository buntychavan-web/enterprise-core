import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Goal as GoalIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { usePermissions } from "@/lib/permissions";
import {
  ApiError,
  employeeReportsApi,
  goalApi,
  type GoalDto,
  type GoalStatus,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/team-goal-approval")({
  head: () => ({
    meta: [{ title: "Goal Approval — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamGoalApprovalPage,
});

const STATUS_TONE: Record<GoalStatus, StatusTone> = {
  DRAFT: "neutral",
  ASSIGNED: "info",
  IN_PROGRESS: "info",
  UNDER_REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

type EmployeeOption = ResourceRecord & { id: string; displayName?: string };
type GoalRow = GoalDto & { employeeLabel: string };

function TeamGoalApprovalPage() {
  const { has } = usePermissions();
  const canReview = has("GOAL_REVIEW");

  const [rows, setRows] = useState<GoalRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [reviewing, setReviewing] = useState<GoalRow | null>(null);
  const [reviewScore, setReviewScore] = useState("");
  const [reviewNotes, setReviewNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const reports = (await employeeReportsApi.myReports()) as EmployeeOption[];
      const perEmployee = await Promise.all(
        reports.map(async (r) => {
          const goals = await goalApi.byEmployee(r.id);
          return goals.map((g) => ({ ...g, employeeLabel: r.displayName ?? r.id }));
        }),
      );
      const flattened = perEmployee
        .flat()
        .filter((g) => g.status === "IN_PROGRESS" || g.status === "UNDER_REVIEW");
      setRows(flattened);
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setError(
          "You don't have permission to view team goals. This requires the GOAL_READ authority.",
        );
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to load your team's goals.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canReview) void load();
    else setLoading(false);
  }, [canReview]);

  const openReview = (g: GoalRow) => {
    setReviewing(g);
    setReviewScore("");
    setReviewNotes("");
  };

  const submitReview = async () => {
    if (!reviewing) return;
    const value = Number(reviewScore);
    if (reviewScore.trim() === "" || Number.isNaN(value)) {
      toast.error("A review score is required");
      return;
    }
    setBusy(true);
    try {
      await goalApi.review(reviewing.id, {
        reviewScore: value,
        notes: reviewNotes.trim() || undefined,
      });
      toast.success("Goal reviewed");
      setReviewing(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to review goal.");
    } finally {
      setBusy(false);
    }
  };

  const completeGoal = async (id: string) => {
    setBusy(true);
    try {
      await goalApi.complete(id);
      toast.success("Goal completed");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to complete goal.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Goal Approval"
        description="Review and complete goals submitted by your direct reports."
      />

      {!canReview ? (
        <EmptyState
          title="Requires GOAL_REVIEW"
          description="Reviewing team goals requires the GOAL_REVIEW authority."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load team goals" description={error} />
      ) : !rows || rows.length === 0 ? (
        <EmptyState
          icon={GoalIcon}
          title="Nothing to review"
          description="No team goals are currently in progress or under review."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Goal</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Progress</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((g) => (
                <TableRow key={g.id}>
                  <TableCell className="text-sm">{g.employeeLabel}</TableCell>
                  <TableCell className="text-sm font-medium">{g.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{g.goalType}</TableCell>
                  <TableCell className="tabular-nums text-sm text-muted-foreground">
                    {(g.progressPercent ?? 0).toFixed(0)}%
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={STATUS_TONE[g.status]}>
                      {g.status.replace(/_/g, " ")}
                    </StatusChip>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openReview(g)}
                        disabled={busy}
                      >
                        Review
                      </Button>
                      {g.status === "UNDER_REVIEW" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void completeGoal(g.id)}
                          disabled={busy}
                        >
                          Complete
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={reviewing !== null} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Review goal</DialogTitle>
            <DialogDescription>{reviewing?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-score">
                Review score<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-score"
                type="number"
                step="0.1"
                value={reviewScore}
                onChange={(e) => setReviewScore(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-review-notes">Notes</Label>
              <Textarea
                id="f-review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                maxLength={4000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewing(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitReview()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
