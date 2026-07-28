import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Area,
  AreaChart,
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
  Building2,
  CalendarClock,
  ClipboardList,
  Clock,
  DollarSign,
  FileText,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  UserPlus,
  UserSquare2,
  Users as UsersIcon,
  Wallet,
} from "lucide-react";
import { dashboardApi, type DashboardSummary } from "@/lib/api-client";
import { useTenant } from "@/lib/tenant-context";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  ANNOUNCEMENTS,
  ATTENDANCE_WEEK,
  DEPARTMENT_SPLIT,
  HEADCOUNT_TREND,
  PAYROLL_MONTHLY,
  RECENT_ACTIVITY,
} from "@/lib/mock/dashboard";

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

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary>({
    employees: null,
    users: null,
    departments: null,
    roles: null,
  });
  const [loading, setLoading] = useState(true);
  const { tenantId } = useTenant();

  useEffect(() => {
    let cancelled = false;
    dashboardApi.summary(tenantId).then((d) => {
      if (cancelled) return;
      setSummary(d);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [tenantId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Live workforce metrics with executive, HR, payroll and employee views."
        actions={
          <StatusChip tone="info" icon={<Sparkles className="h-3 w-3" />}>
            Sample analytics
          </StatusChip>
        }
      />

      <section aria-labelledby="metrics-heading">
        <h3 id="metrics-heading" className="sr-only">
          Key metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Employees"
            icon={<UserSquare2 className="h-5 w-5" />}
            value={summary.employees}
            loading={loading}
            unavailable={!loading && summary.employees === null}
          />
          <StatCard
            label="Active users"
            icon={<UsersIcon className="h-5 w-5" />}
            value={summary.users}
            loading={loading}
            unavailable={!loading && summary.users === null}
          />
          <StatCard
            label="Departments"
            icon={<Building2 className="h-5 w-5" />}
            value={summary.departments}
            loading={loading}
            unavailable={!loading && summary.departments === null}
          />
          <StatCard
            label="Roles"
            icon={<ShieldCheck className="h-5 w-5" />}
            value={summary.roles}
            loading={loading}
            unavailable={!loading && summary.roles === null}
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
            <Card className="min-w-0 lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Headcount trend</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={HEADCOUNT_TREND}>
                    <defs>
                      <linearGradient id="hc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.35} />
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
                    <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Area
                      type="monotone"
                      dataKey="headcount"
                      stroke="var(--primary)"
                      fill="url(#hc)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card className="min-w-0">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Department split</CardTitle>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={DEPARTMENT_SPLIT}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                    >
                      {DEPARTMENT_SPLIT.map((_, i) => (
                        <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <QuickActions />
            <RecentActivity />
          </div>
        </TabsContent>

        <TabsContent value="hr" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="New joiners (MTD)"
              icon={<UserPlus className="h-5 w-5" />}
              value={42}
            />
            <StatCard label="Exits (MTD)" icon={<TrendingUp className="h-5 w-5" />} value={10} />
            <StatCard
              label="Attrition (12m)"
              icon={<TrendingUp className="h-5 w-5" />}
              value="6.2%"
            />
            <StatCard
              label="Open positions"
              icon={<ClipboardList className="h-5 w-5" />}
              value={28}
            />
          </div>
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Attendance this week</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={ATTENDANCE_WEEK}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="day" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="present" stackId="a" fill="var(--chart-2)" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="late" stackId="a" fill="var(--chart-4)" />
                  <Bar dataKey="absent" stackId="a" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payroll" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Gross this month"
              icon={<Wallet className="h-5 w-5" />}
              value="₹4.47 Cr"
            />
            <StatCard
              label="Net this month"
              icon={<DollarSign className="h-5 w-5" />}
              value="₹3.41 Cr"
            />
            <StatCard
              label="Tax withheld"
              icon={<FileText className="h-5 w-5" />}
              value="₹0.85 Cr"
            />
            <StatCard
              label="Next run"
              icon={<CalendarClock className="h-5 w-5" />}
              value="Aug 28"
            />
          </div>
          <Card className="min-w-0">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                Payroll — gross vs net (₹ crores)
              </CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={PAYROLL_MONTHLY}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={12} />
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
                  <Line
                    type="monotone"
                    dataKey="tax"
                    stroke="var(--chart-4)"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="employee" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Leave balance"
              icon={<CalendarClock className="h-5 w-5" />}
              value="14 days"
            />
            <StatCard
              label="Pending approvals"
              icon={<ClipboardList className="h-5 w-5" />}
              value={3}
            />
            <StatCard
              label="Payslips available"
              icon={<FileText className="h-5 w-5" />}
              value={12}
            />
            <StatCard label="Next holiday" icon={<Clock className="h-5 w-5" />} value="Aug 15" />
          </div>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Announcements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {ANNOUNCEMENTS.map((a) => (
                  <div key={a.id} className="rounded-md border border-border p-3">
                    <div className="text-sm font-medium text-foreground">{a.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground">{a.body}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
            <QuickActions />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function QuickActions() {
  const actions: Array<{
    to: "/users" | "/employees" | "/organization" | "/settings";
    title: string;
    description: string;
    icon: typeof UsersIcon;
  }> = [
    {
      to: "/employees",
      title: "Add employee",
      description: "Onboard a new team member.",
      icon: UserPlus,
    },
    {
      to: "/organization",
      title: "Organization setup",
      description: "Departments, grades, calendars.",
      icon: Building2,
    },
    {
      to: "/users",
      title: "Manage users",
      description: "Accounts and access controls.",
      icon: ShieldCheck,
    },
    {
      to: "/settings",
      title: "Settings",
      description: "Theme and preferences.",
      icon: ClipboardList,
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

function RecentActivity() {
  const toneMap = {
    info: "info",
    success: "success",
    warning: "warning",
    neutral: "neutral",
  } as const;
  return (
    <Card className="lg:col-span-2">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Recent activity</CardTitle>
        <Button variant="ghost" size="sm" className="text-xs">
          View all
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {RECENT_ACTIVITY.map((a) => (
            <li key={a.id} className="flex items-start gap-3 px-5 py-3">
              <StatusChip tone={toneMap[a.tone]} className="mt-0.5 shrink-0">
                {a.tone}
              </StatusChip>
              <div className="min-w-0 flex-1 text-sm">
                <span className="font-medium text-foreground">{a.actor}</span>{" "}
                <span className="text-muted-foreground">{a.action}</span>{" "}
                <span className="font-medium text-foreground">{a.target}</span>
                <div className="mt-0.5 text-xs text-muted-foreground">{a.at}</div>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
