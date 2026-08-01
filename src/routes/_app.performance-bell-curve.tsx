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
  appraisalApi,
  performanceCycleApi,
  type BellCurveBucketDto,
  type PerformanceCycleDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-bell-curve")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Bell Curve — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: BellCurvePage,
});

const tooltipStyle: React.CSSProperties = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--popover-foreground)",
};

function BellCurvePage() {
  const { activeCompanyId } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [buckets, setBuckets] = useState<BellCurveBucketDto[] | null>(null);
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
    appraisalApi
      .bellCurve(cycleId)
      .then(setBuckets)
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load bell curve."),
      )
      .finally(() => setLoading(false));
  }, [cycleId]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Bell Curve Dashboard"
        description="Distribution of finalised ratings across performance bands."
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
          description="Choose an appraisal cycle to view its bell curve."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load bell curve" description={error} />
      ) : !buckets || buckets.length === 0 ? (
        <EmptyState
          title="No finalised appraisals yet"
          description="The bell curve populates once ratings are finalised for this cycle."
        />
      ) : (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Rating band distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={buckets}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="band" stroke="var(--muted-foreground)" fontSize={12} />
                <YAxis stroke="var(--muted-foreground)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value: number, name: string, item) => [
                    name === "count"
                      ? `${value} (${(item.payload as BellCurveBucketDto).percent.toFixed(1)}%)`
                      : value,
                    "Employees",
                  ]}
                />
                <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
