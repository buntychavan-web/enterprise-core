import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RequirePermission } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  appraisalApi,
  employeeReportsApi,
  performanceCycleApi,
  type AppraisalDto,
  type PerformanceCycleDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/team-performance-summary")({
  head: () => ({
    meta: [{ title: "Performance Summary — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamPerformanceSummaryPage,
});

type EmployeeOption = ResourceRecord & {
  id: string;
  displayName?: string;
  employeeNumber?: string;
};

function TeamPerformanceSummaryPage() {
  const { activeCompanyId } = useTenant();
  const [reports, setReports] = useState<EmployeeOption[]>([]);
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState("");
  const [appraisalsByEmployee, setAppraisalsByEmployee] = useState<Record<string, AppraisalDto>>(
    {},
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    employeeReportsApi
      .myReports()
      .then((r) => setReports(r as EmployeeOption[]))
      .catch(() => setReports([]));
  }, []);

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
    const reportIds = new Set(reports.map((r) => r.id));
    appraisalApi
      .listByCycle(cycleId)
      .then((all) => {
        const map: Record<string, AppraisalDto> = {};
        for (const a of all) {
          if (reportIds.has(a.employeeId)) map[a.employeeId] = a;
        }
        setAppraisalsByEmployee(map);
      })
      .catch((err) =>
        setError(err instanceof ApiError ? err.message : "Failed to load performance summary."),
      )
      .finally(() => setLoading(false));
  }, [cycleId, reports]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Performance Summary"
        description="Ratings and outcomes for your direct reports in a selected cycle."
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
            description="Choose a cycle to see your team's performance summary."
          />
        ) : loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load performance summary" description={error} />
        ) : reports.length === 0 ? (
          <EmptyState
            title="No direct reports"
            description="You have no direct reports on record."
          />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Self</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead>Band</TableHead>
                  <TableHead>Increment</TableHead>
                  <TableHead>Promotion</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r) => {
                  const a = appraisalsByEmployee[r.id];
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="text-sm font-medium">
                        {r.displayName ?? r.id}
                        {r.employeeNumber ? ` (${r.employeeNumber})` : ""}
                      </TableCell>
                      {a ? (
                        <>
                          <TableCell>
                            <AppraisalStatusChip status={a.status} />
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {a.selfRating ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {a.managerRating ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm text-muted-foreground">
                            {a.reviewerRating ?? "—"}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">
                            {a.finalRating ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.finalBand ?? "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.incrementRecommendation && a.incrementRecommendation !== "NONE"
                              ? a.incrementRecommendation.replace(/_/g, " ")
                              : "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {a.promotionRecommendation && a.promotionRecommendation !== "NONE"
                              ? a.promotionRecommendation.replace(/_/g, " ")
                              : "—"}
                          </TableCell>
                        </>
                      ) : (
                        <TableCell colSpan={7} className="text-sm text-muted-foreground">
                          No appraisal in this cycle
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </RequirePermission>
    </div>
  );
}
