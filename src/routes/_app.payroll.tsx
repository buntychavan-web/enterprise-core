import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BadgeCheck,
  CalendarRange,
  Download,
  Lock,
  Loader2,
  Play,
  Snowflake,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { DataPagination } from "@/components/ewos/DataPagination";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { payrollApi, type PayrollPeriodResponse, type PayrollRunResponse } from "@/lib/api-client";
import { downloadCsv, timestampedName } from "@/lib/export";
import { formatDate, formatMoney, formatNumber, humanizeEnum } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/_app/payroll")({
  head: () => ({
    meta: [
      { title: "Payroll Administration — EWOS" },
      {
        name: "description",
        content: "Manage payroll periods, execute runs and publish payslips.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayrollAdminPage,
});

const PAGE_SIZE = 20;

function statusTone(status?: string) {
  const s = (status ?? "").toUpperCase();
  if (["FINALIZED", "PUBLISHED", "APPROVED", "CLOSED"].includes(s)) return "success" as const;
  if (["FROZEN", "LOCKED", "IN_PROGRESS", "PROCESSING"].includes(s)) return "info" as const;
  if (["FAILED", "CANCELLED"].includes(s)) return "danger" as const;
  if (["OPEN", "DRAFT"].includes(s)) return "warning" as const;
  return "neutral" as const;
}

function PayrollAdminPage() {
  const qc = useQueryClient();
  const { hasAnyPermission, roles } = useAuth();
  const isAdmin =
    roles.some((r) => /admin|payroll/i.test(r)) ||
    hasAnyPermission(["PAYROLL_MANAGE", "PAYROLL_RUN", "PAYROLL_ADMIN"]);

  const [periodPage, setPeriodPage] = useState(1);
  const [runPage, setRunPage] = useState(1);
  const [runFilter, setRunFilter] = useState("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    action: () => void;
  } | null>(null);

  const summary = useQuery({
    queryKey: ["payroll", "dashboard"],
    queryFn: ({ signal }) => payrollApi.dashboard(signal),
  });

  const periods = useQuery({
    queryKey: ["payroll", "periods", periodPage],
    queryFn: ({ signal }) =>
      payrollApi.periods(
        { page: periodPage - 1, size: PAGE_SIZE, sort: "periodStart,desc" },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const runs = useQuery({
    queryKey: ["payroll", "runs", runPage, runFilter],
    queryFn: ({ signal }) =>
      payrollApi.runs(
        {
          page: runPage - 1,
          size: PAGE_SIZE,
          sort: "startedAt,desc",
          status: runFilter === "all" ? undefined : runFilter,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const invalidate = () => void qc.invalidateQueries({ queryKey: ["payroll"] });

  const mutate = (fn: (id: string) => Promise<unknown>, success: string) =>
    ({
      mutationFn: fn,
      onSuccess: () => {
        toast.success(success);
        invalidate();
      },
      onError: (e: unknown) =>
        toast.error(e instanceof Error ? e.message : "The action could not be completed."),
    }) as const;

  const closePeriod = useMutation(mutate(payrollApi.closePeriod, "Period closed"));
  const lockPeriod = useMutation(mutate(payrollApi.lockPeriod, "Period locked"));
  const freezeRun = useMutation(mutate(payrollApi.freezeRun, "Run frozen"));
  const finalizeRun = useMutation(
    mutate(payrollApi.finalizeRun, "Run finalized — payslips are now visible to employees"),
  );

  const periodRows = useMemo(() => periods.data?.content ?? [], [periods.data]);
  const runRows = useMemo(() => runs.data?.content ?? [], [runs.data]);


  const periodById = useMemo(() => {
    const map = new Map<string, PayrollPeriodResponse>();
    for (const p of periodRows) map.set(p.id, p);
    return map;
  }, [periodRows]);

  const kpis = useMemo(() => {
    const d = (summary.data ?? {}) as Record<string, unknown>;
    const num = (...keys: string[]) => {
      for (const k of keys) {
        const v = d[k];
        if (typeof v === "number") return v;
      }
      return null;
    };
    return {
      openPeriods:
        num("openPeriods", "openPeriodCount") ??
        periodRows.filter((p) => (p.status ?? "").toUpperCase() === "OPEN").length,
      activeRuns:
        num("activeRuns", "runsInProgress") ??
        runRows.filter((r) => !["FINALIZED", "CANCELLED"].includes((r.status ?? "").toUpperCase()))
          .length,
      netPaid: num("netAmount", "totalNet", "netPaid"),
      employees: num("employeeCount", "employeesPaid", "headcount"),
    };
  }, [summary.data, periodRows, runRows]);

  const exportRuns = () => {
    downloadCsv(timestampedName("payroll-runs"), runRows, [
      { key: "id", header: "Run ID", value: (r) => r.id },
      {
        key: "period",
        header: "Period",
        value: (r) => periodById.get(r.payrollPeriodId ?? "")?.code ?? r.payrollPeriodId,
      },
      { key: "type", header: "Type", value: (r) => r.runType },
      { key: "status", header: "Status", value: (r) => r.status },
      { key: "employees", header: "Employees", value: (r) => r.employeeCount },
      { key: "gross", header: "Gross", value: (r) => r.grossAmount },
      { key: "net", header: "Net", value: (r) => r.netAmount },
      { key: "finalizedAt", header: "Finalized at", value: (r) => r.finalizedAt },
    ]);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll"
        title="Payroll Administration"
        description="Periods, runs and statutory outputs for the active company."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportRuns}
              disabled={runRows.length === 0}
            >
              <Download className="h-4 w-4" />
              Export runs
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)} disabled={!isAdmin}>
              <Play className="h-4 w-4" />
              New run
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open periods"
          value={kpis.openPeriods}
          loading={periods.isLoading}
          unavailable={!!periods.error}
          icon={<CalendarRange className="h-4 w-4" />}
          hint="Accepting payroll input"
        />
        <StatCard
          label="Active runs"
          value={kpis.activeRuns}
          loading={runs.isLoading}
          unavailable={!!runs.error}
          icon={<Play className="h-4 w-4" />}
          hint="Not yet finalized"
        />
        <StatCard
          label="Net disbursed"
          value={kpis.netPaid === null ? null : formatMoney(kpis.netPaid)}
          loading={summary.isLoading}
          unavailable={!!summary.error || kpis.netPaid === null}
          icon={<Wallet className="h-4 w-4" />}
          hint="Reported by the payroll service"
        />
        <StatCard
          label="Employees paid"
          value={kpis.employees}
          loading={summary.isLoading}
          unavailable={!!summary.error || kpis.employees === null}
          icon={<BadgeCheck className="h-4 w-4" />}
          hint="Latest finalized run"
        />
      </div>

      <Tabs defaultValue="runs">
        <TabsList>
          <TabsTrigger value="runs">Runs</TabsTrigger>
          <TabsTrigger value="periods">Periods</TabsTrigger>
        </TabsList>

        <TabsContent value="runs" className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Label htmlFor="run-status" className="text-xs text-muted-foreground">
              Status
            </Label>
            <Select
              value={runFilter}
              onValueChange={(v) => {
                setRunFilter(v);
                setRunPage(1);
              }}
            >
              <SelectTrigger id="run-status" className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="IN_PROGRESS">In progress</SelectItem>
                <SelectItem value="FROZEN">Frozen</SelectItem>
                <SelectItem value="FINALIZED">Finalized</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-lg border border-border bg-card">
            <QueryState
              isLoading={runs.isLoading}
              error={runs.error}
              onRetry={() => void runs.refetch()}
              label="payroll runs"
            >
              {runRows.length === 0 ? (
                <EmptyState
                  icon={Play}
                  title="No payroll runs"
                  description="Create a run against an open period to calculate payslips."
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Period</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead className="text-right">Employees</TableHead>
                          <TableHead className="text-right">Gross</TableHead>
                          <TableHead className="text-right">Net</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {runRows.map((run) => (
                          <RunRow
                            key={run.id}
                            run={run}
                            period={periodById.get(run.payrollPeriodId ?? "")}
                            canManage={isAdmin}
                            busy={freezeRun.isPending || finalizeRun.isPending}
                            onFreeze={() =>
                              setConfirm({
                                title: "Freeze this run?",
                                body: "Freezing stops further recalculation. You can still finalize afterwards.",
                                action: () => freezeRun.mutate(run.id),
                              })
                            }
                            onFinalize={() =>
                              setConfirm({
                                title: "Finalize this run?",
                                body: "Finalizing publishes payslips to employees. This cannot be undone.",
                                action: () => finalizeRun.mutate(run.id),
                              })
                            }
                          />
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <DataPagination
                    page={runPage}
                    pageSize={PAGE_SIZE}
                    total={runs.data?.totalElements ?? runRows.length}
                    onPageChange={setRunPage}
                  />
                </>
              )}
            </QueryState>
          </div>
        </TabsContent>

        <TabsContent value="periods" className="mt-4">
          <div className="rounded-lg border border-border bg-card">
            <QueryState
              isLoading={periods.isLoading}
              error={periods.error}
              onRetry={() => void periods.refetch()}
              label="payroll periods"
            >
              {periodRows.length === 0 ? (
                <EmptyState
                  icon={CalendarRange}
                  title="No payroll periods"
                  description="Periods are generated by the payroll calendar configuration."
                />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Code</TableHead>
                          <TableHead>From</TableHead>
                          <TableHead>To</TableHead>
                          <TableHead>Pay date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {periodRows.map((p) => {
                          const status = (p.status ?? "").toUpperCase();
                          return (
                            <TableRow key={p.id}>
                              <TableCell className="text-sm font-medium">{p.code ?? "—"}</TableCell>
                              <TableCell className="text-sm">{formatDate(p.periodStart)}</TableCell>
                              <TableCell className="text-sm">{formatDate(p.periodEnd)}</TableCell>
                              <TableCell className="text-sm">{formatDate(p.payDate)}</TableCell>
                              <TableCell>
                                <StatusChip tone={statusTone(p.status)}>
                                  {humanizeEnum(p.status)}
                                </StatusChip>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {status === "OPEN" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isAdmin || closePeriod.isPending}
                                      onClick={() =>
                                        setConfirm({
                                          title: "Close this period?",
                                          body: "Closing stops new payroll input for the period.",
                                          action: () => closePeriod.mutate(p.id),
                                        })
                                      }
                                    >
                                      Close
                                    </Button>
                                  )}
                                  {status === "CLOSED" && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      disabled={!isAdmin || lockPeriod.isPending}
                                      onClick={() =>
                                        setConfirm({
                                          title: "Lock this period?",
                                          body: "Locking freezes the period permanently for audit.",
                                          action: () => lockPeriod.mutate(p.id),
                                        })
                                      }
                                    >
                                      <Lock className="h-3.5 w-3.5" /> Lock
                                    </Button>
                                  )}
                                  {!["OPEN", "CLOSED"].includes(status) && (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                  <DataPagination
                    page={periodPage}
                    pageSize={PAGE_SIZE}
                    total={periods.data?.totalElements ?? periodRows.length}
                    onPageChange={setPeriodPage}
                  />
                </>
              )}
            </QueryState>
          </div>
        </TabsContent>
      </Tabs>

      <CreateRunDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        periods={periodRows}
        onCreated={invalidate}
      />

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirm?.body}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                confirm?.action();
                setConfirm(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RunRow({
  run,
  period,
  canManage,
  busy,
  onFreeze,
  onFinalize,
}: {
  run: PayrollRunResponse;
  period?: PayrollPeriodResponse;
  canManage: boolean;
  busy: boolean;
  onFreeze: () => void;
  onFinalize: () => void;
}) {
  const status = (run.status ?? "").toUpperCase();
  return (
    <TableRow>
      <TableCell className="text-sm font-medium">
        {(period?.code ?? period?.periodStart) ? (
          <>
            {period?.code ?? formatDate(period?.periodStart)}
            <div className="text-xs font-normal text-muted-foreground">
              {formatDate(period?.periodStart)} – {formatDate(period?.periodEnd)}
            </div>
          </>
        ) : (
          (run.payrollPeriodId ?? "—")
        )}
      </TableCell>
      <TableCell className="text-sm">{humanizeEnum(run.runType)}</TableCell>
      <TableCell className="text-right text-sm">{formatNumber(run.employeeCount)}</TableCell>
      <TableCell className="text-right text-sm">{formatMoney(run.grossAmount)}</TableCell>
      <TableCell className="text-right text-sm font-semibold">
        {formatMoney(run.netAmount)}
      </TableCell>
      <TableCell>
        <StatusChip tone={statusTone(run.status)}>{humanizeEnum(run.status)}</StatusChip>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex justify-end gap-2">
          {["DRAFT", "IN_PROGRESS", "PROCESSING"].includes(status) && (
            <Button size="sm" variant="outline" disabled={!canManage || busy} onClick={onFreeze}>
              <Snowflake className="h-3.5 w-3.5" /> Freeze
            </Button>
          )}
          {status === "FROZEN" && (
            <Button size="sm" disabled={!canManage || busy} onClick={onFinalize}>
              <BadgeCheck className="h-3.5 w-3.5" /> Finalize
            </Button>
          )}
          {status === "FINALIZED" && (
            <span className="text-xs text-muted-foreground">Complete</span>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
}

function CreateRunDialog({
  open,
  onOpenChange,
  periods,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  periods: PayrollPeriodResponse[];
  onCreated: () => void;
}) {
  const [periodId, setPeriodId] = useState("");
  const [error, setError] = useState("");

  const create = useMutation({
    mutationFn: () => payrollApi.createRun({ payrollPeriodId: periodId }),
    onSuccess: () => {
      toast.success("Payroll run created");
      setPeriodId("");
      onOpenChange(false);
      onCreated();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create the run."),
  });

  const selectable = periods.filter((p) => (p.status ?? "").toUpperCase() === "OPEN");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New payroll run</DialogTitle>
          <DialogDescription>
            Calculates payslips for every eligible employee in the selected period.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-1.5">
          <Label htmlFor="period">
            Payroll period
            <span className="ml-0.5 text-destructive" aria-hidden>
              *
            </span>
          </Label>
          <Select value={periodId} onValueChange={setPeriodId}>
            <SelectTrigger id="period" aria-invalid={!!error}>
              <SelectValue placeholder="Select an open period…" />
            </SelectTrigger>
            <SelectContent>
              {selectable.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code ?? `${formatDate(p.periodStart)} – ${formatDate(p.periodEnd)}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectable.length === 0 && (
            <p className="text-xs text-muted-foreground">
              No open periods are available for a new run.
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={create.isPending}
            onClick={() => {
              if (!periodId) {
                setError("Select the period to run payroll for.");
                return;
              }
              setError("");
              create.mutate();
            }}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create run
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
