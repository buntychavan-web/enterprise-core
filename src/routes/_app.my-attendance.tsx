import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  attendanceSelfServiceApi,
  type TimeEntryDto,
  type TimesheetDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-attendance")({
  head: () => ({
    meta: [{ title: "My Attendance — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyAttendancePage,
});

const STATUS_TONE: Record<TimesheetDto["status"], StatusTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

function MyAttendancePage() {
  const [entries, setEntries] = useState<TimeEntryDto[] | null>(null);
  const [timesheets, setTimesheets] = useState<TimesheetDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      attendanceSelfServiceApi.myRecentTimeEntries(),
      attendanceSelfServiceApi.myTimesheets(),
    ])
      .then(([e, t]) => {
        if (cancelled) return;
        setEntries(e);
        setTimesheets(t);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setEntries([]);
          setTimesheets([]);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load attendance data.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const currentTimesheet = timesheets?.[0];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self-Service"
        title="My Attendance"
        description="Your recent time entries and current timesheet status."
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !entries || (entries.length === 0 && (!timesheets || timesheets.length === 0)) ? (
        <EmptyState
          title="No employee record linked"
          description="No attendance record is linked to your account. Contact an administrator if this seems wrong."
        />
      ) : (
        <>
          {currentTimesheet && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Current timesheet</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <Field
                  label="Period"
                  value={`${currentTimesheet.periodStart} — ${currentTimesheet.periodEnd}`}
                />
                <Field label="Worked hours" value={String(currentTimesheet.workedHours ?? "—")} />
                <Field label="Overtime" value={String(currentTimesheet.overtimeHours ?? "—")} />
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Status
                  </div>
                  <div className="mt-1">
                    <StatusChip tone={STATUS_TONE[currentTimesheet.status]}>
                      {currentTimesheet.status}
                    </StatusChip>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent time entries</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {entries.length === 0 ? (
                <EmptyState title="No time entries yet" description="Nothing recorded yet." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Occurred at</TableHead>
                        <TableHead>Location</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {entries.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell className="text-sm">{e.eventType}</TableCell>
                          <TableCell className="text-sm">
                            {new Date(e.occurredAt).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-sm">{e.location ?? "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
