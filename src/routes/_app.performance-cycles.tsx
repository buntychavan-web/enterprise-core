import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarClock, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Toolbar } from "@/components/ewos/Toolbar";
import { CycleStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequirePermission, usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  performanceCycleApi,
  type CreatePerformanceCyclePayload,
  type PerformanceCycleDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-cycles")({
  head: () => ({
    meta: [{ title: "Appraisal Cycles — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PerformanceCyclesPage,
});

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  periodStart: "",
  periodEnd: "",
  selfAssessmentDue: "",
  managerAssessmentDue: "",
  reviewerAssessmentDue: "",
  calibrationDue: "",
  bellCurveEnabled: false,
};

function PerformanceCyclesPage() {
  const { tenantId, activeCompanyId } = useTenant();
  const { has } = usePermissions();
  const canAdmin = has("PERF_ADMIN");

  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await performanceCycleApi.listForCompany(activeCompanyId);
      setCycles(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load appraisal cycles.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!tenantId || !activeCompanyId) return;
    if (!form.code.trim() || !form.name.trim() || !form.periodStart || !form.periodEnd) {
      toast.error("Code, name, period start, and period end are required");
      return;
    }
    if (form.periodEnd <= form.periodStart) {
      toast.error("Period end must be after period start");
      return;
    }
    const payload: CreatePerformanceCyclePayload = {
      tenantId,
      companyId: activeCompanyId,
      code: form.code.trim(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      periodStart: form.periodStart,
      periodEnd: form.periodEnd,
      selfAssessmentDue: form.selfAssessmentDue || undefined,
      managerAssessmentDue: form.managerAssessmentDue || undefined,
      reviewerAssessmentDue: form.reviewerAssessmentDue || undefined,
      calibrationDue: form.calibrationDue || undefined,
      bellCurveEnabled: form.bellCurveEnabled,
    };
    setSaving(true);
    try {
      await performanceCycleApi.create(payload);
      toast.success("Appraisal cycle created");
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create cycle.");
    } finally {
      setSaving(false);
    }
  };

  const filtered = cycles.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Appraisal Cycle Management"
        description="Create and manage appraisal cycles through their Draft → Closed lifecycle."
        actions={
          <RequirePermission code="PERF_ADMIN">
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New cycle
            </Button>
          </RequirePermission>
        }
      />

      {!activeCompanyId ? (
        <EmptyState
          title="Select a company"
          description="Choose a company to view its appraisal cycles."
        />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Toolbar search={search} onSearchChange={setSearch} searchPlaceholder="Search cycles…" />
          {loading ? (
            <div className="grid place-items-center p-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <EmptyState title="Couldn't load cycles" description={error} />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={CalendarClock}
              title={cycles.length === 0 ? "No appraisal cycles yet" : "No matches"}
              description={
                cycles.length === 0
                  ? "Create your first appraisal cycle to get started."
                  : "Try a different search term."
              }
              action={
                cycles.length === 0 && canAdmin ? (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4" />
                    New cycle
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer" tabIndex={0}>
                      <TableCell className="text-sm font-mono text-xs">
                        <Link
                          to="/performance-cycles/$id"
                          params={{ id: c.id }}
                          className="hover:underline"
                        >
                          {c.code}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <Link
                          to="/performance-cycles/$id"
                          params={{ id: c.id }}
                          className="hover:underline"
                        >
                          {c.name}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {c.periodStart} – {c.periodEnd}
                      </TableCell>
                      <TableCell>
                        <CycleStatusChip status={c.status} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>New appraisal cycle</DialogTitle>
            <DialogDescription>Cycles start in Draft status.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-code">
                  Code<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="f-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                  maxLength={64}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-name">
                  Name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="f-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  maxLength={256}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-description">Description</Label>
              <Textarea
                id="f-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-period-start">
                  Period start<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="f-period-start"
                  type="date"
                  value={form.periodStart}
                  onChange={(e) => setForm({ ...form, periodStart: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-period-end">
                  Period end<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="f-period-end"
                  type="date"
                  value={form.periodEnd}
                  onChange={(e) => setForm({ ...form, periodEnd: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-self-due">Self review due</Label>
                <Input
                  id="f-self-due"
                  type="date"
                  value={form.selfAssessmentDue}
                  onChange={(e) => setForm({ ...form, selfAssessmentDue: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-manager-due">Manager review due</Label>
                <Input
                  id="f-manager-due"
                  type="date"
                  value={form.managerAssessmentDue}
                  onChange={(e) => setForm({ ...form, managerAssessmentDue: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-reviewer-due">Reviewer review due</Label>
                <Input
                  id="f-reviewer-due"
                  type="date"
                  value={form.reviewerAssessmentDue}
                  onChange={(e) => setForm({ ...form, reviewerAssessmentDue: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-calibration-due">Calibration due</Label>
                <Input
                  id="f-calibration-due"
                  type="date"
                  value={form.calibrationDue}
                  onChange={(e) => setForm({ ...form, calibrationDue: e.target.value })}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="f-bell-curve"
                checked={form.bellCurveEnabled}
                onCheckedChange={(c) => setForm({ ...form, bellCurveEnabled: c === true })}
              />
              <Label htmlFor="f-bell-curve">Enable bell curve for this cycle</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create cycle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
