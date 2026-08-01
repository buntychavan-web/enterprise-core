import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, ClipboardCheck, Goal, Users2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatCard } from "@/components/ewos/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RequirePermission } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  appraisalApi,
  employeeReportsApi,
  performanceCycleApi,
  performanceSelfServiceApi,
  type AppraisalDto,
  type AppraisalStatus,
  type PerformanceCycleDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/team-performance-dashboard")({
  head: () => ({
    meta: [{ title: "Team Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamPerformanceDashboardPage,
});

const QUICK_LINKS = [
  { to: "/team-pending-reviews", title: "Pending Reviews", icon: ClipboardCheck },
  { to: "/team-goal-approval", title: "Goal Approval", icon: Goal },
  { to: "/team-performance-summary", title: "Performance Summary", icon: ClipboardCheck },
  { to: "/team-progress", title: "Team Progress", icon: Users2 },
  { to: "/team-rating-distribution", title: "Team Rating Distribution", icon: ClipboardCheck },
] as const;

const STATUS_COUNT_KEYS: AppraisalStatus[] = [
  "PENDING_SELF",
  "PENDING_MANAGER",
  "PENDING_REVIEWER",
  "CALIBRATION",
  "FINALISED",
];

function TeamPerformanceDashboardPage() {
  const { activeCompanyId } = useTenant();
  const [reports, setReports] = useState<ResourceRecord[] | null>(null);
  const [pendingReview, setPendingReview] = useState<AppraisalDto[] | null>(null);
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [cycleAppraisals, setCycleAppraisals] = useState<AppraisalDto[] | null>(null);
  const [cycleError, setCycleError] = useState<string | null>(null);

  useEffect(() => {
    employeeReportsApi
      .myReports()
      .then(setReports)
      .catch(() => setReports([]));
    performanceSelfServiceApi
      .pendingManagerReview()
      .then(setPendingReview)
      .catch(() => setPendingReview([]));
  }, []);

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then(setCycles)
      .catch(() => setCycles([]));
  }, [activeCompanyId]);

  useEffect(() => {
    if (!cycleId || !reports) return;
    const reportIds = new Set(reports.map((r) => String(r.id)));
    setCycleError(null);
    appraisalApi
      .listByCycle(cycleId)
      .then((all) => setCycleAppraisals(all.filter((a) => reportIds.has(a.employeeId))))
      .catch((err) => {
        setCycleAppraisals(null);
        setCycleError(
          err instanceof ApiError ? err.message : "Failed to load team appraisals for this cycle.",
        );
      });
  }, [cycleId, reports]);

  const statusCounts = STATUS_COUNT_KEYS.map((status) => ({
    status,
    count: (cycleAppraisals ?? []).filter((a) => a.status === status).length,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Team Dashboard"
        description="Your direct reports' appraisal activity at a glance."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          label="Team size"
          icon={<Users2 className="h-5 w-5" />}
          value={reports?.length}
          loading={reports === null}
        />
        <StatCard
          label="Pending your review"
          icon={<ClipboardCheck className="h-5 w-5" />}
          value={pendingReview?.length}
          loading={pendingReview === null}
        />
      </div>

      <RequirePermission
        code="PERF_READ"
        fallback={
          <EmptyState
            title="Broader team report requires PERF_READ"
            description="Team-wide status breakdown by cycle requires the PERF_READ permission."
          />
        }
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Team status by cycle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="max-w-xs space-y-1.5">
              <Label htmlFor="f-cycle">Cycle</Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger id="f-cycle">
                  <SelectValue placeholder="Select a cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!cycleId ? (
              <p className="text-sm text-muted-foreground">
                Select a cycle to see your team's status breakdown.
              </p>
            ) : cycleError ? (
              <p className="text-sm text-destructive">{cycleError}</p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-5">
                {statusCounts.map((s) => (
                  <StatCard
                    key={s.status}
                    label={s.status.replace(/_/g, " ")}
                    value={s.count}
                    icon={<ClipboardCheck className="h-5 w-5" />}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </RequirePermission>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Quick links</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {QUICK_LINKS.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              className="group flex items-center justify-between gap-3 rounded-md border border-border p-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <span className="flex items-center gap-2">
                <l.icon className="h-4 w-4 text-muted-foreground" />
                {l.title}
              </span>
              <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
