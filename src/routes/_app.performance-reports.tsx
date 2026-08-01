import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { DataPagination } from "@/components/ewos/DataPagination";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { StatCard } from "@/components/ewos/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  type AppraisalReportRowDto,
  type CalibrationSummaryDto,
  type FinalRatingSummaryDto,
  type PerformanceCycleDto,
  type SpringPage,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-reports")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Reports Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PerformanceReportsPage,
});

const PAGE_SIZE = 10;

function downloadCsv(filename: string, rows: AppraisalReportRowDto[]) {
  const header = [
    "Employee",
    "Employee Number",
    "Status",
    "Self",
    "Manager",
    "Reviewer",
    "Calibrated",
    "Final",
    "Band",
  ];
  const lines = rows.map((r) =>
    [
      r.employeeName ?? "",
      r.employeeNumber ?? "",
      r.status,
      r.selfRating ?? "",
      r.managerRating ?? "",
      r.reviewerRating ?? "",
      r.calibratedRating ?? "",
      r.finalRating ?? "",
      r.finalBand ?? "",
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(","),
  );
  const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function ReportTable({
  cycleId,
  fetcher,
  emptyLabel,
}: {
  cycleId: string;
  fetcher: (
    cycleId: string,
    page: number,
    size: number,
  ) => Promise<SpringPage<AppraisalReportRowDto>>;
  emptyLabel: string;
}) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<SpringPage<AppraisalReportRowDto> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetcher(cycleId, page - 1, PAGE_SIZE)
      .then(setData)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load report."))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycleId, page]);

  if (loading) {
    return (
      <div className="grid place-items-center p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }
  if (error) return <EmptyState title="Couldn't load report" description={error} />;
  if (!data || data.content.length === 0) {
    return <EmptyState title="Nothing here" description={emptyLabel} />;
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex justify-end p-3">
        <Button size="sm" variant="outline" onClick={() => downloadCsv("report.csv", data.content)}>
          <Download className="h-4 w-4" />
          Export CSV (this page)
        </Button>
      </div>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Self</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Reviewer</TableHead>
              <TableHead>Final</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.content.map((r) => (
              <TableRow key={r.appraisalId}>
                <TableCell className="text-sm font-medium">
                  {r.employeeName ?? r.employeeNumber ?? r.employeeId}
                </TableCell>
                <TableCell>
                  <AppraisalStatusChip status={r.status} />
                </TableCell>
                <TableCell className="tabular-nums text-sm text-muted-foreground">
                  {r.selfRating ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums text-sm text-muted-foreground">
                  {r.managerRating ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums text-sm text-muted-foreground">
                  {r.reviewerRating ?? "—"}
                </TableCell>
                <TableCell className="tabular-nums text-sm">{r.finalRating ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <DataPagination
        page={page}
        pageSize={PAGE_SIZE}
        total={data.totalElements}
        onPageChange={setPage}
      />
    </div>
  );
}

function PerformanceReportsPage() {
  const { activeCompanyId } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();
  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [calSummary, setCalSummary] = useState<CalibrationSummaryDto | null>(null);
  const [finalSummary, setFinalSummary] = useState<FinalRatingSummaryDto | null>(null);

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then(setCycles)
      .catch(() => setCycles([]));
  }, [activeCompanyId]);

  useEffect(() => {
    if (!cycleId) return;
    performanceReportsApi
      .calibrationSummary(cycleId)
      .then(setCalSummary)
      .catch(() => setCalSummary(null));
    performanceReportsApi
      .finalRatingSummary(cycleId)
      .then(setFinalSummary)
      .catch(() => setFinalSummary(null));
  }, [cycleId]);

  const fetchers = useMemo(
    () => ({
      self: performanceReportsApi.pendingSelfReviews,
      manager: performanceReportsApi.pendingManagerReviews,
      reviewer: performanceReportsApi.pendingReviewerReviews,
      employeeStatus: (id: string, page: number, size: number) =>
        performanceReportsApi.employeeStatus(id, {}, page, size),
    }),
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Reports Dashboard"
        description="Pending reviews, employee status, calibration summary, and final rating summary — all filterable, sortable, and paginated by cycle."
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
          description="Choose an appraisal cycle to view reports."
        />
      ) : (
        <Tabs defaultValue="self">
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            <TabsTrigger value="self">Pending Self</TabsTrigger>
            <TabsTrigger value="manager">Pending Manager</TabsTrigger>
            <TabsTrigger value="reviewer">Pending Reviewer</TabsTrigger>
            <TabsTrigger value="employeeStatus">Employee Status</TabsTrigger>
            <TabsTrigger value="calibration">Calibration Summary</TabsTrigger>
            <TabsTrigger value="finalRating">Final Rating Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="self" className="mt-4">
            <ReportTable
              cycleId={cycleId}
              fetcher={fetchers.self}
              emptyLabel="No self reviews pending."
            />
          </TabsContent>
          <TabsContent value="manager" className="mt-4">
            <ReportTable
              cycleId={cycleId}
              fetcher={fetchers.manager}
              emptyLabel="No manager reviews pending."
            />
          </TabsContent>
          <TabsContent value="reviewer" className="mt-4">
            <ReportTable
              cycleId={cycleId}
              fetcher={fetchers.reviewer}
              emptyLabel="No reviewer reviews pending."
            />
          </TabsContent>
          <TabsContent value="employeeStatus" className="mt-4">
            <ReportTable
              cycleId={cycleId}
              fetcher={fetchers.employeeStatus}
              emptyLabel="No appraisals in this cycle."
            />
          </TabsContent>

          <TabsContent value="calibration" className="mt-4">
            {!calSummary ? (
              <EmptyState
                title="No calibration data"
                description="No calibrated appraisals in this cycle yet."
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
                <StatCard
                  label="Total calibrated"
                  value={calSummary.totalCalibrated}
                  icon={<Download className="h-5 w-5" />}
                />
                <StatCard
                  label="Adjusted up"
                  value={calSummary.adjustedUp}
                  icon={<Download className="h-5 w-5" />}
                />
                <StatCard
                  label="Adjusted down"
                  value={calSummary.adjustedDown}
                  icon={<Download className="h-5 w-5" />}
                />
                <StatCard
                  label="Unchanged"
                  value={calSummary.unchanged}
                  icon={<Download className="h-5 w-5" />}
                />
                <StatCard
                  label="Average delta"
                  value={calSummary.averageDelta.toFixed(2)}
                  icon={<Download className="h-5 w-5" />}
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="finalRating" className="mt-4 space-y-4">
            {!finalSummary || finalSummary.totalFinalised === 0 ? (
              <EmptyState
                title="No finalised appraisals"
                description="This report populates once ratings are finalised for this cycle."
              />
            ) : (
              <>
                <StatCard
                  label="Total finalised"
                  value={finalSummary.totalFinalised}
                  icon={<Download className="h-5 w-5" />}
                />
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-semibold">By band</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <ul className="divide-y divide-border">
                      {finalSummary.byBand.map((b) => (
                        <li
                          key={b.band}
                          className="flex items-center justify-between px-5 py-3 text-sm"
                        >
                          <span className="font-medium text-foreground">{b.band}</span>
                          <span className="text-muted-foreground">
                            {b.count} · avg {b.averageRating?.toFixed(2) ?? "—"}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        By increment recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-border">
                        {Object.entries(finalSummary.byIncrementRecommendation).map(([k, v]) => (
                          <li
                            key={k}
                            className="flex items-center justify-between px-5 py-3 text-sm"
                          >
                            <span>{k.replace(/_/g, " ")}</span>
                            <span className="tabular-nums text-muted-foreground">{v}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        By promotion recommendation
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ul className="divide-y divide-border">
                        {Object.entries(finalSummary.byPromotionRecommendation).map(([k, v]) => (
                          <li
                            key={k}
                            className="flex items-center justify-between px-5 py-3 text-sm"
                          >
                            <span>{k.replace(/_/g, " ")}</span>
                            <span className="tabular-nums text-muted-foreground">{v}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
