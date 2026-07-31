import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, ClipboardList, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { RequirePermission, usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  offerApi,
  PREBOARDING_CHECKLIST_STATUSES,
  PREBOARDING_TASK_OWNERS,
  PREBOARDING_TASK_STATUSES,
  PREBOARDING_TASK_TYPES,
  preboardingApi,
  preboardingTaskTemplateApi,
  type OfferDto,
  type PreboardingChecklistDto,
  type PreboardingChecklistStatus,
  type PreboardingTaskInstanceDto,
  type PreboardingTaskOwner,
  type PreboardingTaskStatus,
  type PreboardingTaskTemplateDto,
  type PreboardingTaskType,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-preboarding")({
  head: () => ({
    meta: [{ title: "Preboarding — EWOS Recruitment" }, { name: "robots", content: "noindex" }],
  }),
  component: PreboardingPage,
});

const STATUS_TONE: Record<PreboardingChecklistStatus, StatusTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
  JOINED: "success",
  NO_SHOW: "danger",
};

const TASK_STATUS_TONE: Record<PreboardingTaskStatus, StatusTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  WAITING_ON_CANDIDATE: "warning",
  WAITING_ON_COMPANY: "warning",
  COMPLETED: "success",
  SKIPPED: "neutral",
  FAILED: "danger",
};

/** Mirrors CreatePreboardingTaskTemplateRequest's @Pattern on `code` in the backend. */
const TASK_TEMPLATE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

