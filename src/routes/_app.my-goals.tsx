import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Goal as GoalIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ApiError, goalSelfServiceApi, type GoalDto, type GoalStatus } from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-goals")({
  head: () => ({
    meta: [{ title: "Goals & KPI — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyGoalsPage,
});

const STATUS_TONE: Record<GoalStatus, StatusTone> = {
  DRAFT: "neutral",
  ASSIGNED: "info",
  IN_PROGRESS: "info",
  UNDER_REVIEW: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function MyGoalsPage() {
  const { user } = useAuth();
  const employeeId = user?.employeeId;

  const [goals, setGoals] = useState<GoalDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [progressGoal, setProgressGoal] = useState<GoalDto | null>(null);
  const [progressPercent, setProgressPercent] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      setGoals(await goalSelfServiceApi.myGoals());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your goals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const openProgress = (g: GoalDto) => {
    setProgressGoal(g);
    setProgressPercent(g.progressPercent !== undefined ? String(g.progressPercent) : "");
    setCurrentValue(g.currentValue ?? "");
    setNotes("");
  };

  const submitProgress = async () => {
    if (!progressGoal) return;
    const value = Number(progressPercent);
    if (progressPercent.trim() === "" || Number.isNaN(value) || value < 0 || value > 100) {
      toast.error("Progress must be a number between 0 and 100");
      return;
    }
    setBusy(true);
    try {
      await goalSelfServiceApi.recordMyProgress(progressGoal.id, {
        progressPercent: value,
        currentValue: currentValue.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success("Progress recorded");
      setProgressGoal(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record progress.");
    } finally {
      setBusy(false);
    }
  };

  const submitForReview = async (id: string) => {
    setBusy(true);
    try {
      await goalSelfServiceApi.submitMyGoalForReview(id);
      toast.success("Submitted for review");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit for review.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="Goals & KPI"
        description="Track and update progress on your assigned goals."
      />

      {!employeeId ? (
        <EmptyState
          icon={GoalIcon}
          title="No employee record linked"
          description="Your account isn't linked to an employee record, so goals can't be resolved."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load your goals" description={error} />
      ) : !goals || goals.length === 0 ? (
        <EmptyState
          icon={GoalIcon}
          title="No goals yet"
          description="You have no goals assigned yet."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => (
            <Card key={g.id}>
              <CardHeader className="flex-row items-start justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-semibold">{g.name}</CardTitle>
                <StatusChip tone={STATUS_TONE[g.status]}>{g.status.replace(/_/g, " ")}</StatusChip>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-xs text-muted-foreground">
                  {g.goalType} {g.weightage !== undefined && `· Weight ${g.weightage}%`}
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={g.progressPercent ?? 0} className="h-2" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {(g.progressPercent ?? 0).toFixed(0)}%
                  </span>
                </div>
                {g.target && (
                  <div className="text-xs text-muted-foreground">
                    Target: {g.target}
                    {g.unitOfMeasure ? ` ${g.unitOfMeasure}` : ""}
                  </div>
                )}
                {(g.status === "ASSIGNED" || g.status === "IN_PROGRESS") && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openProgress(g)}
                      disabled={busy}
                    >
                      Record progress
                    </Button>
                    {g.status === "IN_PROGRESS" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void submitForReview(g.id)}
                        disabled={busy}
                      >
                        Submit for review
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={progressGoal !== null} onOpenChange={(o) => !o && setProgressGoal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record progress</DialogTitle>
            <DialogDescription>{progressGoal?.name}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-progress">
                Progress %<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-progress"
                type="number"
                min={0}
                max={100}
                value={progressPercent}
                onChange={(e) => setProgressPercent(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-current-value">Current value</Label>
              <Input
                id="f-current-value"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                maxLength={256}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-notes">Notes</Label>
              <Textarea
                id="f-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={4000}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProgressGoal(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitProgress()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
