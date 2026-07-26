import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, Loader2, RefreshCw, Tag } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { resourceApi, DEFAULT_TENANT_ID, type ResourceRecord } from "@/lib/api-client";

export const Route = createFileRoute("/_app/leave")({
  head: () => ({
    meta: [
      { title: "Leave — EWOS" },
      { name: "description", content: "Leave types and requests." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeavePage,
});

// Sprint 13 fix — the previous "Apply for leave" dialog only ever wrote to
// local React state; it never called a backend endpoint, mock or otherwise.
// A real submission requires resolving "my employee" from the logged-in
// user (no such link exists in the backend — see Employees/Attendance notes)
// and driving the Workflow engine, which is new interactive business logic
// out of scope for a stabilization sprint. This screen now shows the real,
// tenant-wide Leave Types and Leave Requests (by status) the backend
// provides; the apply flow is removed rather than left mocked-and-broken.
// See SPRINT_13_COMPLETION_REPORT.md.

type LeaveTypeRow = ResourceRecord & {
  code?: string;
  name?: string;
  paid?: boolean;
  accrualDaysPerYear?: number;
  maxBalanceDays?: number;
  carryForwardDays?: number;
  requiresApproval?: boolean;
  minNoticeDays?: number;
  active?: boolean;
};

type LeaveRequestRow = ResourceRecord & {
  employeeId?: string;
  leaveTypeCode?: string;
  startDate?: string;
  endDate?: string;
  daysRequested?: number;
  reason?: string;
  status?: "DRAFT" | "SUBMITTED" | "APPROVED" | "REJECTED" | "CANCELLED";
};

const STATUSES = ["SUBMITTED", "APPROVED", "REJECTED", "CANCELLED", "DRAFT"] as const;
const STATUS_TONE: Record<(typeof STATUSES)[number], StatusTone> = {
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
  DRAFT: "neutral",
};

const leaveTypesApi = resourceApi<LeaveTypeRow>("/leave/types");

function LeavePage() {
  const [types, setTypes] = useState<LeaveTypeRow[]>([]);
  const [typesLoading, setTypesLoading] = useState(true);
  const [typesUnavailable, setTypesUnavailable] = useState(false);

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("SUBMITTED");
  const [requests, setRequests] = useState<LeaveRequestRow[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(true);
  const [requestsUnavailable, setRequestsUnavailable] = useState(false);

  const loadTypes = async () => {
    setTypesLoading(true);
    const res = await leaveTypesApi.list();
    setTypes(res.items);
    setTypesUnavailable(res.unavailable);
    setTypesLoading(false);
  };

  const loadRequests = async (s: (typeof STATUSES)[number]) => {
    setRequestsLoading(true);
    const api = resourceApi<LeaveRequestRow>("/leave/requests", { extraQuery: { status: s } });
    const res = await api.list();
    setRequests(res.items);
    setRequestsUnavailable(res.unavailable);
    setRequestsLoading(false);
  };

  useEffect(() => {
    loadTypes();
  }, []);

  useEffect(() => {
    loadRequests(status);
  }, [status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time-off"
        title="Leave"
        description={`Live leave types and requests for tenant ${DEFAULT_TENANT_ID} (placeholder — see Sprint 13 report).`}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Tag className="h-4 w-4" />
            Leave types
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadTypes} disabled={typesLoading}>
            <RefreshCw className={`h-4 w-4 ${typesLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {typesLoading ? (
            <div className="grid place-items-center p-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : typesUnavailable ? (
            <EmptyState
              title="Coming soon"
              description="GET /api/v1/leave/types is not yet available on the backend."
            />
          ) : types.length === 0 ? (
            <EmptyState
              title="No leave types yet"
              description="No leave types have been created for this tenant."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Paid</TableHead>
                  <TableHead className="text-right">Accrual/yr</TableHead>
                  <TableHead className="text-right">Max balance</TableHead>
                  <TableHead>Requires approval</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {types.map((t) => (
                  <TableRow key={String(t.id)}>
                    <TableCell className="font-medium">{t.code ?? "—"}</TableCell>
                    <TableCell>{t.name ?? "—"}</TableCell>
                    <TableCell>
                      <StatusChip tone={t.paid ? "success" : "neutral"}>
                        {t.paid ? "Paid" : "Unpaid"}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.accrualDaysPerYear ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.maxBalanceDays ?? "—"}
                    </TableCell>
                    <TableCell>{t.requiresApproval ? "Yes" : "No"}</TableCell>
                    <TableCell>
                      <StatusChip tone={t.active ? "success" : "neutral"}>
                        {t.active ? "Active" : "Inactive"}
                      </StatusChip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <ClipboardList className="h-4 w-4" />
            Leave requests
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as (typeof STATUSES)[number])}>
              <SelectTrigger className="h-8 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadRequests(status)}
              disabled={requestsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${requestsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {requestsLoading ? (
            <div className="grid place-items-center p-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : requestsUnavailable ? (
            <EmptyState
              title="Coming soon"
              description="GET /api/v1/leave/requests is not yet available on the backend."
            />
          ) : requests.length === 0 ? (
            <EmptyState
              title={`No ${status.toLowerCase()} requests`}
              description="Try a different status filter."
              icon={CalendarDays}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reason</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={String(r.id)}>
                    <TableCell className="font-mono text-xs">{r.employeeId ?? "—"}</TableCell>
                    <TableCell>{r.leaveTypeCode ?? "—"}</TableCell>
                    <TableCell>{r.startDate ?? "—"}</TableCell>
                    <TableCell>{r.endDate ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {r.daysRequested ?? "—"}
                    </TableCell>
                    <TableCell>
                      {r.status && <StatusChip tone={STATUS_TONE[r.status]}>{r.status}</StatusChip>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {r.reason ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
