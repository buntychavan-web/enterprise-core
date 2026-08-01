import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  BarChart3,
  CalendarClock,
  ClipboardCheck,
  ClipboardList,
  GaugeCircle,
  Scale,
  Sparkles,
  TrendingUp,
  UserCog,
} from "lucide-react";
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
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  appraisalApi,
  performanceCycleApi,
  type PerformanceCycleDto,
  type PerformanceDashboardDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-dashboard")({
  head: () => ({
    meta: [{ title: "Performance Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PerformanceDashboardPage,
});

const QUICK_LINKS = [
  {
    to: "/performance-cycles",
    title: "Appraisal Cycles",
    description: "Manage the cycle lifecycle.",
    icon: CalendarClock,
  },
  {
    to: "/bulk-appraisal-launch",
    title: "Bulk Appraisal Launch",
    description: "Launch appraisals in bulk.",
    icon: Sparkles,
  },
  {
    to: "/performance-employee-assignment",
    title: "Employee Assignment",
    description: "Open a single appraisal.",
    icon: UserCog,
  },
  {
    to: "/performance-calibration",
    title: "Calibration",
    description: "Calibrate ratings and run sessions.",
    icon: Scale,
  },
  {
    to: "/performance-bell-curve",
    title: "Bell Curve",
    description: "Rating band distribution.",
    icon: TrendingUp,
  },
  {
    to: "/performance-rating-distribution",
    title: "Rating Distribution",
    description: "Ratings by whole number.",
    icon: BarChart3,
  },
  {
    to: "/performance-progress",
    title: "Progress",
    description: "Department / BU / Company rollups.",
    icon: GaugeCircle,
  },
  {
    to: "/performance-reports",
    title: "Reports",
    description: "Pending reviews and summaries.",
    icon: ClipboardList,
  },
] as const;

function PerformanceDashboardPage() {
  const { activeCompanyId } = useTenant();
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [dashboard, setDashboard] = useState<PerformanceDashboardDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then((data) => {
        setCycles(data);
        const open = data.find(
          (c) => c.status !== "CLOSED" && c.status !== "CANCELLED" && c.status !== "DRAFT",
        );
        setCycleId(open?.id ?? data[0]?.id ?? "");
      })
      .catch(() => setCycles([]));
  }, [activeCompanyId]);

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    setError(null);
    appraisalApi
      .dashboard(cycleId)
      .then(setDashboard)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load dashboard."))
      .finally(() => setLoading(false));
  }, [cycleId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Performance Dashboard"
        description="Overall appraisal cycle status across the company."
      />

      {!activeCompanyId ? (
        <EmptyState
          title="Select a company"
          description="Choose a company to view performance metrics."
        />
      ) : cycles.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title="No appraisal cycles yet"
          description="Create your first appraisal cycle to get started."
          action={
            <Link to="/performance-cycles" className="text-sm text-primary hover:underline">
              Go to Appraisal Cycles
            </Link>
          }
        />
      ) : (
        <>
          <div className="max-w-xs space-y-1.5">
            <Label htmlFor="f-cycle">Cycle</Label>
            <Select value={cycleId} onValueChange={setCycleId}>
              <SelectTrigger id="f-cycle">
                <SelectValue placeholder="Select a cycle" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.status.replace(/_/g, " ")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {error ? (
            <EmptyState title="Couldn't load dashboard" description={error} />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                label="Pending self review"
                icon={<ClipboardCheck className="h-5 w-5" />}
                value={dashboard?.pendingSelf}
                loading={loading}
              />
              <StatCard
                label="Pending manager review"
                icon={<ClipboardCheck className="h-5 w-5" />}
                value={dashboard?.pendingManager}
                loading={loading}
              />
              <StatCard
                label="Pending reviewer review"
                icon={<ClipboardCheck className="h-5 w-5" />}
                value={dashboard?.pendingReviewer}
                loading={loading}
              />
              <StatCard
                label="In calibration"
                icon={<Scale className="h-5 w-5" />}
                value={dashboard?.inCalibration}
                loading={loading}
              />
              <StatCard
                label="Pending approval"
                icon={<ClipboardList className="h-5 w-5" />}
                value={dashboard?.pendingApproval}
                loading={loading}
              />
              <StatCard
                label="Finalised"
                icon={<TrendingUp className="h-5 w-5" />}
                value={dashboard?.finalised}
                loading={loading}
              />
              <StatCard
                label="Cancelled"
                icon={<ClipboardList className="h-5 w-5" />}
                value={dashboard?.cancelled}
                loading={loading}
              />
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <l.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between text-sm font-medium text-foreground">
                      {l.title}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {l.description}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
