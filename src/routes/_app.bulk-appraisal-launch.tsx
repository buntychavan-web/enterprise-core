import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { LaunchBatchStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  appraisalCycleLaunchApi,
  appraisalTemplateApi,
  performanceCycleApi,
  resourceApi,
  type AppraisalCycleLaunchBatchDto,
  type AppraisalTemplateDto,
  type PerformanceCycleDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/bulk-appraisal-launch")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Bulk Appraisal Launch — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: BulkAppraisalLaunchPage,
});

type OrgUnitOption = ResourceRecord & { id: string; name?: string; code?: string };

function BulkAppraisalLaunchPage() {
  const { tenantId, activeCompanyId, apiOptions } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();

  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplateDto[]>([]);
  const [orgUnits, setOrgUnits] = useState<OrgUnitOption[]>([]);
  const [batches, setBatches] = useState<AppraisalCycleLaunchBatchDto[]>([]);

  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [templateId, setTemplateId] = useState("");
  const [selectedOrgUnits, setSelectedOrgUnits] = useState<string[]>([]);
  const [includeDescendants, setIncludeDescendants] = useState(true);
  const [employeeStatus, setEmployeeStatus] = useState<"ACTIVE" | "ON_LEAVE" | "TERMINATED">(
    "ACTIVE",
  );
  const [launching, setLaunching] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then(setCycles)
      .catch(() => setCycles([]));
    appraisalTemplateApi
      .listForCompany(activeCompanyId)
      .then(setTemplates)
      .catch(() => setTemplates([]));
    resourceApi<OrgUnitOption>("/organization/units", apiOptions)
      .list()
      .then((r) => setOrgUnits(r.items))
      .catch(() => setOrgUnits([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const loadBatches = (id: string) => {
    appraisalCycleLaunchApi
      .listBatches(id)
      .then(setBatches)
      .catch(() => setBatches([]));
  };

  useEffect(() => {
    if (cycleId) loadBatches(cycleId);
    else setBatches([]);
  }, [cycleId]);

  // Poll while any batch is still PENDING/RUNNING, mirroring the backend's
  // async chunked processing — the batch row is created synchronously but
  // employee matching + appraisal creation happen after the request returns.
  useEffect(() => {
    if (!cycleId) return;
    const active = batches.some((b) => b.status === "PENDING" || b.status === "RUNNING");
    if (!active) return;
    const t = setInterval(() => loadBatches(cycleId), 3000);
    return () => clearInterval(t);
  }, [batches, cycleId]);

  const toggleOrgUnit = (id: string) => {
    setSelectedOrgUnits((cur) => (cur.includes(id) ? cur.filter((v) => v !== id) : [...cur, id]));
  };

  const launch = async () => {
    if (!tenantId || !activeCompanyId || !cycleId || !templateId) {
      toast.error("Cycle and template are required");
      return;
    }
    setLaunching(true);
    try {
      await appraisalCycleLaunchApi.launch(cycleId, {
        tenantId,
        companyId: activeCompanyId,
        templateId,
        organizationUnitIds: selectedOrgUnits.length > 0 ? selectedOrgUnits : undefined,
        includeDescendants,
        employeeStatus,
      });
      toast.success("Bulk launch started — appraisals are being created in the background.");
      loadBatches(cycleId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to start bulk launch.");
    } finally {
      setLaunching(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Bulk Appraisal Launch"
        description="Launch appraisals for every eligible employee under an organization filter, in one call."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Launch parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-cycle">
                Appraisal cycle<span className="ml-0.5 text-destructive">*</span>
              </Label>
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
            <div className="space-y-1.5">
              <Label htmlFor="f-template">
                Appraisal template<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="f-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              Organization units (Company / Business Unit / Department / Location / Cost Centre)
            </Label>
            <p className="text-xs text-muted-foreground">
              Leave empty to match every eligible employee in the company.
            </p>
            {orgUnits.length === 0 ? (
              <p className="text-sm text-muted-foreground">No organization units found.</p>
            ) : (
              <div className="max-h-56 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {orgUnits.map((u) => (
                  <label
                    key={u.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
                  >
                    <Checkbox
                      checked={selectedOrgUnits.includes(u.id)}
                      onCheckedChange={() => toggleOrgUnit(u.id)}
                    />
                    <span>
                      {u.name ?? u.id}
                      {u.code && (
                        <span className="ml-1 text-xs text-muted-foreground">({u.code})</span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            )}
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeDescendants}
                onCheckedChange={(c) => setIncludeDescendants(c === true)}
              />
              Include descendants of the selected units
            </label>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-status">Employee status</Label>
            <Select
              value={employeeStatus}
              onValueChange={(v) => setEmployeeStatus(v as typeof employeeStatus)}
            >
              <SelectTrigger id="f-status" className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="ON_LEAVE">On leave</SelectItem>
                <SelectItem value="TERMINATED">Terminated</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end">
            <Button onClick={() => void launch()} disabled={launching || !cycleId || !templateId}>
              {launching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              Launch
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Launch batches</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {!cycleId ? (
            <EmptyState
              title="Select a cycle"
              description="Choose a cycle above to see its launch history."
            />
          ) : batches.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">No launches yet for this cycle.</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Matched</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Skipped</TableHead>
                    <TableHead>Failed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {batches.map((b) => (
                    <TableRow key={b.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {b.createdAt.slice(0, 16).replace("T", " ")}
                      </TableCell>
                      <TableCell>
                        <LaunchBatchStatusChip status={b.status} />
                      </TableCell>
                      <TableCell className="w-32">
                        <Progress
                          value={b.totalMatched === 0 ? 0 : (b.totalCreated * 100) / b.totalMatched}
                          className="h-2"
                        />
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">{b.totalMatched}</TableCell>
                      <TableCell className="tabular-nums text-sm">{b.totalCreated}</TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {b.totalSkippedExisting}
                      </TableCell>
                      <TableCell className="tabular-nums text-sm">
                        {b.totalFailed > 0 ? (
                          <span className="text-destructive">{b.totalFailed}</span>
                        ) : (
                          b.totalFailed
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
