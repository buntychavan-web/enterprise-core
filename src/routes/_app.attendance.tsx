import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, LogIn, LogOut, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ATTENDANCE_MONTH, type AttendanceEntry } from "@/lib/mock/self-service";

export const Route = createFileRoute("/_app/attendance")({
  head: () => ({
    meta: [
      { title: "Attendance — EWOS" },
      { name: "description", content: "Daily attendance log, punches and monthly summary." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AttendancePage,
});

const TONE: Record<AttendanceEntry["status"], StatusTone> = {
  Present: "success",
  Late: "warning",
  Absent: "danger",
  Weekend: "neutral",
  Holiday: "info",
  Leave: "info",
};

function AttendancePage() {
  const present = ATTENDANCE_MONTH.filter(
    (e) => e.status === "Present" || e.status === "Late",
  ).length;
  const late = ATTENDANCE_MONTH.filter((e) => e.status === "Late").length;
  const leave = ATTENDANCE_MONTH.filter((e) => e.status === "Leave").length;
  const totalHours = ATTENDANCE_MONTH.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time & Attendance"
        title="My Attendance"
        description="July 2026 — daily punches, hours, and status."
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Days present" icon={<LogIn className="h-5 w-5" />} value={present} />
        <StatCard label="Late marks" icon={<Clock className="h-5 w-5" />} value={late} />
        <StatCard label="On leave" icon={<CalendarDays className="h-5 w-5" />} value={leave} />
        <StatCard
          label="Total hours"
          icon={<TrendingUp className="h-5 w-5" />}
          value={totalHours.toFixed(1)}
        />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily log</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {/* Desktop table */}
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Day</TableHead>
                  <TableHead>Check-in</TableHead>
                  <TableHead>Check-out</TableHead>
                  <TableHead className="text-right">Hours</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ATTENDANCE_MONTH.map((e) => (
                  <TableRow key={e.date}>
                    <TableCell className="font-medium">{e.date}</TableCell>
                    <TableCell className="text-muted-foreground">{e.day}</TableCell>
                    <TableCell>{e.checkIn ?? "—"}</TableCell>
                    <TableCell>{e.checkOut ?? "—"}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.hours ? e.hours.toFixed(2) : "—"}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={TONE[e.status]}>{e.status}</StatusChip>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.note ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Mobile list */}
          <ul className="divide-y divide-border md:hidden">
            {ATTENDANCE_MONTH.map((e) => (
              <li key={e.date} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">
                    {e.date} <span className="text-muted-foreground">· {e.day}</span>
                  </div>
                  <StatusChip tone={TONE[e.status]}>{e.status}</StatusChip>
                </div>
                <div className="mt-1 flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <LogIn className="h-3 w-3" /> {e.checkIn ?? "—"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <LogOut className="h-3 w-3" /> {e.checkOut ?? "—"}
                  </span>
                  <span className="ml-auto tabular-nums">
                    {e.hours ? `${e.hours.toFixed(2)} h` : "—"}
                  </span>
                </div>
                {e.note && <div className="mt-1 text-xs text-muted-foreground">{e.note}</div>}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
