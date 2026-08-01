import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Bell,
  CheckCircle2,
  Circle,
  FileCheck2,
  Loader2,
  Plus,
  UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Toolbar } from "@/components/ewos/Toolbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ONBOARDING_TASK_OWNERS,
  ONBOARDING_TASK_STATUSES,
  ONBOARDING_TASK_TYPES,
  onboardingPlanApi,
  onboardingTaskTemplateApi,
  resourceApi,
  type OnboardingPlanDto,
  type OnboardingPlanStatus,
  type OnboardingTaskInstanceDto,
  type OnboardingTaskOwner,
  type OnboardingTaskStatus,
  type OnboardingTaskTemplateDto,
  type OnboardingTaskType,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/onboarding-plans/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Onboarding Plan ${params.id} — EWOS` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPlanDetailPage,
});

const PLAN_STATUS_TONE: Record<OnboardingPlanStatus, StatusTone> = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const TASK_STATUS_TONE: Record<OnboardingTaskStatus, StatusTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  WAITING_ON_EMPLOYEE: "warning",
  WAITING_ON_COMPANY: "warning",
  COMPLETED: "success",
  SKIPPED: "neutral",
  FAILED: "danger",
};

const TERMINAL_TASK_STATUSES: OnboardingTaskStatus[] = ["COMPLETED", "SKIPPED", "FAILED"];
const UNASSIGNED = "__unassigned__";

type EmployeeOption = ResourceRecord & {
  id: string;
  displayName?: string;
  employeeNumber?: string;
};

function employeeLabel(id: string, employees: EmployeeOption[]): string {
  const e = employees.find((x) => x.id === id);
  if (!e) return id;
  return e.displayName ? `${e.displayName}${e.employeeNumber ? ` (${e.employeeNumber})` : ""}` : id;
}

function OnboardingPlanDetailPage() {
  const { id } = Route.useParams();
  const { apiOptions } = useTenant();
  const { has } = usePermissions();
  const canWrite = has("ONBOARDING_WRITE");

  const [plan, setPlan] = useState<OnboardingPlanDto | null>(null);
  const [tasks, setTasks] = useState<OnboardingTaskInstanceDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [templates, setTemplates] = useState<OnboardingTaskTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [taskStatusFilter, setTaskStatusFilter] = useState<OnboardingTaskStatus | "ALL">("ALL");
  const [taskSearch, setTaskSearch] = useState("");

  const [lifecycleAction, setLifecycleAction] = useState<"start" | "complete" | "cancel" | null>(
    null,
  );
  const [cancelReason, setCancelReason] = useState("");

  const [rolesOpen, setRolesOpen] = useState(false);
  const [rolesForm, setRolesForm] = useState({ managerEmployeeId: "", buddyEmployeeId: "" });

  const [addTaskOpen, setAddTaskOpen] = useState(false);
  const [taskForm, setTaskForm] = useState({
    templateId: "",
    name: "",
    taskType: "OTHER" as OnboardingTaskType,
    owner: "HR" as OnboardingTaskOwner,
    assignedEmployeeId: "",
    mandatory: true,
    dueDate: "",
    notes: "",
  });

  const [selectedTask, setSelectedTask] = useState<OnboardingTaskInstanceDto | null>(null);
  const [reassignTo, setReassignTo] = useState(UNASSIGNED);

  const load = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [p, t] = await Promise.all([
        onboardingPlanApi.getById(id),
        onboardingPlanApi.listTasks(id),
      ]);
      setPlan(p);
      setTasks(t);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setNotFound(true);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to load onboarding plan.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    resourceApi<EmployeeOption>("/employees", apiOptions)
      .list()
      .then((r) => setEmployees(r.items))
      .catch(() => setEmployees([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!plan) return;
    onboardingTaskTemplateApi
      .listForCompany(plan.companyId)
      .then(setTemplates)
      .catch(() => setTemplates([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.companyId]);

  const refresh = async () => {
    try {
      const [p, t] = await Promise.all([
        onboardingPlanApi.getById(id),
        onboardingPlanApi.listTasks(id),
      ]);
      setPlan(p);
      setTasks(t);
    } catch {
      // ignore transient refresh failures — next manual reload will surface them
    }
  };

  const runLifecycleAction = async () => {
    if (!plan || !lifecycleAction) return;
    setBusy(true);
    try {
      if (lifecycleAction === "start") {
        await onboardingPlanApi.start(plan.id);
        toast.success("Plan started");
      } else if (lifecycleAction === "complete") {
        await onboardingPlanApi.complete(plan.id);
        toast.success("Plan completed");
      } else {
        await onboardingPlanApi.cancel(plan.id, cancelReason.trim() || undefined);
        toast.success("Plan cancelled");
      }
      setLifecycleAction(null);
      setCancelReason("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const openRoles = () => {
    if (!plan) return;
    setRolesForm({
      managerEmployeeId: plan.managerEmployeeId ?? "",
      buddyEmployeeId: plan.buddyEmployeeId ?? "",
    });
    setRolesOpen(true);
  };

  const submitRoles = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      await onboardingPlanApi.assignRoles(plan.id, {
        managerEmployeeId: rolesForm.managerEmployeeId || undefined,
        buddyEmployeeId: rolesForm.buddyEmployeeId || undefined,
      });
      toast.success("Roles updated");
      setRolesOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update roles.");
    } finally {
      setBusy(false);
    }
  };

  const openAddTask = () => {
    setTaskForm({
      templateId: "",
      name: "",
      taskType: "OTHER",
      owner: "HR",
      assignedEmployeeId: "",
      mandatory: true,
      dueDate: "",
      notes: "",
    });
    setAddTaskOpen(true);
  };

  const submitAddTask = async () => {
    if (!plan) return;
    if (!taskForm.name.trim()) {
      toast.error("Task name is required");
      return;
    }
    setBusy(true);
    try {
      await onboardingPlanApi.addTask(plan.id, {
        templateId: taskForm.templateId || undefined,
        name: taskForm.name.trim(),
        taskType: taskForm.taskType,
        owner: taskForm.owner,
        assignedEmployeeId: taskForm.assignedEmployeeId || undefined,
        mandatory: taskForm.mandatory,
        dueDate: taskForm.dueDate || undefined,
        notes: taskForm.notes.trim() || undefined,
      });
      toast.success("Task added");
      setAddTaskOpen(false);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add task.");
    } finally {
      setBusy(false);
    }
  };

  const openTaskDetail = (t: OnboardingTaskInstanceDto) => {
    setSelectedTask(t);
    setReassignTo(t.assignedEmployeeId ?? UNASSIGNED);
  };

  const updateTaskStatus = async (taskId: string, status: OnboardingTaskStatus) => {
    setBusy(true);
    try {
      await onboardingPlanApi.updateTaskStatus(taskId, { status });
      toast.success("Task status updated");
      await refresh();
      setSelectedTask((cur) => (cur && cur.id === taskId ? { ...cur, status } : cur));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update task.");
    } finally {
      setBusy(false);
    }
  };

  const remindTask = async (taskId: string) => {
    setBusy(true);
    try {
      await onboardingPlanApi.remindTask(taskId);
      toast.success("Reminder sent");
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to send reminder.");
    } finally {
      setBusy(false);
    }
  };

  const submitReassign = async () => {
    if (!selectedTask) return;
    setBusy(true);
    try {
      const updated = await onboardingPlanApi.reassignTask(
        selectedTask.id,
        reassignTo === UNASSIGNED ? undefined : reassignTo,
      );
      toast.success("Task reassigned");
      setSelectedTask(updated);
      await refresh();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to reassign task.");
    } finally {
      setBusy(false);
    }
  };

  const filteredTasks = useMemo(() => {
    const q = taskSearch.trim().toLowerCase();
    return [...tasks]
      .filter((t) => taskStatusFilter === "ALL" || t.status === taskStatusFilter)
      .filter((t) => !q || t.name.toLowerCase().includes(q))
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }, [tasks, taskStatusFilter, taskSearch]);

  const documentTasks = useMemo(
    () => tasks.filter((t) => t.taskType === "DOCUMENT_UPLOAD"),
    [tasks],
  );

  // Progress Timeline — a real, live-data-derived sequence (plan started →
  // each task's completion, chronologically → plan completed), not a mocked
  // stepper. There is no separate onboarding audit/event-history API, so this
  // is built entirely from the plan/task timestamps already on the wire.
  const timelineEntries = useMemo(() => {
    if (!plan) return [];
    const entries: Array<{ id: string; label: string; at: string; done: boolean }> = [];
    entries.push({ id: "planned", label: "Plan created", at: "", done: true });
    if (plan.startedAt) {
      entries.push({ id: "started", label: "Onboarding started", at: plan.startedAt, done: true });
    }
    [...tasks]
      .filter((t) => t.completedAt)
      .sort((a, b) => (a.completedAt! < b.completedAt! ? -1 : 1))
      .forEach((t) => {
        entries.push({
          id: `task-${t.id}`,
          label: `${t.name} — ${t.status.replace(/_/g, " ").toLowerCase()}`,
          at: t.completedAt!,
          done: true,
        });
      });
    if (plan.completedAt) {
      entries.push({
        id: "completed",
        label: "Onboarding completed",
        at: plan.completedAt,
        done: true,
      });
    }
    return entries;
  }, [plan, tasks]);

  if (loading) {
    return (
      <div className="grid place-items-center p-16 text-sm text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (notFound || !plan) {
    return (
      <div className="space-y-6">
        <Link
          to="/onboarding-plans"
          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to plans
        </Link>
        <EmptyState
          title="Plan not found"
          description="This onboarding plan doesn't exist or you don't have access to it."
        />
      </div>
    );
  }

  const terminal = plan.status === "COMPLETED" || plan.status === "CANCELLED";

  return (
    <div className="space-y-6">
      <Link
        to="/onboarding-plans"
        className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to plans
      </Link>

      <PageHeader
        eyebrow="Onboarding Plan"
        title={employeeLabel(plan.employeeId, employees)}
        description={plan.joiningDate ? `Joining ${plan.joiningDate}` : undefined}
      />

      {canWrite && (
        <div className="flex flex-wrap gap-2">
          {plan.status === "PLANNED" && (
            <Button size="sm" variant="outline" onClick={() => setLifecycleAction("start")}>
              Start
            </Button>
          )}
          {plan.status === "IN_PROGRESS" && (
            <Button size="sm" variant="outline" onClick={() => setLifecycleAction("complete")}>
              Complete
            </Button>
          )}
          {!terminal && (
            <Button size="sm" variant="outline" onClick={openRoles}>
              <UserCog className="h-4 w-4" />
              Assign roles
            </Button>
          )}
          {!terminal && (
            <Button size="sm" variant="destructive" onClick={() => setLifecycleAction("cancel")}>
              Cancel plan
            </Button>
          )}
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Overview</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <StatusChip tone={PLAN_STATUS_TONE[plan.status]}>
                {plan.status.replace(/_/g, " ")}
              </StatusChip>
              <div className="flex flex-1 items-center gap-2">
                <Progress value={plan.completionPercent} className="h-2" />
                <span className="text-xs tabular-nums text-muted-foreground">
                  {plan.completionPercent}%
                </span>
              </div>
            </div>
            <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Manager</dt>
                <dd className="mt-0.5 font-mono text-xs">
                  {plan.managerEmployeeId ? employeeLabel(plan.managerEmployeeId, employees) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Buddy</dt>
                <dd className="mt-0.5 font-mono text-xs">
                  {plan.buddyEmployeeId ? employeeLabel(plan.buddyEmployeeId, employees) : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Started</dt>
                <dd className="mt-0.5 text-xs">
                  {plan.startedAt?.slice(0, 16).replace("T", " ") ?? "—"}
                </dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-muted-foreground">Completed</dt>
                <dd className="mt-0.5 text-xs">
                  {plan.completedAt?.slice(0, 16).replace("T", " ") ?? "—"}
                </dd>
              </div>
            </dl>
            {plan.notes && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Notes</div>
                <p className="mt-0.5 text-sm">{plan.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Progress timeline</CardTitle>
          </CardHeader>
          <CardContent>
            {timelineEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">No progress recorded yet.</p>
            ) : (
              <ol className="space-y-4">
                {timelineEntries.map((e, i) => (
                  <li key={e.id} className="relative flex gap-3 pl-1">
                    <div className="flex flex-col items-center">
                      <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                      {i < timelineEntries.length - 1 && (
                        <div className="mt-1 h-full w-px flex-1 bg-border" />
                      )}
                    </div>
                    <div className="min-w-0 pb-1">
                      <div className="text-sm font-medium text-foreground">{e.label}</div>
                      {e.at && (
                        <div className="text-xs text-muted-foreground">
                          {e.at.slice(0, 16).replace("T", " ")}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Document checklist</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {documentTasks.length === 0 ? (
            <div className="p-5 text-sm text-muted-foreground">
              No document-upload tasks on this plan.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {documentTasks.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center justify-between gap-2 px-5 py-3 text-sm"
                >
                  <div className="flex items-center gap-2">
                    {t.status === "COMPLETED" ? (
                      <FileCheck2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span
                      className={
                        t.status === "COMPLETED" ? "line-through text-muted-foreground" : ""
                      }
                    >
                      {t.name}
                    </span>
                    {t.mandatory && <span className="text-destructive">*</span>}
                  </div>
                  <StatusChip tone={TASK_STATUS_TONE[t.status]}>
                    {t.status.replace(/_/g, " ")}
                  </StatusChip>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-sm font-semibold">Tasks</CardTitle>
          {canWrite && !terminal && (
            <Button size="sm" variant="outline" onClick={openAddTask}>
              <Plus className="h-4 w-4" />
              Add task
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <Toolbar
            search={taskSearch}
            onSearchChange={setTaskSearch}
            searchPlaceholder="Search tasks…"
            filters={
              <Select
                value={taskStatusFilter}
                onValueChange={(v) => setTaskStatusFilter(v as OnboardingTaskStatus | "ALL")}
              >
                <SelectTrigger className="h-9 w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All statuses</SelectItem>
                  {ONBOARDING_TASK_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            }
          />
          {filteredTasks.length === 0 ? (
            <EmptyState
              title="No matching tasks"
              description="Try a different search or status filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Assignee</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((t) => (
                    <TableRow
                      key={t.id}
                      className="cursor-pointer"
                      onClick={() => openTaskDetail(t)}
                    >
                      <TableCell className="text-sm">
                        <div className="font-medium">
                          {t.name}
                          {t.mandatory && <span className="ml-1 text-destructive">*</span>}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.taskType.replace(/_/g, " ")}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{t.owner}</TableCell>
                      <TableCell className="max-w-[10rem] truncate text-xs text-muted-foreground">
                        {t.assignedEmployeeId
                          ? employeeLabel(t.assignedEmployeeId, employees)
                          : "Unassigned"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {t.dueDate ?? "—"}
                      </TableCell>
                      <TableCell>
                        <StatusChip tone={TASK_STATUS_TONE[t.status]}>
                          {t.status.replace(/_/g, " ")}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {canWrite && !TERMINAL_TASK_STATUSES.includes(t.status) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => void remindTask(t.id)}
                            aria-label={`Send reminder for ${t.name}`}
                            disabled={busy}
                          >
                            <Bell className="h-4 w-4" />
                          </Button>
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

      {/* Lifecycle action confirm dialog */}
      <Dialog open={lifecycleAction !== null} onOpenChange={(o) => !o && setLifecycleAction(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {lifecycleAction === "start" && "Start onboarding"}
              {lifecycleAction === "complete" && "Complete onboarding"}
              {lifecycleAction === "cancel" && "Cancel plan"}
            </DialogTitle>
            {lifecycleAction === "complete" && (
              <DialogDescription>
                All mandatory tasks must be terminal (completed/skipped/failed) before a plan can be
                completed.
              </DialogDescription>
            )}
          </DialogHeader>
          {lifecycleAction === "cancel" && (
            <div className="space-y-1.5">
              <Label htmlFor="f-cancel-reason">Reason</Label>
              <Textarea
                id="f-cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setLifecycleAction(null)} disabled={busy}>
              Back
            </Button>
            <Button
              variant={lifecycleAction === "cancel" ? "destructive" : "default"}
              onClick={() => void runLifecycleAction()}
              disabled={busy}
            >
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign roles dialog */}
      <Dialog open={rolesOpen} onOpenChange={setRolesOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Assign manager &amp; buddy</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-manager">Manager</Label>
              <Select
                value={rolesForm.managerEmployeeId || UNASSIGNED}
                onValueChange={(v) =>
                  setRolesForm({ ...rolesForm, managerEmployeeId: v === UNASSIGNED ? "" : v })
                }
              >
                <SelectTrigger id="f-manager">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.displayName ?? e.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-buddy">Buddy</Label>
              <Select
                value={rolesForm.buddyEmployeeId || UNASSIGNED}
                onValueChange={(v) =>
                  setRolesForm({ ...rolesForm, buddyEmployeeId: v === UNASSIGNED ? "" : v })
                }
              >
                <SelectTrigger id="f-buddy">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.displayName ?? e.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRolesOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitRoles()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add task dialog */}
      <Dialog open={addTaskOpen} onOpenChange={setAddTaskOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add task</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            {templates.length > 0 && (
              <div className="space-y-1.5">
                <Label htmlFor="f-template">From template</Label>
                <Select
                  value={taskForm.templateId || "__none__"}
                  onValueChange={(v) => {
                    const tpl = templates.find((t) => t.id === v);
                    setTaskForm({
                      ...taskForm,
                      templateId: v === "__none__" ? "" : v,
                      name: tpl?.name ?? taskForm.name,
                      taskType: tpl?.taskType ?? taskForm.taskType,
                      owner: tpl?.defaultOwner ?? taskForm.owner,
                      mandatory: tpl?.mandatory ?? taskForm.mandatory,
                    });
                  }}
                >
                  <SelectTrigger id="f-template">
                    <SelectValue placeholder="None (ad-hoc task)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None (ad-hoc task)</SelectItem>
                    {templates.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="f-task-name">
                Name<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-task-name"
                value={taskForm.name}
                onChange={(e) => setTaskForm({ ...taskForm, name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-task-type">Type</Label>
              <Select
                value={taskForm.taskType}
                onValueChange={(v) =>
                  setTaskForm({ ...taskForm, taskType: v as OnboardingTaskType })
                }
              >
                <SelectTrigger id="f-task-type">
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
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-task-owner">Owner</Label>
                <Select
                  value={taskForm.owner}
                  onValueChange={(v) =>
                    setTaskForm({ ...taskForm, owner: v as OnboardingTaskOwner })
                  }
                >
                  <SelectTrigger id="f-task-owner">
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
                <Label htmlFor="f-task-due">Due date</Label>
                <Input
                  id="f-task-due"
                  type="date"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-task-assignee">Assignee</Label>
              <Select
                value={taskForm.assignedEmployeeId || UNASSIGNED}
                onValueChange={(v) =>
                  setTaskForm({ ...taskForm, assignedEmployeeId: v === UNASSIGNED ? "" : v })
                }
              >
                <SelectTrigger id="f-task-assignee">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.displayName ?? e.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="f-task-mandatory"
                checked={taskForm.mandatory}
                onCheckedChange={(c) => setTaskForm({ ...taskForm, mandatory: c === true })}
              />
              <Label htmlFor="f-task-mandatory">Mandatory</Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-task-notes">Notes</Label>
              <Textarea
                id="f-task-notes"
                value={taskForm.notes}
                onChange={(e) => setTaskForm({ ...taskForm, notes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddTaskOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submitAddTask()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add task
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task detail dialog — details + status + reassignment */}
      <Dialog open={selectedTask !== null} onOpenChange={(o) => !o && setSelectedTask(null)}>
        <DialogContent className="sm:max-w-md">
          {selectedTask && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTask.name}</DialogTitle>
                <DialogDescription>
                  {selectedTask.taskType.replace(/_/g, " ")} · Owner {selectedTask.owner}
                  {selectedTask.mandatory ? " · Mandatory" : ""}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="f-task-status">Status</Label>
                  {canWrite ? (
                    <Select
                      value={selectedTask.status}
                      onValueChange={(v) =>
                        void updateTaskStatus(selectedTask.id, v as OnboardingTaskStatus)
                      }
                      disabled={busy}
                    >
                      <SelectTrigger id="f-task-status">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {ONBOARDING_TASK_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s.replace(/_/g, " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusChip tone={TASK_STATUS_TONE[selectedTask.status]}>
                      {selectedTask.status.replace(/_/g, " ")}
                    </StatusChip>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="f-task-reassign">Assignee</Label>
                  <div className="flex gap-2">
                    <Select
                      value={reassignTo}
                      onValueChange={setReassignTo}
                      disabled={
                        !canWrite || busy || TERMINAL_TASK_STATUSES.includes(selectedTask.status)
                      }
                    >
                      <SelectTrigger id="f-task-reassign" className="flex-1">
                        <SelectValue placeholder="Unassigned" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.displayName ?? e.id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {canWrite && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void submitReassign()}
                        disabled={
                          busy ||
                          TERMINAL_TASK_STATUSES.includes(selectedTask.status) ||
                          reassignTo === (selectedTask.assignedEmployeeId ?? UNASSIGNED)
                        }
                      >
                        {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                        Save
                      </Button>
                    )}
                  </div>
                  {TERMINAL_TASK_STATUSES.includes(selectedTask.status) && (
                    <p className="text-xs text-muted-foreground">
                      This task is already terminal and can no longer be reassigned.
                    </p>
                  )}
                </div>

                <dl className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Due date</dt>
                    <dd className="mt-0.5">{selectedTask.dueDate ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Started</dt>
                    <dd className="mt-0.5">
                      {selectedTask.startedAt?.slice(0, 16).replace("T", " ") ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">Completed</dt>
                    <dd className="mt-0.5">
                      {selectedTask.completedAt?.slice(0, 16).replace("T", " ") ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-wide text-muted-foreground">External ref</dt>
                    <dd className="mt-0.5 truncate">{selectedTask.externalRef ?? "—"}</dd>
                  </div>
                </dl>
                {selectedTask.notes && (
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">
                      Notes
                    </div>
                    <p className="mt-0.5 text-sm">{selectedTask.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                {canWrite && !TERMINAL_TASK_STATUSES.includes(selectedTask.status) && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void remindTask(selectedTask.id)}
                    disabled={busy}
                  >
                    <Bell className="h-4 w-4" />
                    Send reminder
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
