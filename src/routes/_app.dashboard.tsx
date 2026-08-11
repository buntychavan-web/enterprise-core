import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Clock, UserCircle2, Users2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { AttentionInbox } from "@/components/ewos/AttentionInbox";
import { WorkCard } from "@/components/ewos/WorkCard";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";
import { displayName } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import {
  useEssDashboard,
  useMssDashboard,
  useTodayAttendanceStatus,
} from "@/hooks/use-ess-home-data";

// Sprint 0 (EWOS App Shell) — replaces the previous mock-heavy "Executive /
// HR / Payroll / Employee" tabbed dashboard (DEPARTMENT_SPLIT, PAYROLL_MONTHLY,
// ANNOUNCEMENTS, ATTENDANCE_WEEK, HEADCOUNT_TREND, RECENT_ACTIVITY — all
// permanently-mocked chart data from src/lib/mock/dashboard.ts) with a
// role-aware Today/Home built entirely on real Sprint 27C ESS/MSS dashboard
// endpoints. The URL stays /dashboard on purpose (index.tsx and login.tsx
// both redirect here) — the App Shell's navigation labels this "Home"
// independently of the route path.

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Home — EWOS" },
      { name: "description", content: "Your day at EWOS: what needs attention, and your work." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HomePage,
});

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export function HomePage() {
  const { user } = useAuth();
  const dashboard = useEssDashboard();
  const attendance = useTodayAttendanceStatus();
  const mss = useMssDashboard();

  const firstName = displayName(user).split(" ")[0] || displayName(user);
  const today = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  const leave = dashboard.data?.leaveSummary;
  const payroll = dashboard.data?.payrollSnapshot;
  const showTeamPulse = (mss.data?.teamSummary.headcount ?? 0) > 0;

  return (
    <div className="space-y-8">
      <PageHeader eyebrow={today} title={`${greeting()}, ${firstName}.`} serif />

      <AttentionInbox />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <QuickStat
          label="Leave balance"
          loading={dashboard.loading}
          error={dashboard.error}
          value={leave?.balanceDays != null ? `${leave.balanceDays} days` : "—"}
          hint={
            leave?.nextApprovedLeaveDate
              ? `Next: ${new Date(leave.nextApprovedLeaveDate).toLocaleDateString()}`
              : undefined
          }
          numeric
        />
        <QuickStat
          label="Today"
          loading={attendance.loading}
          error={attendance.error}
          value={attendance.data?.label ?? "—"}
        />
        <QuickStat
          label="Latest payslip"
          loading={dashboard.loading}
          error={dashboard.error}
          value={
            payroll?.latestPayslipPeriodEnd
              ? new Date(payroll.latestPayslipPeriodEnd).toLocaleDateString(undefined, {
                  month: "short",
                  year: "numeric",
                })
              : "None yet"
          }
        />
      </div>

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
            {leave?.balanceDays != null ? `${leave.balanceDays} days` : "—"}
          </p>
          <p className="text-xs text-muted-foreground">
            {leave?.pendingRequests ? `${leave.pendingRequests} pending` : "available"}
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
        </WorkCard>

        <WorkCard
          to="/profile"
          icon={<UserCircle2 className="h-4 w-4" />}
          title="Profile"
          cta="View profile"
        >
          <p className="text-sm text-muted-foreground">Your details</p>
        </WorkCard>
      </div>

      {showTeamPulse && (
        <div>
          <h2 className="mb-2 font-serif text-base font-normal text-foreground">Team pulse</h2>
          <WorkCard
            to="/my-team"
            icon={<Users2 className="h-4 w-4" />}
            title="Your team"
            loading={mss.loading}
            error={mss.error}
            cta="Open team"
          >
            <p className="text-sm text-foreground">
              {mss.data?.teamSummary.onLeaveToday ?? 0} on leave today ·{" "}
              {mss.data?.teamSummary.pendingApprovals ?? 0} pending approvals
            </p>
          </WorkCard>
        </div>
      )}
    </div>
  );
}

function QuickStat({
  label,
  value,
  hint,
  loading,
  error,
  numeric = false,
}: {
  label: string;
  value: string;
  hint?: string;
  loading?: boolean;
  error?: string | null;
  /** EWOS identity (Sprint 0 design gate) — mono/tabular figures are reserved
   * for genuinely numeric/financial values (e.g. a leave-day balance), not
   * status text ("No entry yet today") or a formatted month ("Jul 2026"). */
  numeric?: boolean;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : error ? (
        <p className="mt-1 text-sm text-muted-foreground">Unavailable right now</p>
      ) : (
        <>
          <div
            className={cn(
              "mt-1 text-lg font-semibold text-foreground",
              numeric && "font-mono tabular-nums",
            )}
          >
            {value}
          </div>
          {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
        </>
      )}
    </div>
  );
}
