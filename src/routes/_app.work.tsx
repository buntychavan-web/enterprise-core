import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, UserCircle2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { WorkCard } from "@/components/ewos/WorkCard";
import { useEssDashboard, useTodayAttendanceStatus } from "@/hooks/use-ess-home-data";

// Sprint 0 (EWOS App Shell) — Work Hub: the new IA's entry point for an
// employee's own operational world. Deliberately a thin shell over the
// existing, already-working Leave/Attendance/Payslip/Profile screens (reused
// as-is, not redesigned this sprint) — see CTO review "Work Hub — KEEP: low
// risk, pure frontend composition, zero new backend."

export const Route = createFileRoute("/_app/work")({
  head: () => ({
    meta: [
      { title: "Work — EWOS" },
      { name: "description", content: "Leave, attendance, payslips, and profile." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: WorkHubPage,
});

function WorkHubPage() {
  const dashboard = useEssDashboard();
  const attendance = useTodayAttendanceStatus();
  const leave = dashboard.data?.leaveSummary;
  const payroll = dashboard.data?.payrollSnapshot;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Work" title="Your work" description="Everything you handle yourself." />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <WorkCard
          to="/my-leave"
          icon={<CalendarDays className="h-4 w-4" />}
          title="Leave"
          loading={dashboard.loading}
          error={dashboard.error}
          cta="Apply or track"
        >
          <p className="font-mono text-lg font-semibold tabular-nums text-foreground">
            {leave?.balanceDays != null ? `${leave.balanceDays} days available` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {leave?.pendingRequests ? `${leave.pendingRequests} pending` : "No pending requests"}
          </p>
        </WorkCard>

        <WorkCard
          to="/my-attendance"
          icon={<Clock className="h-4 w-4" />}
          title="Attendance"
          loading={attendance.loading}
          error={attendance.error}
          cta="View timesheets"
        >
          <p className="text-sm font-semibold text-foreground">{attendance.data?.label ?? "—"}</p>
        </WorkCard>

        <WorkCard
          to="/my-payslips"
          icon={<Wallet className="h-4 w-4" />}
          title="Payslip"
          loading={dashboard.loading}
          error={dashboard.error}
          cta="View payslips"
        >
          <p className="text-sm font-semibold text-foreground">
            {payroll?.latestPayslipPeriodEnd
              ? new Date(payroll.latestPayslipPeriodEnd).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })
              : "None yet"}
          </p>
          {payroll?.ytdGross != null && (
            <p className="font-mono text-xs tabular-nums text-muted-foreground">
              YTD gross ₹{payroll.ytdGross.toLocaleString("en-IN")}
            </p>
          )}
        </WorkCard>

        <WorkCard
          to="/profile"
          icon={<UserCircle2 className="h-4 w-4" />}
          title="Profile"
          cta="View and edit"
        >
          <p className="text-sm text-muted-foreground">Your details</p>
        </WorkCard>
      </div>
    </div>
  );
}
