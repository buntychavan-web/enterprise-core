import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RequirePermission, usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  EMPLOYMENT_TYPES,
  jobPositionApi,
  jobRequisitionApi,
  REQUISITION_PRIORITIES,
  REQUISITION_STATUSES,
  workflowDefinitionApi,
  type CreateJobRequisitionPayload,
  type JobPositionDto,
  type JobRequisitionDto,
  type RecruitmentEmploymentType,
  type RequisitionPriority,
  type RequisitionStatus,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-requisitions")({
  head: () => ({
    meta: [
      { title: "Job Requisitions — EWOS Recruitment" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequisitionsPage,
});

const STATUS_TONE: Record<RequisitionStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "info",
  APPROVED: "info",
  REJECTED: "danger",
  OPEN: "success",
  ON_HOLD: "warning",
  FILLED: "success",
  CLOSED: "neutral",
  CANCELLED: "danger",
};

type LifecycleAction =
  | "submit"
  | "approve"
  | "reject"
  | "open"
  | "hold"
  | "resume"
  | "fill"
  | "close"
  | "cancel";

const ACTION_LABEL: Record<LifecycleAction, string> = {
  submit: "Submit for approval",
  approve: "Approve",
  reject: "Reject",
  open: "Open requisition",
  hold: "Put on hold",
  resume: "Resume",
  fill: "Record a fill",
  close: "Close requisition",
  cancel: "Cancel requisition",
};

const NOTE_REQUIRED: Partial<Record<LifecycleAction, boolean>> = {
  close: true,
  cancel: true,
};

function availableActions(status: RequisitionStatus): LifecycleAction[] {
  switch (status) {
    case "DRAFT":
      return ["submit", "cancel"];
    case "PENDING_APPROVAL":
      return ["approve", "reject", "cancel"];
    case "APPROVED":
      return ["open", "cancel"];
    case "OPEN":
      return ["hold", "fill", "close", "cancel"];
    case "ON_HOLD":
      return ["resume", "close", "cancel"];
    case "FILLED":
      return ["close"];
    default:
      return [];
  }
}

type FormState = {
  requisitionNumber: string;
  jobPositionId: string;
  title: string;
  departmentOrgUnitId: string;
  location: string;
  employmentType: RecruitmentEmploymentType;
  headcount: string;
  priority: RequisitionPriority;
  justification: string;
  hiringManagerId: string;
  recruiterId: string;
  targetStartDate: string;
  budgetCurrency: string;
  budgetAmount: string;
};

const emptyForm: FormState = {
  requisitionNumber: "",
  jobPositionId: "",
  title: "",
  departmentOrgUnitId: "",
  location: "",
  employmentType: "FULL_TIME",
  headcount: "1",
  priority: "MEDIUM",
  justification: "",
  hiringManagerId: "",
  recruiterId: "",
  targetStartDate: "",
  budgetCurrency: "INR",
  budgetAmount: "",
};

function RequisitionsPage() {
  const { activeCompanyId, tenantId } = useTenant();
  const { has } = usePermissions();
  const [status, setStatus] = useState<RequisitionStatus>("OPEN");
  const [rows, setRows] = useState<JobRequisitionDto[]>([]);
  const [positions, setPositions] = useState<JobPositionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<{ row: JobRequisitionDto; type: LifecycleAction } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [acting, setActing] = useState(false);
  const [definitionId, setDefinitionId] = useState<string | null>(null);

  const load = async (s: RequisitionStatus) => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await jobRequisitionApi.byStatus(activeCompanyId, s);
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load requisitions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(status);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, status]);

  useEffect(() => {
    if (!activeCompanyId) return;
    jobPositionApi
      .listForCompany(activeCompanyId)
      .then(setPositions)
      .catch(() => setPositions([]));
  }, [activeCompanyId]);

  useEffect(() => {
    workflowDefinitionApi
      .list()
      .then((defs) => {
        const def = defs.find((d) => d.code === "RECRUITMENT_REQUISITION_APPROVAL" && d.active);
        setDefinitionId(def?.id ?? null);
      })
      .catch(() => setDefinitionId(null));
  }, []);

  const positionsById = useMemo(() => new Map(positions.map((p) => [p.id, p])), [positions]);

  const openCreate = () => {
    setForm({ ...emptyForm });
  };

  const onPickPosition = (id: string) => {
    const pos = positionsById.get(id);
    setForm((f) =>
      f
        ? {
            ...f,
            jobPositionId: id,
            title: f.title || pos?.title || "",
            departmentOrgUnitId: f.departmentOrgUnitId || pos?.departmentOrgUnitId || "",
            location: f.location || pos?.location || "",
            employmentType: pos?.employmentType ?? f.employmentType,
          }
        : f,
    );
  };

  const submitCreate = async () => {
    if (!form) return;
    if (!form.requisitionNumber.trim() || !form.jobPositionId || !form.title.trim()) {
      toast.error("Requisition number, position, and title are required");
      return;
    }
    if (!activeCompanyId || !tenantId) {
      toast.error("Select a company first");
      return;
    }
    const payload: CreateJobRequisitionPayload = {
      tenantId,
      companyId: activeCompanyId,
      requisitionNumber: form.requisitionNumber.trim(),
      jobPositionId: form.jobPositionId,
      title: form.title.trim(),
      departmentOrgUnitId: form.departmentOrgUnitId.trim() || undefined,
      location: form.location.trim() || undefined,
      employmentType: form.employmentType,
      headcount: Number(form.headcount) || 1,
      priority: form.priority,
      justification: form.justification.trim() || undefined,
      hiringManagerId: form.hiringManagerId.trim() || undefined,
      recruiterId: form.recruiterId.trim() || undefined,
      targetStartDate: form.targetStartDate || undefined,
      budgetCurrency: form.budgetCurrency.trim() || undefined,
      budgetAmount: form.budgetAmount ? Number(form.budgetAmount) : undefined,
    };
    setSaving(true);
    try {
      await jobRequisitionApi.create(payload);
      toast.success("Requisition created as draft");
      setForm(null);
      setStatus("DRAFT");
      await load("DRAFT");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!action) return;
    const { row, type } = action;
    if (NOTE_REQUIRED[type] && !note.trim()) {
      toast.error("A reason is required");
      return;
    }
    setActing(true);
    try {
      switch (type) {
        case "submit":
          if (!definitionId) {
            toast.error("No active RECRUITMENT_REQUISITION_APPROVAL workflow definition found.");
            setActing(false);
            return;
          }
          await jobRequisitionApi.submit(row.id, definitionId);
          break;
        case "approve":
          await jobRequisitionApi.approve(row.id, note.trim() || undefined);
          break;
        case "reject":
          await jobRequisitionApi.reject(row.id, note.trim() || undefined);
          break;
        case "open":
          await jobRequisitionApi.open(row.id);
          break;
        case "hold":
          await jobRequisitionApi.hold(row.id);
          break;
        case "resume":
          await jobRequisitionApi.resume(row.id);
          break;
        case "fill":
          await jobRequisitionApi.recordFill(row.id, 1);
          break;
        case "close":
          await jobRequisitionApi.close(row.id, note.trim());
          break;
        case "cancel":
          await jobRequisitionApi.cancel(row.id, note.trim());
          break;
      }
      toast.success(`${ACTION_LABEL[type]} succeeded`);
      setAction(null);
      setNote("");
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  const canWrite = has("RECRUITMENT_WRITE");
  const canApprove = has("RECRUITMENT_APPROVE");

  const actionAllowed = (type: LifecycleAction) =>
    type === "approve" || type === "reject" ? canApprove : canWrite;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Job Requisitions"
        description="Request, approve, and manage open headcount against a position."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as RequisitionStatus)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REQUISITION_STATUSES.map((s) => (
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
            <RequirePermission code="RECRUITMENT_WRITE">
              <Button size="sm" onClick={openCreate} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                New Requisition
              </Button>
            </RequirePermission>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {!activeCompanyId ? (
          <EmptyState
            icon={FileText}
            title="Select a company"
            description="Choose a company from the switcher above to view requisitions."
          />
        ) : loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void load(status)}>
              Try again
            </Button>
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={`No ${status.replace(/_/g, " ").toLowerCase()} requisitions`}
            description="Try a different status filter, or create a new requisition."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Filled</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const actions = availableActions(r.status);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.requisitionNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{r.title}</TableCell>
                      <TableCell className="text-sm">{r.priority}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.headcount}</TableCell>
                      <TableCell className="text-right tabular-nums">{r.filledCount}</TableCell>
                      <TableCell>
                        <StatusChip tone={STATUS_TONE[r.status]}>
                          {r.status.replace(/_/g, " ")}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-right">
                        {actions.length > 0 && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Requisition actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {actions
                                .filter((a) => actionAllowed(a))
                                .map((a) => (
                                  <DropdownMenuItem
                                    key={a}
                                    onClick={() => {
                                      setAction({ row: r, type: a });
                                      setNote("");
                                    }}
                                  >
                                    {a === "approve" && <CheckCircle2 className="h-4 w-4" />}
                                    {a === "reject" && <XCircle className="h-4 w-4" />}
                                    {ACTION_LABEL[a]}
                                  </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Requisition</DialogTitle>
            <DialogDescription>Request headcount against an existing position.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  Requisition number<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  value={form.requisitionNumber}
                  onChange={(e) => setForm({ ...form, requisitionNumber: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Position<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Select value={form.jobPositionId} onValueChange={onPickPosition}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select position" />
                  </SelectTrigger>
                  <SelectContent>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code} — {p.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  Title<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Employment type</Label>
                <Select
                  value={form.employmentType}
                  onValueChange={(v) =>
                    setForm({ ...form, employmentType: v as RecruitmentEmploymentType })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYMENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v as RequisitionPriority })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REQUISITION_PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Headcount</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.headcount}
                  onChange={(e) => setForm({ ...form, headcount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Location</Label>
                <Input
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Department (org unit ID)</Label>
                <Input
                  value={form.departmentOrgUnitId}
                  onChange={(e) => setForm({ ...form, departmentOrgUnitId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Hiring manager (employee ID)</Label>
                <Input
                  value={form.hiringManagerId}
                  onChange={(e) => setForm({ ...form, hiringManagerId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Recruiter (employee ID)</Label>
                <Input
                  value={form.recruiterId}
                  onChange={(e) => setForm({ ...form, recruiterId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Target start date</Label>
                <Input
                  type="date"
                  value={form.targetStartDate}
                  onChange={(e) => setForm({ ...form, targetStartDate: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Budget currency</Label>
                <Input
                  value={form.budgetCurrency}
                  onChange={(e) => setForm({ ...form, budgetCurrency: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Budget amount</Label>
                <Input
                  type="number"
                  value={form.budgetAmount}
                  onChange={(e) => setForm({ ...form, budgetAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Justification</Label>
                <Textarea
                  value={form.justification}
                  onChange={(e) => setForm({ ...form, justification: e.target.value })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={action !== null} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{action ? ACTION_LABEL[action.type] : ""}</DialogTitle>
            <DialogDescription>
              {action ? `Requisition ${action.row.requisitionNumber} — ${action.row.title}` : ""}
            </DialogDescription>
          </DialogHeader>
          {action &&
            (action.type === "approve" ||
              action.type === "reject" ||
              action.type === "close" ||
              action.type === "cancel") && (
              <div className="space-y-1.5">
                <Label>
                  {action.type === "close" || action.type === "cancel" ? "Reason" : "Notes"}
                  {NOTE_REQUIRED[action.type] && <span className="ml-0.5 text-destructive">*</span>}
                </Label>
                <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
              </div>
            )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setAction(null)} disabled={acting}>
              Cancel
            </Button>
            <Button onClick={() => void runAction()} disabled={acting}>
              {acting && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
