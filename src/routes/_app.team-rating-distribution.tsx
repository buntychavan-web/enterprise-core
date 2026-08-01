import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
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
  type AppraisalDto,
  type PerformanceCycleDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/team-rating-distribution")({
  head: () => ({
    meta: [{ title: "Team Rating Distribution — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamRatingDistributionPage,
});

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function TeamRatingDistributionPage() {
  const { activeCompanyId } = useTenant();
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [teamAppraisals, setTeamAppraisals] = useState<AppraisalDto[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then(setCycles)
      .catch(() => setCycles([]));
  }, [activeCompanyId]);

  useEffect(() => {
    if (!cycleId) return;
    setLoading(true);
    setError(null);
    employeeReportsApi
      .myReports()
      .then((reports) => {
        const reportIds = new Set(reports.map((r) => String(r.id)));
        return appraisalApi
          .listByCycle(cycleId)
          .then((all) => all.filter((a) => reportIds.has(a.employeeId)));
      })
      .then(setTeamAppraisals)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load rating distribution."),
      )
      .finally(() => setLoading(false));
  }, [cycleId]);

  const chartData = useMemo(() => {
    const finalised = (teamAppraisals ?? []).filter((a) => a.finalRating !== undefined);
    const buckets = new Map<number, number>();
    for (const a of finalised) {
      const bucket = Math.floor(a.finalRating as number);
      buckets.set(bucket, (buckets.get(bucket) ?? 0) + 1);
    }
    return [...buckets.entries()]
      .sort(([a], [b]) => a - b)
      .map(([ratingBucket, count]) => ({ label: String(ratingBucket), count }));
  }, [teamAppraisals]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Team Rating Distribution"
        description="Final ratings among your direct reports, bucketed by whole number."
      />

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

      <RequirePermission
        code="PERF_READ"
        fallback={
          <EmptyState
            title="Requires PERF_READ"
            description="This report requires the PERF_READ permission."
          />
        }
      >
        {!cycleId ? (
          <EmptyState
            title="Select a cycle"
            description="Choose a cycle to see your team's rating distribution."
          />
        ) : loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load rating distribution" description={error} />
        ) : chartData.length === 0 ? (
          <EmptyState
            title="No finalised ratings yet"
            description="This chart populates once ratings are finalised for your team in this cycle."
          />
        ) : (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Ratings by whole number</CardTitle>
            </CardHeader>
            <CardContent className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </RequirePermission>
    </div>
  );
}
