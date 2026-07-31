import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, ClipboardList, Timer, UserCheck } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { CompanyScopeSelect } from "@/components/ewos/recruitment/CompanyScopeSelect";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useActiveCompany } from "@/hooks/use-active-company";
import { formatDate, humanizeEnum } from "@/lib/format";
import {
  jobPositionsApi,
  jobRequisitionsApi,
  requisitionStatusTone,
  type JobRequisitionResponse,
  type RequisitionStatus,
} from "@/lib/recruitment-api";

export const Route = createFileRoute("/_app/recruitment/")({
  head: () => ({
    meta: [
      { title: "Recruitment Dashboard — EWOS" },
      {
        name: "description",
        content: "Live hiring metrics: open requisitions, approvals in flight and fill progress.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecruitmentDashboard,
});

const CHART_COLORS: Record<string, string> = {
  DRAFT: "hsl(var(--muted-foreground))",
  PENDING_APPROVAL: "hsl(var(--primary))",
  APPROVED: "hsl(var(--primary))",
  OPEN: "hsl(var(--primary))",
  ON_HOLD: "hsl(var(--muted-foreground))",
  FILLED: "hsl(var(--primary))",
  REJECTED: "hsl(var(--destructive))",
  CLOSED: "hsl(var(--muted-foreground))",
  CANCELLED: "hsl(var(--destructive))",
};

function RecruitmentDashboard() {
  const { companies, companyId, setCompanyId, isLoading: companyLoading } = useActiveCompany();

  const requisitions = useQuery({
    queryKey: ["recruitment", "requisitions", companyId],
    queryFn: ({ signal }) => jobRequisitionsApi.all(companyId!, undefined, signal),
    enabled: !!companyId,
  });

  const positions = useQuery({
    queryKey: ["recruitment", "positions", companyId],
    queryFn: ({ signal }) => jobPositionsApi.list(companyId!, signal),
    enabled: !!companyId,
  });

  const rows = useMemo(() => requisitions.data ?? [], [requisitions.data]);

  const metrics = useMemo(() => {
    const byStatus = new Map<RequisitionStatus, number>();
    let openHeadcount = 0;
    let filled = 0;
    for (const r of rows) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
      if (["OPEN", "ON_HOLD", "APPROVED"].includes(r.status)) {
        openHeadcount += Math.max(0, (r.headcount ?? 0) - (r.filledCount ?? 0));
      }
      filled += r.filledCount ?? 0;
    }
    return {
      byStatus,
      openHeadcount,
      filled,
      pending: byStatus.get("PENDING_APPROVAL") ?? 0,
      open: byStatus.get("OPEN") ?? 0,
    };
  }, [rows]);

  const chartData = useMemo(
    () =>
      [...metrics.byStatus.entries()]
        .filter(([, v]) => v > 0)
        .map(([status, count]) => ({ status: humanizeEnum(status), count, raw: status })),
    [metrics.byStatus],
  );

  const urgent = useMemo(
    () =>
      rows
        .filter((r) => ["OPEN", "PENDING_APPROVAL", "APPROVED"].includes(r.status))
        .sort((a, b) => {
          const rank = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 } as Record<string, number>;
          return (rank[a.priority ?? "MEDIUM"] ?? 2) - (rank[b.priority ?? "MEDIUM"] ?? 2);
        })
        .slice(0, 6),
    [rows],
  );

  if (!companyLoading && !companyId) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No company available"
        description="Recruitment data is scoped to a company. None were returned for your tenant."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <CompanyScopeSelect
          companies={companies}
          companyId={companyId}
          onChange={setCompanyId}
        />
      </div>

      <QueryState
        isLoading={requisitions.isLoading || companyLoading}
        error={requisitions.error}
        onRetry={() => requisitions.refetch()}
        label="recruitment metrics"
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Open requisitions"
            value={metrics.open}
            icon={<ClipboardList className="h-5 w-5" />}
            hint="Actively hiring"
          />
          <StatCard
            label="Awaiting approval"
            value={metrics.pending}
            icon={<Timer className="h-5 w-5" />}
            hint="Pending a decision"
          />
          <StatCard
            label="Vacancies to fill"
            value={metrics.openHeadcount}
            icon={<UserCheck className="h-5 w-5" />}
            hint="Headcount minus fills"
          />
          <StatCard
            label="Positions in catalogue"
            value={positions.data?.length ?? 0}
            icon={<Briefcase className="h-5 w-5" />}
            hint="Active and inactive seats"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-5">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle className="text-base">Requisitions by lifecycle state</CardTitle>
            </CardHeader>
            <CardContent className="h-72">
              {chartData.length === 0 ? (
                <EmptyState
                  title="No requisitions yet"
                  description="Create the first requisition to see pipeline analytics."
                />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, bottom: 8, left: -16 }}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
                    <XAxis
                      dataKey="status"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={56}
                    />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]} isAnimationActive={false}>
                      {chartData.map((d) => (
                        <Cell key={d.raw} fill={CHART_COLORS[d.raw] ?? "hsl(var(--primary))"} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <CardTitle className="text-base">Priority requisitions</CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link to="/recruitment/requisitions">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {urgent.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Nothing in flight right now.
                </p>
              ) : (
                urgent.map((r) => <PriorityRow key={r.id} requisition={r} />)
              )}
            </CardContent>
          </Card>
        </div>
      </QueryState>
    </div>
  );
}

function PriorityRow({ requisition: r }: { requisition: JobRequisitionResponse }) {
  return (
    <Link
      to="/recruitment/requisitions/$id"
      params={{ id: r.id }}
      className="flex items-center justify-between gap-3 rounded-md border border-border p-3 transition-colors hover:bg-muted"
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{r.title}</div>
        <div className="mt-0.5 truncate text-xs text-muted-foreground">
          {r.requisitionNumber} · {r.filledCount ?? 0}/{r.headcount} filled ·{" "}
          {r.targetStartDate ? `starts ${formatDate(r.targetStartDate)}` : "no target date"}
        </div>
      </div>
      <StatusChip tone={requisitionStatusTone(r.status)}>{humanizeEnum(r.status)}</StatusChip>
    </Link>
  );
}
