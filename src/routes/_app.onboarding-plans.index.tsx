import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ClipboardList, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Toolbar } from "@/components/ewos/Toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
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
  ONBOARDING_PLAN_STATUSES,
  ONBOARDING_TASK_OWNERS,
  ONBOARDING_TASK_TYPES,
  onboardingPlanApi,
  onboardingTaskTemplateApi,
  type OnboardingPlanDto,
  type OnboardingPlanStatus,
  type OnboardingTaskOwner,
  type OnboardingTaskTemplateDto,
  type OnboardingTaskType,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/onboarding-plans/")({
  head: () => ({
    meta: [{ title: "Onboarding Plans — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: OnboardingPlansPage,
});

const STATUS_TONE: Record<OnboardingPlanStatus, StatusTone> = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

/** Mirrors CreateOnboardingTaskTemplateRequest's @Pattern on `code` in the backend. */
const TASK_TEMPLATE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function OnboardingPlansPage() {
  const { activeCompanyId, tenantId } = useTenant();
  const { has } = usePermissions();
  const navigate = useNavigate();

  const [status, setStatus] = useState<OnboardingPlanStatus>("IN_PROGRESS");
  const [rows, setRows] = useState<OnboardingPlanDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [templates, setTemplates] = useState<OnboardingTaskTemplateDto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    employeeId: "",
    joiningDate: "",
    managerEmployeeId: "",
    buddyEmployeeId: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  const canWrite = has("ONBOARDING_WRITE");
  const canAdmin = has("ONBOARDING_ADMIN");

  const load = async (s: OnboardingPlanStatus) => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await onboardingPlanApi.byStatus(activeCompanyId, s));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load onboarding plans.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!activeCompanyId) return;
    try {
      setTemplates(await onboardingTaskTemplateApi.listForCompany(activeCompanyId));
    } catch {
      setTemplates([]);
    }
  };

  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, status]);

  useEffect(() => {
    void loadTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) =>
        r.employeeId.toLowerCase().includes(q) || (r.joiningDate ?? "").toLowerCase().includes(q),
    );
  }, [rows, search]);

  const openCreate = () => {
    setForm({
      employeeId: "",
      joiningDate: "",
      managerEmployeeId: "",
      buddyEmployeeId: "",
      notes: "",
    });
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!activeCompanyId || !tenantId) return;
    if (!form.employeeId.trim()) {
      toast.error("Employee ID is required");
      return;
    }
    setSaving(true);
    try {
      const created = await onboardingPlanApi.create({
        tenantId,
        companyId: activeCompanyId,
        employeeId: form.employeeId.trim(),
        joiningDate: form.joiningDate || undefined,
        managerEmployeeId: form.managerEmployeeId.trim() || undefined,
        buddyEmployeeId: form.buddyEmployeeId.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      toast.success("Onboarding plan created");
      setCreateOpen(false);
      await navigate({ to: "/onboarding-plans/$id", params: { id: created.id } });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create onboarding plan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="Plans & Tasks"
        description="New-hire onboarding plans, their tasks, and reusable task templates."
      />

      <Tabs defaultValue="plans">
        <TabsList>
          <TabsTrigger value="plans">Plans</TabsTrigger>
          <TabsTrigger value="templates">Task Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="mt-4 space-y-4">
          <Toolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search by employee ID or joining date…"
            filters={
              <Select value={status} onValueChange={(v) => setStatus(v as OnboardingPlanStatus)}>
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ONBOARDING_PLAN_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
            actions={
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void load(status)}
                  disabled={loading}
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
                <RequirePermission code="ONBOARDING_WRITE">
                  <Button size="sm" onClick={openCreate} disabled={!activeCompanyId}>
                    <Plus className="h-4 w-4" />
                    New Plan
                  </Button>
                </RequirePermission>
              </>
            }
          />

          <div className="rounded-lg border border-border bg-card">
            {!activeCompanyId ? (
              <EmptyState
                icon={ClipboardList}
                title="Select a company"
                description="Choose a company to view onboarding plans."
              />
            ) : loading ? (
              <div className="grid place-items-center p-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : filteredRows.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={`No ${status.replace(/_/g, " ").toLowerCase()} plans`}
                description="Try a different status, or start one manually."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Joining date</TableHead>
                      <TableHead className="text-right">Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRows.map((p) => (
                      <TableRow
                        key={p.id}
                        className="cursor-pointer"
                        onClick={() =>
                          void navigate({ to: "/onboarding-plans/$id", params: { id: p.id } })
                        }
                      >
                        <TableCell className="font-mono text-xs">{p.employeeId}</TableCell>
                        <TableCell className="text-sm">{p.joiningDate ?? "—"}</TableCell>
                        <TableCell className="w-48">
                          <div className="flex items-center gap-2">
                            <Progress value={p.completionPercent} className="h-2" />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {p.completionPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={STATUS_TONE[p.status]}>
                            {p.status.replace(/_/g, " ")}
                          </StatusChip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="templates" className="mt-4">
          <TaskTemplatesTab
            companyId={activeCompanyId}
            tenantId={tenantId}
            templates={templates}
            reload={loadTemplates}
            canWrite={canAdmin}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Onboarding Plan</DialogTitle>
            <DialogDescription>
              Manually start a plan for an employee. Plans are normally created automatically once a
              candidate's preboarding checklist reaches JOINED.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-employee-id">
                Employee ID<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-employee-id"
                value={form.employeeId}
                onChange={(e) => setForm({ ...form, employeeId: e.target.value })}
                placeholder="UUID"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-joining-date">Joining date</Label>
              <Input
                id="f-joining-date"
                type="date"
                value={form.joiningDate}
                onChange={(e) => setForm({ ...form, joiningDate: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-manager-id">Manager ID</Label>
                <Input
                  id="f-manager-id"
                  value={form.managerEmployeeId}
                  onChange={(e) => setForm({ ...form, managerEmployeeId: e.target.value })}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-buddy-id">Buddy ID</Label>
                <Input
                  id="f-buddy-id"
                  value={form.buddyEmployeeId}
                  onChange={(e) => setForm({ ...form, buddyEmployeeId: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-notes">Notes</Label>
              <Input
                id="f-notes"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskTemplatesTab({
  companyId,
  tenantId,
  templates,
  reload,
  canWrite,
}: {
  companyId: string | undefined;
  tenantId: string | undefined;
  templates: OnboardingTaskTemplateDto[];
  reload: () => Promise<void>;
  canWrite: boolean;
}) {
  const [form, setForm] = useState<{
    code: string;
    name: string;
    taskType: OnboardingTaskType;
    defaultOwner: OnboardingTaskOwner;
    mandatory: boolean;
    defaultSlaDays: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form || !companyId || !tenantId) return;
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    if (!TASK_TEMPLATE_CODE_PATTERN.test(form.code.trim())) {
      toast.error(
        "Code must start with a letter or digit and contain only letters, digits, '.', '_', or '-'",
      );
      return;
    }
    if (form.defaultSlaDays && Number(form.defaultSlaDays) < 0) {
      toast.error("Default SLA days cannot be negative");
      return;
    }
    setSaving(true);
    try {
      await onboardingTaskTemplateApi.create({
        tenantId,
        companyId,
        code: form.code.trim(),
        name: form.name.trim(),
        taskType: form.taskType,
        defaultOwner: form.defaultOwner,
        mandatory: form.mandatory,
        defaultSlaDays: form.defaultSlaDays ? Number(form.defaultSlaDays) : undefined,
      });
      toast.success("Task template created");
      setForm(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save template.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await onboardingTaskTemplateApi.remove(id);
      toast.success("Task template deleted");
      await reload();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to delete template.");
    }
  };

  return (
    <div className="space-y-3">
      {canWrite && (
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setForm({
              code: "",
              name: "",
              taskType: "ORIENTATION",
              defaultOwner: "HR",
              mandatory: true,
              defaultSlaDays: "3",
            })
          }
          disabled={!companyId}
        >
          <Plus className="h-4 w-4" />
          New task template
        </Button>
      )}
      {templates.length === 0 ? (
        <EmptyState title="No task templates yet" description="Create reusable onboarding tasks." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Owner</TableHead>
                <TableHead>Mandatory</TableHead>
                {canWrite && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell className="text-sm">{t.name}</TableCell>
                  <TableCell className="text-sm">{t.taskType.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-sm">{t.defaultOwner}</TableCell>
                  <TableCell>
                    <StatusChip tone={t.mandatory ? "warning" : "neutral"}>
                      {t.mandatory ? "Yes" : "No"}
                    </StatusChip>
                  </TableCell>
                  {canWrite && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void remove(t.id)}
                        aria-label={`Delete task template ${t.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New task template</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-code">Code</Label>
                <Input
                  id="f-code"
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-name">Name</Label>
                <Input
                  id="f-name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-type">Type</Label>
                <Select
                  value={form.taskType}
                  onValueChange={(v) => setForm({ ...form, taskType: v as OnboardingTaskType })}
                >
                  <SelectTrigger id="f-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_TASK_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-default-owner">Default owner</Label>
                <Select
                  value={form.defaultOwner}
                  onValueChange={(v) =>
                    setForm({ ...form, defaultOwner: v as OnboardingTaskOwner })
                  }
                >
                  <SelectTrigger id="f-default-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ONBOARDING_TASK_OWNERS.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-default-sla-days">Default SLA (days)</Label>
                <Input
                  id="f-default-sla-days"
                  type="number"
                  min={0}
                  value={form.defaultSlaDays}
                  onChange={(e) => setForm({ ...form, defaultSlaDays: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="tt-mandatory"
                  checked={form.mandatory}
                  onCheckedChange={(c) => setForm({ ...form, mandatory: c === true })}
                />
                <Label htmlFor="tt-mandatory">Mandatory</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
