import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
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
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  performanceCycleApi,
  performanceReportsApi,
  type PerformanceCycleDto,
  type RatingDistributionBucketDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-rating-distribution")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Rating Distribution — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: RatingDistributionPage,
});

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function RatingDistributionPage() {
  const { activeCompanyId } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [buckets, setBuckets] = useState<RatingDistributionBucketDto[] | null>(null);
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
    performanceReportsApi
      .ratingDistribution(cycleId)
      .then(setBuckets)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load rating distribution."),
      )
      .finally(() => setLoading(false));
  }, [cycleId]);

  const chartData = (buckets ?? []).map((b) => ({ ...b, label: String(b.ratingBucket) }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Rating Distribution Dashboard"
        description="Finalised appraisals bucketed by whole-number rating."
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

      {!cycleId ? (
        <EmptyState
          title="Select a cycle"
          description="Choose an appraisal cycle to view its rating distribution."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load rating distribution" description={error} />
      ) : chartData.length === 0 ? (
        <EmptyState
          title="No finalised appraisals yet"
          description="This report populates once ratings are finalised for this cycle."
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
    </div>
  );
}
