import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock, Loader2, LogIn, LogOut, Timer } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { attendanceApi } from "@/lib/api-client";
import { formatDate, formatDateTime, formatNumber, humanizeEnum, requestStatusTone } from "@/lib/format";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — EWOS" },
      { name: "description", content: "Clock in/out, time entries and timesheets." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const qc = useQueryClient();

  const entries = useQuery({
    queryKey: ["attendance", "time-entries"],
    queryFn: ({ signal }) => attendanceApi.myTimeEntries({ page: 0, size: 50 }, signal),
  });

  const timesheets = useQuery({
    queryKey: ["attendance", "timesheets"],
    queryFn: ({ signal }) => attendanceApi.myTimesheets({ page: 0, size: 12 }, signal),
  });

  const punch = useMutation({
    mutationFn: (eventType: "CLOCK_IN" | "CLOCK_OUT") =>
      attendanceApi.punch({ eventType, occurredAt: new Date().toISOString() }),
    onSuccess: (_data, eventType) => {
      toast.success(eventType === "CLOCK_IN" ? "Clocked in" : "Clocked out");
      void qc.invalidateQueries({ queryKey: ["attendance"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Could not record punch."),
  });

  const submitTimesheet = useMutation({
    mutationFn: (id: string) => attendanceApi.submitTimesheet(id),
    onSuccess: () => {
      toast.success("Timesheet submitted");
      void qc.invalidateQueries({ queryKey: ["attendance", "timesheets"] });
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : "Submit failed."),
  });

  const entryRows = entries.data?.content ?? [];
  const sheetRows = timesheets.data?.content ?? [];
  const current = sheetRows[0];
  const lastEntry = entryRows[0];
  const clockedIn = lastEntry?.eventType === "CLOCK_IN";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self service"
        title="Attendance"
        description="Record your punches and track timesheet status."
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={clockedIn ? "outline" : "default"}
              onClick={() => punch.mutate("CLOCK_IN")}
              disabled={punch.isPending}
            >
              <LogIn className="h-4 w-4" />
              Clock in
            </Button>
            <Button
              size="sm"
              variant={clockedIn ? "default" : "outline"}
              onClick={() => punch.mutate("CLOCK_OUT")}
              disabled={punch.isPending}
            >
              <LogOut className="h-4 w-4" />
              Clock out
            </Button>
          </div>
        }
      />

      <section aria-labelledby="attendance-stats-heading">
        <h2 id="attendance-stats-heading" className="sr-only">
          Current period
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Worked hours"
            value={current?.workedHours ?? null}
            loading={timesheets.isLoading}
            unavailable={!!timesheets.error}
            icon={<Clock className="h-4 w-4" />}
            hint={current ? `Period from ${formatDate(current.periodStart)}` : "Current period"}
          />
          <StatCard
            label="Overtime"
            value={current?.overtimeHours ?? null}
            loading={timesheets.isLoading}
            unavailable={!!timesheets.error}
            icon={<Timer className="h-4 w-4" />}
            hint="Hours beyond schedule"
          />
          <StatCard
            label="Last punch"
            value={lastEntry ? humanizeEnum(lastEntry.eventType) : null}
            loading={entries.isLoading}
            unavailable={!!entries.error}
            icon={<LogIn className="h-4 w-4" />}
            hint={lastEntry ? formatDateTime(lastEntry.occurredAt) : "No punches recorded"}
          />
        </div>
      </section>

      <section
        aria-labelledby="timesheets-heading"
        className="rounded-lg border border-border bg-card"
      >
        <h2
          id="timesheets-heading"
          className="border-b border-border px-4 py-3 text-sm font-semibold"
        >
          Timesheets
        </h2>
        <QueryState
          isLoading={timesheets.isLoading}
          error={timesheets.error}
          onRetry={() => void timesheets.refetch()}
          label="timesheets"
        >
          {sheetRows.length === 0 ? (
            <EmptyState
              icon={Timer}
              title="No timesheets yet"
              description="Timesheets appear once a pay period is generated for you."
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {sheetRows.map((t) => (
                  <li key={t.id} className="space-y-2 p-4">
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {formatDate(t.periodStart)} – {formatDate(t.periodEnd)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Worked {formatNumber(t.workedHours, " h")} · OT{" "}
                          {formatNumber(t.overtimeHours, " h")}
                        </div>
                      </div>
                      <StatusChip tone={requestStatusTone(t.status)}>
                        {humanizeEnum(t.status)}
                      </StatusChip>
                    </div>
                    {t.status === "DRAFT" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => submitTimesheet.mutate(t.id)}
                        disabled={submitTimesheet.isPending}
                      >
                        {submitTimesheet.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                        Submit
                      </Button>
                    )}
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead className="text-right">Worked</TableHead>
                      <TableHead className="text-right">Overtime</TableHead>
                      <TableHead className="text-right">Absence</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sheetRows.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="text-sm font-medium">
                          {formatDate(t.periodStart)} – {formatDate(t.periodEnd)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(t.workedHours, " h")}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(t.overtimeHours, " h")}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatNumber(t.absenceHours, " h")}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={requestStatusTone(t.status)}>
                            {humanizeEnum(t.status)}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.status === "DRAFT" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => submitTimesheet.mutate(t.id)}
                              disabled={submitTimesheet.isPending}
                            >
                              Submit
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
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

      <section aria-labelledby="entries-heading" className="rounded-lg border border-border bg-card">
        <h2 id="entries-heading" className="border-b border-border px-4 py-3 text-sm font-semibold">
          Recent punches
        </h2>
        <QueryState
          isLoading={entries.isLoading}
          error={entries.error}
          onRetry={() => void entries.refetch()}
          label="time entries"
        >
          {entryRows.length === 0 ? (
            <EmptyState
              icon={Clock}
              title="No punches recorded"
              description="Use Clock in to record your first punch of the day."
            />
          ) : (
            <ul className="divide-y divide-border">
              {entryRows.map((e) => (
                <li
                  key={e.id}
                  className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">
                      {humanizeEnum(e.eventType)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatDateTime(e.occurredAt)}
                      {e.location ? ` · ${e.location}` : ""}
                    </div>
                  </div>
                  <StatusChip tone="neutral" className="shrink-0">
                    {humanizeEnum(e.source) === "—" ? "Web" : humanizeEnum(e.source)}
                  </StatusChip>
                </li>
              ))}
            </ul>
          )}
        </QueryState>
      </section>
    </div>
  );
}