function PreboardingPage() {
  const { activeCompanyId } = useTenant();
  const { has } = usePermissions();
  const [status, setStatus] = useState<PreboardingChecklistStatus>("IN_PROGRESS");
  const [rows, setRows] = useState<PreboardingChecklistDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<PreboardingTaskTemplateDto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [acceptedOffers, setAcceptedOffers] = useState<OfferDto[]>([]);
  const [pickOffer, setPickOffer] = useState("");
  const [saving, setSaving] = useState(false);

  const [selected, setSelected] = useState<PreboardingChecklistDto | null>(null);
  const [tasks, setTasks] = useState<PreboardingTaskInstanceDto[]>([]);
  const [busy, setBusy] = useState(false);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmEmployeeId, setConfirmEmployeeId] = useState("");
  const [noShowOpen, setNoShowOpen] = useState(false);
  const [noShowReason, setNoShowReason] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const canWrite = has("PREBOARDING_WRITE");
  const canAdmin = has("PREBOARDING_ADMIN");

  const load = async (s: PreboardingChecklistStatus) => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await preboardingApi.byStatus(activeCompanyId, s));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load checklists.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!activeCompanyId) return;
    try {
      setTemplates(await preboardingTaskTemplateApi.listForCompany(activeCompanyId));
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

  const openCreate = async () => {
    setCreateOpen(true);
    setPickOffer("");
    if (!activeCompanyId) return;
    try {
      setAcceptedOffers(await offerApi.byStatus(activeCompanyId, "ACCEPTED"));
    } catch {
      toast.error("Failed to load accepted offers.");
    }
  };

  const submitCreate = async () => {
    if (!pickOffer) {
      toast.error("Select an accepted offer");
      return;
    }
    setSaving(true);
    try {
      await preboardingApi.createFromOffer(pickOffer);
      toast.success("Preboarding checklist created");
      setCreateOpen(false);
      setStatus("PENDING");
      await load("PENDING");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create checklist.");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (checklist: PreboardingChecklistDto) => {
    setSelected(checklist);
    try {
      setTasks(await preboardingApi.listTasks(checklist.id));
    } catch {
      setTasks([]);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const [fresh, freshTasks] = await Promise.all([
        preboardingApi.getChecklist(selected.id),
        preboardingApi.listTasks(selected.id),
      ]);
      setSelected(fresh);
      setTasks(freshTasks);
      setRows((rs) => rs.map((r) => (r.id === fresh.id ? fresh : r)));
    } catch {
      // ignore
    }
  };

  const updateTask = async (taskId: string, taskStatus: PreboardingTaskStatus) => {
    setBusy(true);
    try {
      await preboardingApi.updateTaskStatus(taskId, { status: taskStatus });
      toast.success("Task updated");
      await refreshSelected();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update task.");
    } finally {
      setBusy(false);
    }
  };

  const remindTask = async (taskId: string) => {
    try {
      await preboardingApi.remindTask(taskId);
      toast.success("Reminder sent");
      await refreshSelected();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send reminder.");
    }
  };

  const confirmJoining = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await preboardingApi.confirmJoining(selected.id, {
        employeeId: confirmEmployeeId.trim() || undefined,
      });
      toast.success("Joining confirmed");
      setConfirmOpen(false);
      setConfirmEmployeeId("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to confirm joining.");
    } finally {
      setBusy(false);
    }
  };

  const markNoShow = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await preboardingApi.markNoShow(selected.id, noShowReason.trim() || undefined);
      toast.success("Marked as no-show");
      setNoShowOpen(false);
      setNoShowReason("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to mark no-show.");
    } finally {
      setBusy(false);
    }
  };

  const cancelChecklist = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await preboardingApi.cancel(selected.id, cancelReason.trim() || undefined);
      toast.success("Checklist cancelled");
      setCancelOpen(false);
      setCancelReason("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel checklist.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Preboarding"
        description="Post-acceptance checklist tasks through confirmed joining."
      />

      <Tabs defaultValue="checklists">
        <TabsList>
          <TabsTrigger value="checklists">Checklists</TabsTrigger>
          <TabsTrigger value="templates">Task Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="checklists" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as PreboardingChecklistStatus)}
            >
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PREBOARDING_CHECKLIST_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void load(status)}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <RequirePermission code="PREBOARDING_WRITE">
              <Button size="sm" onClick={() => void openCreate()} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                New Checklist
              </Button>
            </RequirePermission>
          </div>

          <div className="rounded-lg border border-border bg-card">
            {!activeCompanyId ? (
              <EmptyState
                icon={ClipboardList}
                title="Select a company"
                description="Choose a company to view checklists."
              />
            ) : loading ? (
              <div className="grid place-items-center p-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : rows.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title={`No ${status.replace(/_/g, " ").toLowerCase()} checklists`}
                description="Try a different status, or start one from an accepted offer."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Joining date</TableHead>
                      <TableHead className="text-right">Progress</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((c) => (
                      <TableRow
                        key={c.id}
                        className="cursor-pointer"
                        onClick={() => void openDetail(c)}
                      >
                        <TableCell className="text-sm">{c.joiningDate ?? "—"}</TableCell>
                        <TableCell className="w-48">
                          <div className="flex items-center gap-2">
                            <Progress value={c.completionPercent} className="h-2" />
                            <span className="text-xs tabular-nums text-muted-foreground">
                              {c.completionPercent}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={STATUS_TONE[c.status]}>
                            {c.status.replace(/_/g, " ")}
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
            templates={templates}
            reload={loadTemplates}
            canWrite={canAdmin}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New Preboarding Checklist</DialogTitle>
            <DialogDescription>
              Generated from an accepted offer's default task templates.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-accepted-offer">Accepted offer</Label>
            <Select value={pickOffer} onValueChange={setPickOffer}>
              <SelectTrigger id="f-accepted-offer">
                <SelectValue placeholder="Select offer" />
              </SelectTrigger>
              <SelectContent>
                {acceptedOffers.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.offerNumber} — {o.designation}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Preboarding checklist</SheetTitle>
                <SheetDescription>
                  Joining {selected.joiningDate ?? "date TBD"} ·{" "}
                  <StatusChip tone={STATUS_TONE[selected.status]}>
                    {selected.status.replace(/_/g, " ")}
                  </StatusChip>
                </SheetDescription>
              </SheetHeader>

              {canWrite &&
                !["COMPLETED", "CANCELLED", "JOINED", "NO_SHOW"].includes(selected.status) && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button size="sm" variant="outline" onClick={() => setConfirmOpen(true)}>
                      Confirm joining
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setNoShowOpen(true)}>
                      Mark no-show
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setCancelOpen(true)}>
                      Cancel checklist
                    </Button>
                  </div>
                )}

              <div className="mt-6 space-y-2">
                <h4 className="text-sm font-semibold">Tasks</h4>
                {tasks.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tasks on this checklist.</p>
                ) : (
                  tasks.map((t) => (
                    <Card key={t.id}>
                      <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                        <div className="text-sm">
                          <div className="font-medium">
                            {t.name}
                            {t.mandatory && <span className="ml-1 text-destructive">*</span>}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t.taskType.replace(/_/g, " ")} · Owner {t.owner}
                            {t.dueDate ? ` · Due ${t.dueDate}` : ""}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {canWrite ? (
                            <Select
                              value={t.status}
                              onValueChange={(v) =>
                                void updateTask(t.id, v as PreboardingTaskStatus)
                              }
                            >
                              <SelectTrigger className="h-8 w-44">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {PREBOARDING_TASK_STATUSES.map((s) => (
                                  <SelectItem key={s} value={s}>
                                    {s.replace(/_/g, " ")}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <StatusChip tone={TASK_STATUS_TONE[t.status]}>
                              {t.status.replace(/_/g, " ")}
                            </StatusChip>
                          )}
                          {canWrite && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => void remindTask(t.id)}
                              aria-label="Send reminder"
                            >
                              <Bell className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirm joining</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-employee-id-if-already-provisioned">
              Employee ID (if already provisioned)
            </Label>
            <Input
              id="f-employee-id-if-already-provisioned"
              value={confirmEmployeeId}
              onChange={(e) => setConfirmEmployeeId(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void confirmJoining()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noShowOpen} onOpenChange={setNoShowOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Mark as no-show</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-reason">Reason</Label>
            <Textarea
              id="f-reason"
              value={noShowReason}
              onChange={(e) => setNoShowReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoShowOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void markNoShow()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Mark no-show
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel checklist</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-reason-2">Reason</Label>
            <Textarea
              id="f-reason-2"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Back
            </Button>
            <Button variant="destructive" onClick={() => void cancelChecklist()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel checklist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskTemplatesTab({
  companyId,
  templates,
  reload,
  canWrite,
}: {
  companyId: string | undefined;
  templates: PreboardingTaskTemplateDto[];
  reload: () => Promise<void>;
  canWrite: boolean;
}) {
  const [form, setForm] = useState<{
    code: string;
    name: string;
    taskType: PreboardingTaskType;
    defaultOwner: PreboardingTaskOwner;
    mandatory: boolean;
    defaultSlaDays: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form || !companyId) return;
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
      await preboardingTaskTemplateApi.create({
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
      await preboardingTaskTemplateApi.remove(id);
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
              taskType: "DOCUMENT_COLLECTION",
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
        <EmptyState
          title="No task templates yet"
          description="Create reusable preboarding tasks."
        />
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
                  onValueChange={(v) => setForm({ ...form, taskType: v as PreboardingTaskType })}
                >
                  <SelectTrigger id="f-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREBOARDING_TASK_TYPES.map((t) => (
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
                    setForm({ ...form, defaultOwner: v as PreboardingTaskOwner })
                  }
                >
                  <SelectTrigger id="f-default-owner">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PREBOARDING_TASK_OWNERS.map((o) => (
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
