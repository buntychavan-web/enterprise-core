import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, CheckCircle2, Clock, Inbox, Loader2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  attendanceApi,
  employeeName,
  employeesApi,
  leaveApi,
  type LeaveRequestResponse,
  type TimesheetResponse,
} from "@/lib/api-client";
import { formatDate, formatNumber, humanizeEnum, requestStatusTone } from "@/lib/format";

export const Route = createFileRoute("/_app/approvals")({
  head: () => ({
    meta: [
      { title: "Approvals — EWOS" },
      { name: "description", content: "Approve or reject leave requests and timesheets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApprovalsPage,
});

type RejectTarget =
  | { kind: "leave"; id: string; label: string }
  | { kind: "timesheet"; id: string; label: string };

function ApprovalsPage() {
  const qc = useQueryClient();
  const [rejectTarget, setRejectTarget] = useState<RejectTarget | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState("");

  const leaveRequests = useQuery({
    queryKey: ["approvals", "leave"],
    queryFn: ({ signal }) => leaveApi.pendingApprovals(signal),
  });

  const reports = useQuery({
    queryKey: ["employees", "me", "reports"],
    queryFn: ({ signal }) => employeesApi.myReports(signal),
  });

  const reportList = useMemo(() => reports.data ?? [], [reports.data]);

  const timesheetQueries = useQueries({
    queries: reportList.map((r) => ({
      queryKey: ["approvals", "timesheets", r.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        attendanceApi.employeeTimesheets(r.id, { page: 0, size: 20 }, signal),
    })),
  });

  const pendingTimesheets = useMemo(() => {
    const out: Array<{ sheet: TimesheetResponse; employee: string }> = [];
    timesheetQueries.forEach((q, i) => {
      for (const sheet of q.data?.content ?? []) {
        if (sheet.status === "SUBMITTED") {
          out.push({ sheet, employee: employeeName(reportList[i]) });
        }
      }
    });
    return out;
  }, [timesheetQueries, reportList]);

  const timesheetsLoading = timesheetQueries.some((q) => q.isLoading);
  const timesheetsError = timesheetQueries.find((q) => q.error)?.error ?? reports.error;

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ["approvals"] });
    void qc.invalidateQueries({ queryKey: ["leave"] });
    void qc.invalidateQueries({ queryKey: ["attendance"] });
  };

  const approveLeave = useMutation({
    mutationFn: (id: string) => leaveApi.approve(id),
    onSuccess: () => {
      toast.success("Leave request approved");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Approval failed."),
  });

  const approveTimesheet = useMutation({
    mutationFn: (id: string) => attendanceApi.approveTimesheet(id),
    onSuccess: () => {
      toast.success("Timesheet approved");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Approval failed."),
  });

  const reject = useMutation({
    mutationFn: async () => {
      if (!rejectTarget) return;
      if (rejectTarget.kind === "leave") {
        await leaveApi.reject(rejectTarget.id, { rejectionReason: reason.trim() });
      } else {
        await attendanceApi.rejectTimesheet(rejectTarget.id, { rejectionReason: reason.trim() });
      }
    },
    onSuccess: () => {
      toast.success("Rejected and returned to the employee");
      setRejectTarget(null);
      setReason("");
      invalidate();
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Rejection failed."),
  });

  const openReject = (target: RejectTarget) => {
    setRejectTarget(target);
    setReason("");
    setReasonError("");
  };

  const leaveRows = leaveRequests.data ?? [];
  const totalPending = leaveRows.length + pendingTimesheets.length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Manager self service"
        title="Approvals"
        description="Everything waiting on your decision, in one queue."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Awaiting you"
          value={totalPending}
          loading={leaveRequests.isLoading || timesheetsLoading}
          icon={<Inbox className="h-4 w-4" />}
          hint="Leave requests and timesheets"
        />
        <StatCard
          label="Leave requests"
          value={leaveRows.length}
          loading={leaveRequests.isLoading}
          unavailable={!!leaveRequests.error}
          icon={<CalendarCheck2 className="h-4 w-4" />}
          hint="Submitted by your reports"
        />
        <StatCard
          label="Timesheets"
          value={pendingTimesheets.length}
          loading={timesheetsLoading}
          unavailable={!!timesheetsError}
          icon={<Clock className="h-4 w-4" />}
          hint="Submitted for the current periods"
        />
      </div>

      <Tabs defaultValue="leave">
        <TabsList>
          <TabsTrigger value="leave">Leave ({leaveRows.length})</TabsTrigger>
          <TabsTrigger value="timesheets">Timesheets ({pendingTimesheets.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="leave" className="mt-4">
          <div className="rounded-lg border border-border bg-card">
            <QueryState
              isLoading={leaveRequests.isLoading}
              error={leaveRequests.error}
              onRetry={() => void leaveRequests.refetch()}
              label="pending leave approvals"
            >
              {leaveRows.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="Nothing to approve"
                  description="Leave requests submitted by your reports will appear here."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {leaveRows.map((r) => (
                    <LeaveApprovalRow
                      key={r.id}
                      request={r}
                      busy={approveLeave.isPending}
                      onApprove={() => approveLeave.mutate(r.id)}
                      onReject={() =>
                        openReject({
                          kind: "leave",
                          id: r.id,
                          label: `${humanizeEnum(r.leaveTypeCode)} · ${formatDate(r.startDate)}`,
                        })
                      }
                    />
                  ))}
                </ul>
              )}
            </QueryState>
          </div>
        </TabsContent>

        <TabsContent value="timesheets" className="mt-4">
          <div className="rounded-lg border border-border bg-card">
            <QueryState
              isLoading={timesheetsLoading}
              error={timesheetsError}
              onRetry={() => void reports.refetch()}
              label="pending timesheets"
            >
              {pendingTimesheets.length === 0 ? (
                <EmptyState
                  icon={CheckCircle2}
                  title="No timesheets waiting"
                  description="Submitted timesheets from your direct reports show up here."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {pendingTimesheets.map(({ sheet, employee }) => (
                    <li
                      key={sheet.id}
                      className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold">{employee}</div>
                        <div className="text-xs text-muted-foreground">
                          {formatDate(sheet.periodStart)} – {formatDate(sheet.periodEnd)} ·{" "}
                          {formatNumber(sheet.workedHours, " h")} worked ·{" "}
                          {formatNumber(sheet.overtimeHours, " h")} OT
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusChip tone={requestStatusTone(sheet.status)}>
                          {humanizeEnum(sheet.status)}
                        </StatusChip>
                        <Button
                          size="sm"
                          onClick={() => approveTimesheet.mutate(sheet.id)}
                          disabled={approveTimesheet.isPending}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            openReject({
                              kind: "timesheet",
                              id: sheet.id,
                              label: `${employee} · ${formatDate(sheet.periodStart)}`,
                            })
                          }
                        >
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </QueryState>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>
              {rejectTarget?.label} — the employee sees your reason and can resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="rejectionReason">
              Reason
              <span className="ml-0.5 text-destructive" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="rejectionReason"
              value={reason}
              maxLength={500}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!reasonError}
              placeholder="Explain what needs to change"
            />
            {reasonError && <p className="text-xs text-destructive">{reasonError}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={reject.isPending}
              onClick={() => {
                if (reason.trim().length < 3) {
                  setReasonError("Give the employee at least a short reason.");
                  return;
                }
                setReasonError("");
                reject.mutate();
              }}
            >
              {reject.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Reject
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function LeaveApprovalRow({
  request,
  onApprove,
  onReject,
  busy,
}: {
  request: LeaveRequestResponse;
  onApprove: () => void;
  onReject: () => void;
  busy: boolean;
}) {
  return (
    <li className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold">
          {request.employeeName ?? request.employeeId ?? "Employee"}
        </div>
        <div className="text-xs text-muted-foreground">
          {humanizeEnum(request.leaveTypeCode)} · {formatDate(request.startDate)} –{" "}
          {formatDate(request.endDate)}
          {request.daysRequested ? ` · ${request.daysRequested} day(s)` : ""}
        </div>
        {request.reason && (
          <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{request.reason}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <StatusChip tone={requestStatusTone(request.status)}>
          {humanizeEnum(request.status)}
        </StatusChip>
        <Button size="sm" onClick={onApprove} disabled={busy}>
          <CheckCircle2 className="h-3.5 w-3.5" /> Approve
        </Button>
        <Button size="sm" variant="outline" onClick={onReject}>
          <XCircle className="h-3.5 w-3.5" /> Reject
        </Button>
      </div>
    </li>
  );
}
