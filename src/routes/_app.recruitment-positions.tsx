import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Briefcase, Loader2, Pencil, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RequirePermission, usePermissions } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  EMPLOYMENT_TYPES,
  jobPositionApi,
  type JobPositionDto,
  type JobPositionPayload,
  type RecruitmentEmploymentType,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-positions")({
  head: () => ({
    meta: [{ title: "Positions — EWOS Recruitment" }, { name: "robots", content: "noindex" }],
  }),
  component: PositionsPage,
});

type FormState = {
  id?: string;
  code: string;
  title: string;
  description: string;
  departmentOrgUnitId: string;
  location: string;
  employmentType: RecruitmentEmploymentType;
  grade: string;
  salaryCurrency: string;
  salaryMin: string;
  salaryMax: string;
  active: boolean;
};

const emptyForm: FormState = {
  code: "",
  title: "",
  description: "",
  departmentOrgUnitId: "",
  location: "",
  employmentType: "FULL_TIME",
  grade: "",
  salaryCurrency: "INR",
  salaryMin: "",
  salaryMax: "",
  active: true,
};

function PositionsPage() {
  const { activeCompanyId, tenantId } = useTenant();
  const { has } = usePermissions();
  const [rows, setRows] = useState<JobPositionDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<JobPositionDto | null>(null);
  const [removing, setRemoving] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await jobPositionApi.listForCompany(activeCompanyId);
      setRows(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load positions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const filtered = useMemo(
    () =>
      query
        ? rows.filter((r) =>
            `${r.code} ${r.title} ${r.location ?? ""} ${r.grade ?? ""}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
        : rows,
    [rows, query],
  );

  const openCreate = () => {
    setCreating(true);
    setForm({ ...emptyForm });
  };

  const openEdit = (row: JobPositionDto) => {
    setCreating(false);
    setForm({
      id: row.id,
      code: row.code,
      title: row.title,
      description: row.description ?? "",
      departmentOrgUnitId: row.departmentOrgUnitId ?? "",
      location: row.location ?? "",
      employmentType: row.employmentType,
      grade: row.grade ?? "",
      salaryCurrency: row.salaryCurrency ?? "INR",
      salaryMin: row.salaryMin !== undefined ? String(row.salaryMin) : "",
      salaryMax: row.salaryMax !== undefined ? String(row.salaryMax) : "",
      active: row.active,
    });
  };

  const submit = async () => {
    if (!form) return;
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (creating && !form.code.trim()) {
      toast.error("Code is required");
      return;
    }
    const payload: JobPositionPayload = {
      tenantId,
      companyId: activeCompanyId,
      code: creating ? form.code.trim() : undefined,
      title: form.title.trim(),
      description: form.description.trim() || undefined,
      departmentOrgUnitId: form.departmentOrgUnitId.trim() || undefined,
      location: form.location.trim() || undefined,
      employmentType: form.employmentType,
      grade: form.grade.trim() || undefined,
      salaryCurrency: form.salaryCurrency.trim() || undefined,
      salaryMin: form.salaryMin ? Number(form.salaryMin) : undefined,
      salaryMax: form.salaryMax ? Number(form.salaryMax) : undefined,
      active: form.active,
    };
    setSaving(true);
    try {
      if (creating) {
        await jobPositionApi.create(payload);
        toast.success("Position created");
      } else if (form.id) {
        await jobPositionApi.update(form.id, payload);
        toast.success("Position updated");
      }
      setForm(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setRemoving(true);
    try {
      await jobPositionApi.remove(deleting.id);
      toast.success("Position deleted");
      setDeleting(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setRemoving(false);
    }
  };

  const canWrite = has("RECRUITMENT_WRITE");
  const canDelete = has("RECRUITMENT_ADMIN");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Positions"
        description="Long-lived job seats used to open requisitions against."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <RequirePermission code="RECRUITMENT_WRITE">
              <Button size="sm" onClick={openCreate} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                New Position
              </Button>
            </RequirePermission>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search positions…"
              className="pl-8"
              disabled={loading}
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {loading ? "…" : `${filtered.length} of ${rows.length}`}
          </div>
        </div>

        {!activeCompanyId ? (
          <EmptyState
            icon={Briefcase}
            title="Select a company"
            description="Choose a company from the switcher above to view its positions."
          />
        ) : loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => void load()}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={rows.length === 0 ? "No positions yet" : "No matches"}
            description={
              rows.length === 0
                ? "Create your first job position to get started."
                : "Try a different search term."
            }
            action={
              rows.length === 0 && canWrite ? (
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4" />
                  New Position
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
                  <TableHead>Title</TableHead>
                  <TableHead>Employment type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Grade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-mono text-xs">{row.code}</TableCell>
                    <TableCell className="text-sm font-medium">{row.title}</TableCell>
                    <TableCell className="text-sm">
                      {row.employmentType.replace(/_/g, " ")}
                    </TableCell>
                    <TableCell className="text-sm">{row.location ?? "—"}</TableCell>
                    <TableCell className="text-sm">{row.grade ?? "—"}</TableCell>
                    <TableCell>
                      <StatusChip tone={row.active ? "success" : "neutral"}>
                        {row.active ? "Active" : "Inactive"}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-right">
                      {canWrite && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(row)}
                          aria-label="Edit position"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleting(row)}
                          aria-label="Delete position"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? "New Position" : "Edit Position"}</DialogTitle>
            <DialogDescription>
              {creating ? "Define a new job position." : "Update this job position."}
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {creating && (
                <div className="space-y-1.5">
                  <Label htmlFor="pos-code">
                    Code<span className="ml-0.5 text-destructive">*</span>
                  </Label>
                  <Input
                    id="pos-code"
                    value={form.code}
                    onChange={(e) => setForm({ ...form, code: e.target.value })}
                  />
                </div>
              )}
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pos-title">
                  Title<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  id="pos-title"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="pos-desc">Description</Label>
                <Textarea
                  id="pos-desc"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
                <Label htmlFor="pos-location">Location</Label>
                <Input
                  id="pos-location"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-dept">Department (org unit ID)</Label>
                <Input
                  id="pos-dept"
                  value={form.departmentOrgUnitId}
                  onChange={(e) => setForm({ ...form, departmentOrgUnitId: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-grade">Grade</Label>
                <Input
                  id="pos-grade"
                  value={form.grade}
                  onChange={(e) => setForm({ ...form, grade: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-currency">Salary currency</Label>
                <Input
                  id="pos-currency"
                  value={form.salaryCurrency}
                  onChange={(e) => setForm({ ...form, salaryCurrency: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-min">Salary min</Label>
                <Input
                  id="pos-min"
                  type="number"
                  value={form.salaryMin}
                  onChange={(e) => setForm({ ...form, salaryMin: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="pos-max">Salary max</Label>
                <Input
                  id="pos-max"
                  type="number"
                  value={form.salaryMax}
                  onChange={(e) => setForm({ ...form, salaryMax: e.target.value })}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border border-border p-3 sm:col-span-2">
                <Label htmlFor="pos-active">Active</Label>
                <Switch
                  id="pos-active"
                  checked={form.active}
                  onCheckedChange={(c) => setForm({ ...form, active: c })}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete position?</AlertDialogTitle>
            <AlertDialogDescription>
              This will soft-delete "{deleting?.title}". This action cannot be undone from here.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={removing}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removing && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
