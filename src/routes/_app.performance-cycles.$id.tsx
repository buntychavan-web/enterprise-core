import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Loader2, Rocket, Scale, UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { HistoryTimeline, type HistoryEntry } from "@/components/ewos/HistoryTimeline";
import { CycleStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { CycleStageStepper } from "@/components/ewos/CycleStageStepper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequirePermission } from "@/lib/permissions";
import {
  ApiError,
  PERFORMANCE_CYCLE_TRANSITIONS,
  performanceCycleApi,
  type PerformanceCycleDto,
  type PerformanceCycleStatus,
  type PerformanceCycleTransitionDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-cycles/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Appraisal Cycle ${params.id} — EWOS` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PerformanceCycleDetailPage,
});

function PerformanceCycleDetailPage() {
  const { id } = Route.useParams();
  const [cycle, setCycle] = useState<PerformanceCycleDto | null>(null);
  const [transitions, setTransitions] = useState<PerformanceCycleTransitionDto[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [transitionOpen, setTransitionOpen] = useState(false);
  const [target, setTarget] = useState<PerformanceCycleStatus | "">("");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [c, t] = await Promise.all([
        performanceCycleApi.getById(id),
        performanceCycleApi.transitions(id),
      ]);
      setCycle(c);
      setTransitions(t);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(err instanceof ApiError ? err.message : "Failed to load this cycle.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const openTransition = () => {
    setTarget("");
    setNotes("");
    setTransitionOpen(true);
  };

  const submitTransition = async () => {
    if (!cycle || !target) return;
    setBusy(true);
    try {
      const updated = await performanceCycleApi.transition(
        cycle.id,
        target,
        notes.trim() || undefined,
      );
      toast.success(`Cycle moved to ${target.replace(/_/g, " ")}`);
      setCycle(updated);
      setTransitionOpen(false);
      const t = await performanceCycleApi.transitions(id);
      setTransitions(t);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to transition cycle.");
    } finally {
      setBusy(false);
    }
  };

  const historyEntries: HistoryEntry[] = transitions.map((t) => ({
    id: t.id,
    occurredAt: t.transitionedAt,
    actor: t.transitionedBy,
    action: `${t.fromStatus.replace(/_/g, " ")} → ${t.toStatus.replace(/_/g, " ")}`,
    notes: t.notes,
  }));

  if (loading) {
    return (
      <div className="grid place-items-center p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (notFound || !cycle) {
    return (
      <div className="space-y-6">
        <BackLink />
        <EmptyState
          title="Cycle not found"
          description={
            error ?? "This appraisal cycle doesn't exist or you don't have access to it."
          }
        />
      </div>
    );
  }

  const allowedTargets = PERFORMANCE_CYCLE_TRANSITIONS[cycle.status];

  return (
    <div className="space-y-6">
      <BackLink />

      <PageHeader
        eyebrow="Performance"
        title={cycle.name}
        description={`${cycle.code} · ${cycle.periodStart} – ${cycle.periodEnd}`}
        actions={
          <RequirePermission code="PERF_WRITE">
            {allowedTargets.length > 0 && (
              <Button size="sm" onClick={openTransition}>
                Transition
              </Button>
            )}
          </RequirePermission>
        }
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Lifecycle</CardTitle>
          <CycleStatusChip status={cycle.status} />
        </CardHeader>
        <CardContent>
          <CycleStageStepper status={cycle.status} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Quick links</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <QuickLink
              to="/bulk-appraisal-launch"
              search={{ cycleId: cycle.id }}
              icon={Rocket}
              title="Bulk Appraisal Launch"
              description="Launch appraisals for this cycle in bulk."
            />
            <QuickLink
              to="/performance-employee-assignment"
              search={{ cycleId: cycle.id }}
              icon={UserCog}
              title="Employee Assignment"
              description="Open a single employee's appraisal."
            />
            <QuickLink
              to="/performance-calibration"
              search={{ cycleId: cycle.id }}
              icon={Scale}
              title="Calibration"
              description="Calibrate and adjust ratings."
            />
            <QuickLink
              to="/performance-reports"
              search={{ cycleId: cycle.id }}
              icon={ArrowUpRight}
              title="Reports"
              description="Progress, pending reviews, and summaries."
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Due dates</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <DueDate label="Self review" value={cycle.selfAssessmentDue} />
              <DueDate label="Manager review" value={cycle.managerAssessmentDue} />
              <DueDate label="Reviewer review" value={cycle.reviewerAssessmentDue} />
              <DueDate label="Calibration" value={cycle.calibrationDue} />
            </dl>
            {cycle.description && (
              <p className="mt-4 text-sm text-muted-foreground">{cycle.description}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Transition history</CardTitle>
        </CardHeader>
        <CardContent>
          <HistoryTimeline entries={historyEntries} />
        </CardContent>
      </Card>

      <Dialog open={transitionOpen} onOpenChange={setTransitionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Transition cycle</DialogTitle>
            <DialogDescription>Current status: {cycle.status.replace(/_/g, " ")}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-target">
                Target status<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select value={target} onValueChange={(v) => setTarget(v as PerformanceCycleStatus)}>
                <SelectTrigger id="f-target">
                  <SelectValue placeholder="Select target status" />
                </SelectTrigger>
                <SelectContent>
                  {allowedTargets.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-notes">Notes</Label>
              <Textarea id="f-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransitionOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitTransition()} disabled={busy || !target}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/performance-cycles"
      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to cycles
    </Link>
  );
}

function DueDate({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-0.5">{value ?? "—"}</dd>
    </div>
  );
}

function QuickLink({
  to,
  search,
  icon: Icon,
  title,
  description,
}: {
  to:
    | "/bulk-appraisal-launch"
    | "/performance-employee-assignment"
    | "/performance-calibration"
    | "/performance-reports";
  search: { cycleId: string };
  icon: typeof Rocket;
  title: string;
  description: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between text-sm font-medium text-foreground">
          {title}
          <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
        </span>
        <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
      </span>
    </Link>
  );
}
