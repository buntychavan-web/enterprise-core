import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarDays, ClipboardList, Loader2, RefreshCw, Settings2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — EWOS" },
      { name: "description", content: "Attendance policies and timesheet approvals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttendancePage,
});

// Sprint 13 fix — the previous version rendered a hardcoded personal daily
// punch calendar (ATTENDANCE_MONTH mock). That shape has no backend
// equivalent: com.ewos.attendance exposes per-tenant Policies and Timesheets
// (period rollups filtered by status), not a per-day "my attendance" feed —
// building that would require resolving "my employee" from the logged-in
// user, which the backend has no endpoint for (Employee has no userId link).
// This screen now shows the real, tenant-wide data the backend provides.

type PolicyRow = ResourceRecord & {
  code?: string;
  name?: string;
  standardHoursPerDay?: number;
  standardHoursPerWeek?: number;
  workingDays?: string;
  graceMinutes?: number;
  overtimeMultiplier?: number;
  active?: boolean;
};

type TimesheetRow = ResourceRecord & {
  employeeId?: string;
  periodStart?: string;
  periodEnd?: string;
  workedHours?: number;
  overtimeHours?: number;
  absenceHours?: number;
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

const policiesApi = resourceApi<PolicyRow>("/attendance/policies");

function AttendancePage() {
  const [policies, setPolicies] = useState<PolicyRow[]>([]);
  const [policiesLoading, setPoliciesLoading] = useState(true);
  const [policiesUnavailable, setPoliciesUnavailable] = useState(false);

  const [status, setStatus] = useState<(typeof STATUSES)[number]>("SUBMITTED");
  const [timesheets, setTimesheets] = useState<TimesheetRow[]>([]);
  const [timesheetsLoading, setTimesheetsLoading] = useState(true);
  const [timesheetsUnavailable, setTimesheetsUnavailable] = useState(false);

  const loadPolicies = async () => {
    setPoliciesLoading(true);
    const res = await policiesApi.list();
    setPolicies(res.items);
    setPoliciesUnavailable(res.unavailable);
    setPoliciesLoading(false);
  };

  const loadTimesheets = async (s: (typeof STATUSES)[number]) => {
    setTimesheetsLoading(true);
    const api = resourceApi<TimesheetRow>("/attendance/timesheets", {
      extraQuery: { status: s },
    });
    const res = await api.list();
    setTimesheets(res.items);
    setTimesheetsUnavailable(res.unavailable);
    setTimesheetsLoading(false);
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  useEffect(() => {
    loadTimesheets(status);
  }, [status]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time & Attendance"
        title="Attendance"
        description={`Live policies and timesheets for tenant ${DEFAULT_TENANT_ID} (placeholder — see Sprint 13 report).`}
      />

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Settings2 className="h-4 w-4" />
            Attendance policies
          </CardTitle>
          <Button variant="outline" size="sm" onClick={loadPolicies} disabled={policiesLoading}>
            <RefreshCw className={`h-4 w-4 ${policiesLoading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          {policiesLoading ? (
            <div className="grid place-items-center p-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : policiesUnavailable ? (
            <EmptyState
              title="Coming soon"
              description="GET /api/v1/attendance/policies is not yet available on the backend."
            />
          ) : policies.length === 0 ? (
            <EmptyState
              title="No policies yet"
              description="No attendance policies have been created for this tenant."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Hours/day</TableHead>
                  <TableHead>Hours/week</TableHead>
                  <TableHead>Working days</TableHead>
                  <TableHead>Grace (min)</TableHead>
                  <TableHead>OT multiplier</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.map((p) => (
                  <TableRow key={String(p.id)}>
                    <TableCell className="font-medium">{p.code ?? "—"}</TableCell>
                    <TableCell>{p.name ?? "—"}</TableCell>
                    <TableCell>{p.standardHoursPerDay ?? "—"}</TableCell>
                    <TableCell>{p.standardHoursPerWeek ?? "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {p.workingDays ?? "—"}
                    </TableCell>
                    <TableCell>{p.graceMinutes ?? "—"}</TableCell>
                    <TableCell>{p.overtimeMultiplier ?? "—"}</TableCell>
                    <TableCell>
                      <StatusChip tone={p.active ? "success" : "neutral"}>
                        {p.active ? "Active" : "Inactive"}
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
            Timesheets
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
              onClick={() => loadTimesheets(status)}
              disabled={timesheetsLoading}
            >
              <RefreshCw className={`h-4 w-4 ${timesheetsLoading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {timesheetsLoading ? (
            <div className="grid place-items-center p-10 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : timesheetsUnavailable ? (
            <EmptyState
              title="Coming soon"
              description="GET /api/v1/attendance/timesheets is not yet available on the backend."
            />
          ) : timesheets.length === 0 ? (
            <EmptyState
              title={`No ${status.toLowerCase()} timesheets`}
              description="Try a different status filter."
              icon={CalendarDays}
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee ID</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Worked hrs</TableHead>
                  <TableHead className="text-right">Overtime hrs</TableHead>
                  <TableHead className="text-right">Absence hrs</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheets.map((t) => (
                  <TableRow key={String(t.id)}>
                    <TableCell className="font-mono text-xs">{t.employeeId ?? "—"}</TableCell>
                    <TableCell>
                      {t.periodStart ?? "—"} → {t.periodEnd ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.workedHours ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.overtimeHours ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {t.absenceHours ?? "—"}
                    </TableCell>
                    <TableCell>
                      {t.status && <StatusChip tone={STATUS_TONE[t.status]}>{t.status}</StatusChip>}
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
