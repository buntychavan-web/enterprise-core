import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { GaugeCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatCard } from "@/components/ewos/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
  type AppraisalStatus,
  type PerformanceCycleDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/team-progress")({
  head: () => ({
    meta: [{ title: "Team Progress — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamProgressPage,
});

const STATUS_ORDER: AppraisalStatus[] = [
  "PENDING_SELF",
  "PENDING_MANAGER",
  "PENDING_REVIEWER",
  "CALIBRATION",
  "PENDING_APPROVAL",
  "FINALISED",
  "CANCELLED",
];

function TeamProgressPage() {
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
        setError(err instanceof ApiError ? err.message : "Failed to load team progress."),
      )
      .finally(() => setLoading(false));
  }, [cycleId]);

  const total = teamAppraisals?.length ?? 0;
  const finalised = teamAppraisals?.filter((a) => a.status === "FINALISED").length ?? 0;
  const completionPercent = total === 0 ? 0 : (finalised * 100) / total;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Team Progress"
        description="Appraisal completion across your direct reports for a selected cycle."
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
            icon={GaugeCircle}
            title="Select a cycle"
            description="Choose a cycle to see your team's progress."
          />
        ) : loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load team progress" description={error} />
        ) : !teamAppraisals || teamAppraisals.length === 0 ? (
          <EmptyState
            icon={GaugeCircle}
            title="No appraisals"
            description="No appraisals found for your team in this cycle."
          />
        ) : (
          <>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Overall completion</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Progress value={completionPercent} className="h-3 flex-1" />
                  <span className="text-sm tabular-nums text-muted-foreground">
                    {completionPercent.toFixed(0)}%
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  {finalised} of {total} appraisals finalised
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 xl:grid-cols-4">
              {STATUS_ORDER.map((status) => (
                <StatCard
                  key={status}
                  label={status.replace(/_/g, " ")}
                  value={teamAppraisals.filter((a) => a.status === status).length}
                  icon={<GaugeCircle className="h-5 w-5" />}
                />
              ))}
            </div>
          </>
        )}
      </RequirePermission>
    </div>
  );
}
