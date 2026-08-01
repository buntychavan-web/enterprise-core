import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ChevronRight, GaugeCircle, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  performanceCycleApi,
  performanceReportsApi,
  type OrgUnitProgressDto,
  type PerformanceCycleDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-progress")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Progress Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PerformanceProgressPage,
});

/**
 * Serves "Progress Dashboard", "Department Progress", "Business Unit
 * Progress" and "Company Progress" from the sprint brief as ONE drill-down
 * screen, mirroring the backend's own decision not to duplicate this report
 * per org-unit type (PerformanceReportsService javadoc): department and
 * business unit are the same OrganizationUnit concept differing only in
 * unitType, and calling this with no root shows the top-level (company)
 * view. Breadcrumbs let HR walk Company → Business Unit → Department → ...
 * without leaving the screen.
 */
function PerformanceProgressPage() {
  const { activeCompanyId } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [breadcrumb, setBreadcrumb] = useState<{ id: string | null; name: string }[]>([
    { id: null, name: "Company" },
  ]);
  const [rows, setRows] = useState<OrgUnitProgressDto[]>([]);
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
    setBreadcrumb([{ id: null, name: "Company" }]);
  }, [cycleId]);

  const load = async (rootId: string | null) => {
    if (!cycleId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await performanceReportsApi.orgUnitProgress(cycleId, rootId ?? undefined));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load progress.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(breadcrumb[breadcrumb.length - 1]?.id ?? null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, breadcrumb]);

  const drillInto = (row: OrgUnitProgressDto) => {
    setBreadcrumb((cur) => [
      ...cur,
      { id: row.orgUnitId, name: row.orgUnitName ?? row.orgUnitCode ?? row.orgUnitId },
    ]);
  };

  const jumpTo = (index: number) => {
    setBreadcrumb((cur) => cur.slice(0, index + 1));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Progress Dashboard"
        description="Appraisal completion across the organization hierarchy — drill in for Department, Business Unit, or Company-level rollups."
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
          description="Choose an appraisal cycle to view progress."
        />
      ) : (
        <>
          <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1 text-sm">
            {breadcrumb.map((b, i) => (
              <span key={b.id ?? "root"} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                <Button
                  variant="link"
                  size="sm"
                  className="h-auto p-0"
                  disabled={i === breadcrumb.length - 1}
                  onClick={() => jumpTo(i)}
                >
                  {b.name}
                </Button>
              </span>
            ))}
          </nav>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">
                {breadcrumb[breadcrumb.length - 1].name} — org units
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="grid place-items-center p-16 text-sm text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                </div>
              ) : error ? (
                <div className="p-5">
                  <EmptyState title="Couldn't load progress" description={error} />
                </div>
              ) : rows.length === 0 ? (
                <EmptyState
                  icon={GaugeCircle}
                  title="No org units here"
                  description="This node has no child units, or no appraisals under it yet."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Unit</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Finalised</TableHead>
                        <TableHead className="w-48">Completion</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow
                          key={r.orgUnitId}
                          className="cursor-pointer"
                          onClick={() => drillInto(r)}
                        >
                          <TableCell className="text-sm font-medium">
                            {r.orgUnitName ?? r.orgUnitCode ?? r.orgUnitId}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">
                            {r.totalAppraisals}
                          </TableCell>
                          <TableCell className="tabular-nums text-sm">{r.finalised}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Progress value={r.completionPercent} className="h-2" />
                              <span className="text-xs tabular-nums text-muted-foreground">
                                {r.completionPercent.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
