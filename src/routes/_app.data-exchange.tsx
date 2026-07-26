import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeftRight, History as HistoryIcon, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  ApiError,
  DEFAULT_TENANT_ID,
  dataExchangeApi,
  type DataExchangeHistoryEntry,
  type DataExchangeRecordDto,
  type DataExchangeStatus,
} from "@/lib/api-client";

// Sprint 14.3 — Data Exchange Queue + History. Tracks the operational lifecycle of exchanging
// payroll/HR data with an external system (no connector performs the actual call — see
// com.ewos.dataexchange). Reuses the Table/Card building blocks already established for the
// Provider Dashboard (Sprint 14.2) rather than CrudScreen, since this screen's actions are
// lifecycle transitions (Retry/Acknowledge/Cancel), not generic create/edit/delete.

export const Route = createFileRoute("/_app/data-exchange")({
  head: () => ({
    meta: [{ title: "Data Exchange — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: DataExchangePage,
});

const STATUS_TONE: Record<DataExchangeStatus, StatusTone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SUCCESS: "success",
  FAILED: "danger",
  RETRY: "warning",
  ACKNOWLEDGED: "success",
  CANCELLED: "neutral",
};

const STATUS_OPTIONS: DataExchangeStatus[] = [
  "PENDING",
  "PROCESSING",
  "SUCCESS",
  "FAILED",
  "RETRY",
  "ACKNOWLEDGED",
  "CANCELLED",
];

function DataExchangePage() {
  const [rows, setRows] = useState<DataExchangeRecordDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [statusFilter, setStatusFilter] = useState<DataExchangeStatus | "ALL">("ALL");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [historyFor, setHistoryFor] = useState<DataExchangeRecordDto | null>(null);
  const [history, setHistory] = useState<DataExchangeHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await dataExchangeApi.list(
        DEFAULT_TENANT_ID,
        statusFilter === "ALL" ? undefined : statusFilter,
      );
      setRows(data);
      setUnavailable(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setUnavailable(true);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Failed to load data exchange queue.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const act = async (
    id: string,
    action: "retry" | "acknowledge" | "cancel",
    successLabel: string,
  ) => {
    setBusyId(id);
    try {
      await dataExchangeApi[action](id);
      toast.success(successLabel);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  const openHistory = async (row: DataExchangeRecordDto) => {
    setHistoryFor(row);
    setHistoryLoading(true);
    try {
      setHistory(await dataExchangeApi.history(row.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load history.");
    } finally {
      setHistoryLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Outsourcing"
        title="Data Exchange"
        description="Operational queue for exchanging payroll & HR data with an external system."
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as DataExchangeStatus | "ALL")}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : unavailable ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Coming soon"
            description="The data exchange endpoint (GET /api/v1/data-exchange) is not yet available on the backend."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ArrowLeftRight}
            title="Queue is empty"
            description="Data exchange records are created automatically from payroll events (run finalized, payslip finalized)."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Correlation ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Retries</TableHead>
                  <TableHead>Error</TableHead>
                  <TableHead className="w-64 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.exchangeType}</TableCell>
                    <TableCell className="text-sm font-mono text-xs">{r.correlationId}</TableCell>
                    <TableCell>
                      <StatusChip tone={STATUS_TONE[r.status]}>{r.status}</StatusChip>
                    </TableCell>
                    <TableCell className="text-sm">{r.retryCount}</TableCell>
                    <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                      {r.errorCode ? `${r.errorCode}: ${r.errorMessage ?? ""}` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => void openHistory(r)}
                          aria-label="View history"
                        >
                          <HistoryIcon className="h-4 w-4" />
                        </Button>
                        {r.status === "FAILED" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => void act(r.id, "retry", "Retry scheduled")}
                          >
                            Retry
                          </Button>
                        )}
                        {r.status === "SUCCESS" && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => void act(r.id, "acknowledge", "Acknowledged")}
                          >
                            Acknowledge
                          </Button>
                        )}
                        {["PENDING", "PROCESSING", "FAILED", "RETRY"].includes(r.status) && (
                          <Button
                            variant="ghost"
                            size="sm"
                            disabled={busyId === r.id}
                            onClick={() => void act(r.id, "cancel", "Cancelled")}
                          >
                            Cancel
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
      </div>

      <Dialog open={historyFor !== null} onOpenChange={(o) => !o && setHistoryFor(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>History — {historyFor?.exchangeType}</DialogTitle>
            <DialogDescription>{historyFor?.correlationId}</DialogDescription>
          </DialogHeader>
          {historyLoading ? (
            <div className="grid place-items-center p-8">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => (
                <li key={h.id} className="rounded-md border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    {h.fromStatus && (
                      <>
                        <StatusChip tone={STATUS_TONE[h.fromStatus]}>{h.fromStatus}</StatusChip>
                        <span className="text-muted-foreground">→</span>
                      </>
                    )}
                    <StatusChip tone={STATUS_TONE[h.toStatus]}>{h.toStatus}</StatusChip>
                  </div>
                  {h.notes && <p className="mt-1 text-xs text-muted-foreground">{h.notes}</p>}
                  <div className="mt-1 text-xs text-muted-foreground">{h.occurredAt}</div>
                </li>
              ))}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
