import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatCard } from "@/components/ewos/StatCard";
import { CalibrationSessionStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  appraisalApi,
  calibrationSessionApi,
  performanceCycleApi,
  performanceReportsApi,
  type AppraisalReportRowDto,
  type CalibrationSessionDto,
  type CalibrationSummaryDto,
  type PerformanceCycleDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-calibration")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Calibration — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: CalibrationPage,
});

function CalibrationPage() {
  const { tenantId, activeCompanyId } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();

  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [rows, setRows] = useState<AppraisalReportRowDto[]>([]);
  const [summary, setSummary] = useState<CalibrationSummaryDto | null>(null);
  const [sessions, setSessions] = useState<CalibrationSessionDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [calibrating, setCalibrating] = useState<AppraisalReportRowDto | null>(null);
  const [calRating, setCalRating] = useState("");
  const [calBand, setCalBand] = useState("");
  const [calNotes, setCalNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [sessionOpen, setSessionOpen] = useState(false);
  const [sessionName, setSessionName] = useState("");

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then(setCycles)
      .catch(() => setCycles([]));
  }, [activeCompanyId]);

  const load = async () => {
    if (!cycleId) return;
    setLoading(true);
    setError(null);
    try {
      const [report, calSummary, calSessions] = await Promise.all([
        appraisalApi.reportByCycle(cycleId),
        performanceReportsApi.calibrationSummary(cycleId),
        calibrationSessionApi.listForCycle(cycleId),
      ]);
      setRows(report.filter((r) => r.status === "CALIBRATION"));
      setSummary(calSummary);
      setSessions(calSessions);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load calibration data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId]);

  const openCalibrate = (row: AppraisalReportRowDto) => {
    setCalibrating(row);
    setCalRating(row.reviewerRating !== undefined ? String(row.reviewerRating) : "");
    setCalBand("");
    setCalNotes("");
  };

  const submitCalibrate = async () => {
    if (!calibrating) return;
    const value = Number(calRating);
    if (calRating.trim() === "" || Number.isNaN(value)) {
      toast.error("A calibrated rating is required");
      return;
    }
    setBusy(true);
    try {
      await appraisalApi.calibrate(calibrating.appraisalId, {
        calibratedRating: value,
        finalBand: calBand.trim() || undefined,
        notes: calNotes.trim() || undefined,
      });
      toast.success("Rating calibrated");
      setCalibrating(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to calibrate rating.");
    } finally {
      setBusy(false);
    }
  };

  const submitCreateSession = async () => {
    if (!tenantId || !activeCompanyId || !cycleId || !sessionName.trim()) {
      toast.error("Session name is required");
      return;
    }
    setBusy(true);
    try {
      await calibrationSessionApi.create({
        tenantId,
        companyId: activeCompanyId,
        cycleId,
        name: sessionName.trim(),
      });
      toast.success("Calibration session created");
      setSessionOpen(false);
      setSessionName("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create session.");
    } finally {
      setBusy(false);
    }
  };

  const completeSession = async (id: string) => {
    setBusy(true);
    try {
      await calibrationSessionApi.complete(id);
      toast.success("Session completed");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to complete session.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Calibration"
        description="Compare reviewer ratings against calibrated outcomes and run calibration sessions."
      />

      <div className="max-w-xs space-y-1.5">
        <Label htmlFor="f-cycle">Cycle</Label>
        <Select value={cycleId} onValueChange={setCycleId}>
          <SelectTrigger id="f-cycle">
            <SelectValue placeholder="Select a cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {!cycleId ? (
        <EmptyState title="Select a cycle" description="Choose an appraisal cycle to calibrate." />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load calibration data" description={error} />
      ) : (
        <>
          {summary && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Total calibrated"
                icon={<Scale className="h-5 w-5" />}
                value={summary.totalCalibrated}
              />
              <StatCard
                label="Adjusted up"
                value={summary.adjustedUp}
                icon={<Scale className="h-5 w-5" />}
              />
              <StatCard
                label="Adjusted down"
                value={summary.adjustedDown}
                icon={<Scale className="h-5 w-5" />}
              />
              <StatCard
                label="Average delta"
                value={summary.averageDelta.toFixed(2)}
                icon={<Scale className="h-5 w-5" />}
              />
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Awaiting calibration</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {rows.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                  No appraisals currently awaiting calibration in this cycle.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Self</TableHead>
                        <TableHead>Manager</TableHead>
                        <TableHead>Reviewer</TableHead>
                        <TableHead className="w-28" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.appraisalId}>
                          <TableCell className="text-sm font-medium">
                            {r.employeeName ?? r.employeeNumber ?? r.employeeId}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {r.selfRating ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {r.managerRating ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {r.reviewerRating ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => openCalibrate(r)}>
                              Calibrate
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Calibration sessions</CardTitle>
              <Button size="sm" variant="outline" onClick={() => setSessionOpen(true)}>
                New session
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {sessions.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">
                  No calibration sessions yet.
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {sessions.map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <div>
                        <div className="font-medium text-foreground">{s.name}</div>
                        {s.scheduledAt && (
                          <div className="text-xs text-muted-foreground">
                            {s.scheduledAt.slice(0, 16).replace("T", " ")}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <CalibrationSessionStatusChip status={s.status} />
                        {(s.status === "PLANNED" || s.status === "IN_PROGRESS") && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => void completeSession(s.id)}
                            disabled={busy}
                          >
                            Complete
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <Dialog open={calibrating !== null} onOpenChange={(o) => !o && setCalibrating(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Calibrate rating</DialogTitle>
            <DialogDescription>
              {calibrating?.employeeName ?? calibrating?.employeeId}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-cal-rating">
                Calibrated rating<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-cal-rating"
                type="number"
                step="0.1"
                value={calRating}
                onChange={(e) => setCalRating(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cal-band">Final band</Label>
              <Input
                id="f-cal-band"
                value={calBand}
                onChange={(e) => setCalBand(e.target.value)}
                maxLength={32}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-cal-notes">Notes</Label>
              <Textarea
                id="f-cal-notes"
                value={calNotes}
                onChange={(e) => setCalNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCalibrating(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitCalibrate()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionOpen} onOpenChange={setSessionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New calibration session</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-session-name">
              Name<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="f-session-name"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              maxLength={256}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSessionOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreateSession()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
