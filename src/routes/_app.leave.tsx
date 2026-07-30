import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CalendarPlus, CheckCircle2, Clock3, Loader2, Send, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { ApiError, leaveApi, type LeaveRequestResponse } from "@/lib/api-client";
import { formatDate, humanizeEnum, requestStatusTone } from "@/lib/format";

export const Route = createFileRoute("/_app/leave")({
  head: () => ({
    meta: [
      { title: "Leave — EWOS" },
      { name: "description", content: "Leave balances, requests and approvals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeavePage,
});

function LeavePage() {
  const qc = useQueryClient();
  const [applyOpen, setApplyOpen] = useState(false);

  const balances = useQuery({
    queryKey: ["leave", "balances"],
    queryFn: ({ signal }) => leaveApi.myBalances(signal),
  });

  const requests = useQuery({
    queryKey: ["leave", "requests"],
    queryFn: ({ signal }) => leaveApi.myRequests({ page: 0, size: 50 }, signal),
  });

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["leave"] });
  };

  const submitRequest = useMutation({
    mutationFn: (id: string) => leaveApi.submitRequest(id),
    onSuccess: () => {
      toast.success("Leave request submitted for approval");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Submit failed."),
  });

  const cancelRequest = useMutation({
    mutationFn: (id: string) => leaveApi.cancelRequest(id),
    onSuccess: () => {
      toast.success("Leave request cancelled");
      invalidate();
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Cancel failed."),
  });

  const rows = requests.data?.content ?? [];
  const totals = (balances.data ?? []).reduce(
    (acc, b) => ({
      available: acc.available + (b.availableDays ?? 0),
      used: acc.used + (b.usedDays ?? 0),
      pending: acc.pending + (b.pendingDays ?? 0),
    }),
    { available: 0, used: 0, pending: 0 },
  );
  const hasBalances = (balances.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self service"
        title="Leave"
        description="Your leave balances, requests, and approval status."
        actions={
          <Button size="sm" onClick={() => setApplyOpen(true)}>
            <CalendarPlus className="h-4 w-4" />
            Apply for leave
          </Button>
        }
      />

      <section aria-labelledby="leave-balance-heading">
        <h2 id="leave-balance-heading" className="sr-only">
          Leave balances
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Available"
            value={hasBalances ? totals.available : null}
            loading={balances.isLoading}
            unavailable={!!balances.error}
            icon={<CalendarDays className="h-4 w-4" />}
            hint="Days across all leave types"
          />
          <StatCard
            label="Pending approval"
            value={hasBalances ? totals.pending : null}
            loading={balances.isLoading}
            unavailable={!!balances.error}
            icon={<Clock3 className="h-4 w-4" />}
            hint="Days awaiting a decision"
          />
          <StatCard
            label="Used this year"
            value={hasBalances ? totals.used : null}
            loading={balances.isLoading}
            unavailable={!!balances.error}
            icon={<CheckCircle2 className="h-4 w-4" />}
            hint="Days consumed"
          />
        </div>
      </section>

      {hasBalances && (
        <section
          aria-labelledby="balance-detail-heading"
          className="rounded-lg border border-border bg-card"
        >
          <h2
            id="balance-detail-heading"
            className="border-b border-border px-4 py-3 text-sm font-semibold"
          >
            Balance by leave type
          </h2>
          <ul className="divide-y divide-border">
            {(balances.data ?? []).map((b, i) => (
              <li
                key={b.leaveTypeId ?? b.leaveTypeCode ?? i}
                className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">
                    {humanizeEnum(b.leaveTypeCode)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Entitled {b.entitledDays ?? 0} · Used {b.usedDays ?? 0} · Pending{" "}
                    {b.pendingDays ?? 0}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-lg font-semibold">{b.availableDays ?? 0}</div>
                  <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    available
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section aria-labelledby="requests-heading" className="rounded-lg border border-border bg-card">
        <h2 id="requests-heading" className="border-b border-border px-4 py-3 text-sm font-semibold">
          My requests
        </h2>

        <QueryState
          isLoading={requests.isLoading}
          error={requests.error}
          onRetry={() => void requests.refetch()}
          label="leave requests"
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No leave requests"
              description="Requests you raise will appear here with their approval status."
              action={
                <Button size="sm" onClick={() => setApplyOpen(true)}>
                  <CalendarPlus className="h-4 w-4" />
                  Apply for leave
                </Button>
              }
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {rows.map((r) => (
                  <li key={r.id} className="space-y-2 p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {humanizeEnum(r.leaveTypeCode) || "Leave"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(r.startDate)} – {formatDate(r.endDate)}
                        </div>
                      </div>
                      <StatusChip tone={requestStatusTone(r.status)}>
                        {humanizeEnum(r.status)}
                      </StatusChip>
                    </div>
                    <RequestActions
                      request={r}
                      onSubmit={() => submitRequest.mutate(r.id)}
                      onCancel={() => cancelRequest.mutate(r.id)}
                      busy={submitRequest.isPending || cancelRequest.isPending}
                    />
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Type</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>To</TableHead>
                      <TableHead className="text-right">Days</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-sm font-medium">
                          {humanizeEnum(r.leaveTypeCode)}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(r.startDate)}</TableCell>
                        <TableCell className="text-sm">{formatDate(r.endDate)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {r.daysRequested ?? "—"}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={requestStatusTone(r.status)}>
                            {humanizeEnum(r.status)}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="text-right">
                          <RequestActions
                            request={r}
                            onSubmit={() => submitRequest.mutate(r.id)}
                            onCancel={() => cancelRequest.mutate(r.id)}
                            busy={submitRequest.isPending || cancelRequest.isPending}
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </QueryState>
      </section>

      <ApplyLeaveDialog open={applyOpen} onOpenChange={setApplyOpen} onCreated={invalidate} />
    </div>
  );
}

function RequestActions({
  request,
  onSubmit,
  onCancel,
  busy,
}: {
  request: LeaveRequestResponse;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
}) {
  const canSubmit = request.status === "DRAFT";
  const canCancel = request.status === "DRAFT" || request.status === "SUBMITTED";
  if (!canSubmit && !canCancel) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <div className="flex gap-2">
      {canSubmit && (
        <Button size="sm" variant="outline" onClick={onSubmit} disabled={busy}>
          <Send className="h-3.5 w-3.5" />
          Submit
        </Button>
      )}
      {canCancel && (
        <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
          <X className="h-3.5 w-3.5" />
          Cancel
        </Button>
      )}
    </div>
  );
}

function ApplyLeaveDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated: () => void;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const types = useQuery({
    queryKey: ["leave", "types"],
    queryFn: ({ signal }) => leaveApi.leaveTypes(signal),
    enabled: open,
  });

  const create = useMutation({
    mutationFn: () => leaveApi.createRequest({ leaveTypeId, startDate, endDate, reason }),
    onSuccess: () => {
      toast.success("Leave request created");
      onOpenChange(false);
      setLeaveTypeId("");
      setStartDate("");
      setEndDate("");
      setReason("");
      setErrors({});
      onCreated();
    },
    onError: (err) => {
      if (err instanceof ApiError && err.fieldErrors.length) {
        setErrors(Object.fromEntries(err.fieldErrors.map((e) => [e.field, e.message])));
      }
      toast.error(err instanceof Error ? err.message : "Could not create the request.");
    },
  });

  const validate = () => {
    const next: Record<string, string> = {};
    if (!leaveTypeId) next.leaveTypeId = "Select a leave type.";
    if (!startDate) next.startDate = "Start date is required.";
    if (!endDate) next.endDate = "End date is required.";
    if (startDate && endDate && endDate < startDate) {
      next.endDate = "End date cannot be before the start date.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Creates a draft request. Submit it to send it to your approver.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="leaveTypeId">
              Leave type
              <span className="ml-0.5 text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <select
              id="leaveTypeId"
              value={leaveTypeId}
              onChange={(e) => setLeaveTypeId(e.target.value)}
              aria-invalid={!!errors.leaveTypeId}
              aria-describedby={errors.leaveTypeId ? "leaveTypeId-error" : undefined}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
            >
              <option value="">
                {types.isLoading ? "Loading leave types…" : "Select leave type…"}
              </option>
              {(types.data ?? []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name ?? t.code}
                </option>
              ))}
            </select>
            {types.error && (
              <p className="text-xs text-muted-foreground">
                Leave types could not be loaded from the server.
              </p>
            )}
            {errors.leaveTypeId && (
              <p id="leaveTypeId-error" className="text-xs text-destructive">
                {errors.leaveTypeId}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                aria-invalid={!!errors.startDate}
              />
              {errors.startDate && <p className="text-xs text-destructive">{errors.startDate}</p>}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                aria-invalid={!!errors.endDate}
              />
              {errors.endDate && <p className="text-xs text-destructive">{errors.endDate}</p>}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional context for your approver"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (validate()) create.mutate();
            }}
            disabled={create.isPending}
          >
            {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
