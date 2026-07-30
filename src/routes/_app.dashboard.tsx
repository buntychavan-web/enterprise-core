import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowUpRight,
  Bell,
  Building2,
  CalendarClock,
  ClipboardList,
  FileText,
  ShieldCheck,
  UserPlus,
  UserSquare2,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import {
  dashboardApi,
  employeesApi,
  leaveApi,
  notificationsApi,
  organizationApi,
  payrollApi,
  type EmployeeStatus,
} from "@/lib/api-client";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, formatMoney, formatNumber, humanizeEnum } from "@/lib/format";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EWOS" },
      { name: "description", content: "Executive, HR, payroll, and employee dashboards." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--primary)",
];

const EMPLOYEE_STATUSES: EmployeeStatus[] = [
  "ACTIVE",
  "ON_LEAVE",
  "SUSPENDED",
  "PRE_HIRE",
  "TERMINATED",
];

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function DashboardPage() {
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
  });

  /* HR — headcount by employment status, counted server-side. */
  const statusCounts = useQueries({
    queries: EMPLOYEE_STATUSES.map((status) => ({
      queryKey: ["dashboard", "headcount", status],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        employeesApi.search({ page: 0, size: 1, status }, signal),
    })),
  });

  const statusData = useMemo(
    () =>
      EMPLOYEE_STATUSES.map((status, i) => ({
        status: humanizeEnum(status),
        count: statusCounts[i]?.data?.totalElements ?? 0,
      })),
    [statusCounts],
  );
  const statusLoading = statusCounts.some((q) => q.isLoading);
  const statusFailed = statusCounts.every((q) => !!q.error);

  /* Executive — headcount split across the first organization units. */
  const units = useQuery({
    queryKey: ["organization", "units", "dashboard"],
    queryFn: ({ signal }) => organizationApi.units.list({ page: 0, size: 6 }, signal),
  });
  const unitList = useMemo(() => units.data?.content ?? [], [units.data]);

  const unitCounts = useQueries({
    queries: unitList.map((u) => ({
      queryKey: ["dashboard", "unit-headcount", u.id],
      queryFn: ({ signal }: { signal: AbortSignal }) =>
        employeesApi.search({ page: 0, size: 1, orgUnitId: u.id }, signal),
    })),
  });

  const unitData = useMemo(
    () =>
      unitList
        .map((u, i) => ({ name: u.name, value: unitCounts[i]?.data?.totalElements ?? 0 }))
        .filter((d) => d.value > 0),
    [unitList, unitCounts],
  );
  const unitLoading = units.isLoading || unitCounts.some((q) => q.isLoading);

  /* Payroll — finalized runs power the gross/net trend. */
  const runs = useQuery({
    queryKey: ["payroll", "runs", "dashboard"],
    queryFn: ({ signal }) => payrollApi.runs({ page: 0, size: 12, sort: "startedAt,desc" }, signal),
  });
  const periods = useQuery({
    queryKey: ["payroll", "periods", "dashboard"],
    queryFn: ({ signal }) =>
      payrollApi.periods({ page: 0, size: 12, sort: "periodStart,desc" }, signal),
  });

  const periodLabel = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of periods.data?.content ?? []) {
      map.set(p.id, p.code ?? formatDate(p.periodStart));
    }
    return map;
  }, [periods.data]);

  const payrollTrend = useMemo(
    () =>
      (runs.data?.content ?? [])
        .filter((r) => (r.status ?? "").toUpperCase() === "FINALIZED")
        .slice()
        .reverse()
        .map((r) => ({
          period: periodLabel.get(r.payrollPeriodId ?? "") ?? "—",
          gross: r.grossAmount ?? 0,
          net: r.netAmount ?? 0,
        })),
    [runs.data, periodLabel],
  );

  const latestRun = payrollTrend.at(-1);
  const nextPeriod = useMemo(
    () =>
      (periods.data?.content ?? [])
        .filter((p) => (p.status ?? "").toUpperCase() === "OPEN")
        .sort((a, b) => (a.payDate ?? "").localeCompare(b.payDate ?? ""))[0],
    [periods.data],
  );

  /* Employee self-service. */
  const balances = useQuery({
    queryKey: ["leave", "balances", "me"],
    queryFn: ({ signal }) => leaveApi.myBalances(signal),
  });
  const myPayslips = useQuery({
    queryKey: ["payroll", "payslips", "me", "dashboard"],
    queryFn: ({ signal }) => payrollApi.myPayslips({ page: 0, size: 1 }, signal),
  });
  const pendingLeave = useQuery({
    queryKey: ["leave", "approvals", "dashboard"],
    queryFn: ({ signal }) => leaveApi.pendingApprovals(signal),
  });
  const unread = useQuery({
    queryKey: ["notifications", "unread", "dashboard"],
    queryFn: ({ signal }) => notificationsApi.unreadCount(signal),
  });

  const totalLeaveAvailable = useMemo(() => {
    const rows = balances.data ?? [];
    if (rows.length === 0) return null;
    return rows.reduce((sum, b) => sum + (b.availableDays ?? 0), 0);
  }, [balances.data]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live workforce metrics across executive, HR, payroll and employee views."
      />

      <section aria-labelledby="metrics-heading">
        <h3 id="metrics-heading" className="sr-only">
          Key metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Employees"
            icon={<UserSquare2 className="h-5 w-5" />}
            value={summary.data?.employees ?? null}
            loading={summary.isLoading}
            unavailable={!summary.isLoading && (summary.data?.employees ?? null) === null}
          />
          <StatCard
            label="Active users"
            icon={<UsersIcon className="h-5 w-5" />}
            value={summary.data?.users ?? null}
            loading={summary.isLoading}
            unavailable={!summary.isLoading && (summary.data?.users ?? null) === null}
          />
          <StatCard
            label="Departments"
            icon={<Building2 className="h-5 w-5" />}
            value={summary.data?.departments ?? null}
            loading={summary.isLoading}
            unavailable={!summary.isLoading && (summary.data?.departments ?? null) === null}
          />
          <StatCard
            label="Roles"
            icon={<ShieldCheck className="h-5 w-5" />}
            value={summary.data?.roles ?? null}
            loading={summary.isLoading}
            unavailable={!summary.isLoading && (summary.data?.roles ?? null) === null}
          />
        </div>
      </section>

      <Tabs defaultValue="executive">
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          <TabsTrigger value="executive">Executive</TabsTrigger>
          <TabsTrigger value="hr">HR</TabsTrigger>
          <TabsTrigger value="payroll">Payroll</TabsTrigger>
          <TabsTrigger value="employee">Employee</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Headcount by status</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ChartFrame
                  loading={statusLoading}
                  empty={statusFailed || statusData.every((d) => d.count === 0)}
                  emptyLabel="No employee records are available yet."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={statusData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="status" stroke="var(--muted-foreground)" fontSize={12} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        {statusData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Headcount by unit</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ChartFrame
                  loading={unitLoading}
                  empty={unitData.length === 0}
                  emptyLabel="No organization units with employees."
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={unitData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={2}
                      >
                        {unitData.map((_, i) => (
                          <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={tooltipStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartFrame>
              </CardContent>
            </Card>
          </div>

          <QuickActions />
        </TabsContent>

        <TabsContent value="hr" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {EMPLOYEE_STATUSES.slice(0, 4).map((status, i) => (
              <StatCard
                key={status}
                label={humanizeEnum(status)}
                icon={<UserSquare2 className="h-5 w-5" />}
                value={statusCounts[i]?.data?.totalElements ?? null}
                loading={statusCounts[i]?.isLoading}
                unavailable={!!statusCounts[i]?.error}
                hint="Employees in this status"
              />
            ))}
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Workforce distribution</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ChartFrame
                loading={statusLoading}
                empty={statusFailed || statusData.every((d) => d.count === 0)}
                emptyLabel="No employee records are available yet."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={statusData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis type="number" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis
                      type="category"
                      dataKey="status"
                      width={96}
                      stroke="var(--muted-foreground)"
                      fontSize={12}
                    />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Latest gross"
              icon={<Wallet className="h-5 w-5" />}
              value={latestRun ? formatMoney(latestRun.gross) : null}
              loading={runs.isLoading}
              unavailable={!runs.isLoading && !latestRun}
              hint="Most recent finalized run"
            />
            <StatCard
              label="Latest net"
              icon={<Wallet className="h-5 w-5" />}
              value={latestRun ? formatMoney(latestRun.net) : null}
              loading={runs.isLoading}
              unavailable={!runs.isLoading && !latestRun}
              hint="Most recent finalized run"
            />
            <StatCard
              label="Runs in flight"
              icon={<ClipboardList className="h-5 w-5" />}
              value={
                (runs.data?.content ?? []).filter(
                  (r) => !["FINALIZED", "CANCELLED"].includes((r.status ?? "").toUpperCase()),
                ).length
              }
              loading={runs.isLoading}
              unavailable={!!runs.error}
            />
            <StatCard
              label="Next pay date"
              icon={<CalendarClock className="h-5 w-5" />}
              value={nextPeriod ? formatDate(nextPeriod.payDate) : null}
              loading={periods.isLoading}
              unavailable={!periods.isLoading && !nextPeriod}
              hint="Next open payroll period"
            />
          </div>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Finalized payroll — gross vs net
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ChartFrame
                loading={runs.isLoading || periods.isLoading}
                empty={payrollTrend.length === 0}
                emptyLabel="No finalized payroll runs yet."
              >
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={payrollTrend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="period" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Line
                      type="monotone"
                      dataKey="gross"
                      stroke="var(--chart-1)"
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      stroke="var(--primary)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </ChartFrame>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Leave available"
              icon={<CalendarClock className="h-5 w-5" />}
              value={
                totalLeaveAvailable === null ? null : formatNumber(totalLeaveAvailable, " days")
              }
              loading={balances.isLoading}
              unavailable={!!balances.error || totalLeaveAvailable === null}
            />
            <StatCard
              label="Awaiting your approval"
              icon={<ClipboardList className="h-5 w-5" />}
              value={pendingLeave.data?.length ?? null}
              loading={pendingLeave.isLoading}
              unavailable={!!pendingLeave.error}
            />
            <StatCard
              label="Payslips available"
              icon={<FileText className="h-5 w-5" />}
              value={myPayslips.data?.totalElements ?? null}
              loading={myPayslips.isLoading}
              unavailable={!!myPayslips.error}
            />
            <StatCard
              label="Unread notifications"
              icon={<Bell className="h-5 w-5" />}
              value={unread.data ?? null}
              loading={unread.isLoading}
              unavailable={!!unread.error}
            />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Your leave balances</CardTitle>
              </CardHeader>
              <CardContent>
                {balances.isLoading ? (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Skeleton className="h-20 w-full" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ) : (balances.data ?? []).length === 0 ? (
                  <EmptyState
                    icon={CalendarClock}
                    title="No leave balances"
                    description="No entitlements are configured against your record."
                  />
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(balances.data ?? []).map((b, i) => (
                      <div
                        key={b.leaveTypeCode ?? i}
                        className="rounded-lg border border-border p-4"
                      >
                        <div className="text-sm font-medium">{humanizeEnum(b.leaveTypeCode)}</div>
                        <div className="mt-1 text-2xl font-semibold">
                          {formatNumber(b.availableDays)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {formatNumber(b.usedDays)} used · {formatNumber(b.entitledDays)} entitled
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
            <QuickActions />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ChartFrame({
  loading,
  empty,
  emptyLabel,
  children,
}: {
  loading?: boolean;
  empty?: boolean;
  emptyLabel: string;
  children: React.ReactNode;
}) {
  if (loading) return <Skeleton className="h-full w-full" />;
  if (empty) {
    return (
      <div className="grid h-full place-items-center text-sm text-muted-foreground">
        {emptyLabel}
      </div>
    );
  }
  return <>{children}</>;
}

function QuickActions() {
  const actions: Array<{
    to: "/users" | "/employees" | "/organization" | "/approvals" | "/payroll" | "/settings";
    title: string;
    description: string;
    icon: typeof UsersIcon;
  }> = [
    {
      to: "/employees",
      title: "Employees",
      description: "Onboard and maintain records.",
      icon: UserPlus,
    },
    {
      to: "/approvals",
      title: "Approvals",
      description: "Leave and timesheet decisions.",
      icon: ClipboardList,
    },
    {
      to: "/payroll",
      title: "Payroll",
      description: "Periods, runs and payslips.",
      icon: Wallet,
    },
    {
      to: "/organization",
      title: "Organization",
      description: "Units, grades and calendars.",
      icon: Building2,
    },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Quick actions</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {actions.map((a) => (
          <Link
            key={a.to}
            to={a.to}
            className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
              <a.icon className="h-4 w-4" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center justify-between text-sm font-medium text-foreground">
                {a.title}
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
              </span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{a.description}</span>
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
