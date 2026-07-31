import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Handshake, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  EMPLOYMENT_TYPES,
  jobApplicationApi,
  OFFER_STATUSES,
  offerApi,
  offerTemplateApi,
  workflowDefinitionApi,
  type CreateOfferPayload,
  type JobApplicationDto,
  type OfferDto,
  type OfferNegotiationDto,
  type OfferStatus,
  type OfferTemplateDto,
  type RecruitmentEmploymentType,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-offers")({
  head: () => ({
    meta: [{ title: "Offers — EWOS Recruitment" }, { name: "robots", content: "noindex" }],
  }),
  component: OffersPage,
});

const STATUS_TONE: Record<OfferStatus, StatusTone> = {
  DRAFT: "neutral",
  PENDING_APPROVAL: "info",
  APPROVED: "info",
  REJECTED: "danger",
  EXTENDED: "warning",
  ACCEPTED: "success",
  DECLINED: "danger",
  REVISED: "neutral",
  EXPIRED: "danger",
  WITHDRAWN: "neutral",
};

type FormState = {
  offerNumber: string;
  applicationId: string;
  templateId: string;
  designation: string;
  departmentOrgUnitId: string;
  location: string;
  employmentType: RecruitmentEmploymentType;
  targetJoiningDate: string;
  currency: string;
  baseSalary: string;
  variablePay: string;
  oneTimeBonus: string;
  totalCtc: string;
  noticePeriodDays: string;
  probationDays: string;
};

const emptyForm: FormState = {
  offerNumber: "",
  applicationId: "",
  templateId: "",
  designation: "",
  departmentOrgUnitId: "",
  location: "",
  employmentType: "FULL_TIME",
  targetJoiningDate: "",
  currency: "INR",
  baseSalary: "",
  variablePay: "",
  oneTimeBonus: "",
  totalCtc: "",
  noticePeriodDays: "",
  probationDays: "",
};

/** Mirrors CreateOfferRequest's @Pattern on `offerNumber` in the backend. */
const OFFER_NUMBER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]*$/;
/** Mirrors the backend's @Pattern("^[A-Z]{3}$") on `currency`. */
const CURRENCY_PATTERN = /^[A-Z]{3}$/;
/** Mirrors CreateOfferTemplateRequest's @Pattern on `code` in the backend. */
const OFFER_TEMPLATE_CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;

/** Shared by both the create and revise forms — both submit a CreateOfferPayload. */
function validateOfferForm(f: FormState, requireApplication: boolean): string | null {
  if (!f.offerNumber.trim() || !f.designation.trim() || (requireApplication && !f.applicationId)) {
    return requireApplication
      ? "Offer number, application, and designation are required"
      : "Offer number and designation are required";
  }
  if (!OFFER_NUMBER_PATTERN.test(f.offerNumber.trim())) {
    return "Offer number must start with a letter or digit and contain only letters, digits, '.', '_', '/', or '-'";
  }
  if (!f.currency.trim() || !CURRENCY_PATTERN.test(f.currency.trim())) {
    return "Currency must be a 3-letter uppercase code, e.g. INR";
  }
  const baseSalary = Number(f.baseSalary);
  if (!f.baseSalary || !Number.isFinite(baseSalary) || baseSalary < 0) {
    return "Base salary is required and cannot be negative";
  }
  const totalCtc = Number(f.totalCtc);
  if (!f.totalCtc || !Number.isFinite(totalCtc) || totalCtc < 0) {
    return "Total CTC is required and cannot be negative";
  }
  if (f.noticePeriodDays && Number(f.noticePeriodDays) < 0) {
    return "Notice period cannot be negative";
  }
  if (f.probationDays && Number(f.probationDays) < 0) {
    return "Probation days cannot be negative";
  }
  return null;
}

function OffersPage() {
  const { activeCompanyId, tenantId } = useTenant();
  const { has } = usePermissions();
  const [status, setStatus] = useState<OfferStatus>("EXTENDED");
  const [rows, setRows] = useState<OfferDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<OfferTemplateDto[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [applications, setApplications] = useState<JobApplicationDto[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [definitionId, setDefinitionId] = useState<string | null>(null);

  const [selected, setSelected] = useState<OfferDto | null>(null);
  const [negotiations, setNegotiations] = useState<OfferNegotiationDto[]>([]);
  const [busy, setBusy] = useState(false);

  const [extendOpen, setExtendOpen] = useState(false);
  const [expiresAt, setExpiresAt] = useState("");
  const [declineOpen, setDeclineOpen] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [negoOpen, setNegoOpen] = useState(false);
  const [negoNotes, setNegoNotes] = useState("");
  const [reviseOpen, setReviseOpen] = useState(false);
  const [reviseForm, setReviseForm] = useState<FormState>(emptyForm);

  const canWrite = has("OFFER_WRITE");
  const canApprove = has("OFFER_APPROVE");
  const canAccept = has("OFFER_ACCEPT");

  const load = async (s: OfferStatus) => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      setRows(await offerApi.byStatus(activeCompanyId, s));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load offers.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!activeCompanyId) return;
    try {
      setTemplates(await offerTemplateApi.listForCompany(activeCompanyId));
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

  useEffect(() => {
    workflowDefinitionApi
      .list()
      .then((defs) => {
        const def = defs.find((d) => d.code === "OFFER_APPROVAL" && d.active);
        setDefinitionId(def?.id ?? null);
      })
      .catch(() => setDefinitionId(null));
  }, []);

  const openCreate = async () => {
    setForm({ ...emptyForm });
    setCreateOpen(true);
    if (!activeCompanyId) return;
    try {
      const result = await jobApplicationApi.byStatus(activeCompanyId, "OFFER_INITIATED", 0, 50);
      setApplications(result.content);
    } catch {
      toast.error("Failed to load eligible applications.");
    }
  };

  const submitCreate = async () => {
    const validationError = validateOfferForm(form, true);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    if (!tenantId || !activeCompanyId) return;
    const payload: CreateOfferPayload = {
      tenantId,
      companyId: activeCompanyId,
      offerNumber: form.offerNumber.trim(),
      applicationId: form.applicationId,
      templateId: form.templateId || undefined,
      designation: form.designation.trim(),
      departmentOrgUnitId: form.departmentOrgUnitId.trim() || undefined,
      location: form.location.trim() || undefined,
      employmentType: form.employmentType,
      targetJoiningDate: form.targetJoiningDate || undefined,
      currency: form.currency.trim(),
      baseSalary: Number(form.baseSalary),
      variablePay: form.variablePay ? Number(form.variablePay) : undefined,
      oneTimeBonus: form.oneTimeBonus ? Number(form.oneTimeBonus) : undefined,
      totalCtc: Number(form.totalCtc),
      noticePeriodDays: form.noticePeriodDays ? Number(form.noticePeriodDays) : undefined,
      probationDays: form.probationDays ? Number(form.probationDays) : undefined,
    };
    setSaving(true);
    try {
      await offerApi.create(payload);
      toast.success("Offer created as draft");
      setCreateOpen(false);
      setStatus("DRAFT");
      await load("DRAFT");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create offer.");
    } finally {
      setSaving(false);
    }
  };

  const openDetail = async (offer: OfferDto) => {
    setSelected(offer);
    try {
      setNegotiations(await offerApi.listNegotiations(offer.id));
    } catch {
      setNegotiations([]);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const fresh = await offerApi.getById(selected.id);
      setSelected(fresh);
      setRows((rs) => rs.map((r) => (r.id === fresh.id ? fresh : r)));
    } catch {
      // ignore
    }
  };

  const runQuick = async (fn: () => Promise<unknown>, label: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(label);
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusy(false);
    }
  };

  const doSubmit = async () => {
    if (!selected) return;
    if (!definitionId) {
      toast.error("No active OFFER_APPROVAL workflow definition found.");
      return;
    }
    await runQuick(
      () => offerApi.submit(selected.id, definitionId),
      "Offer submitted for approval",
    );
  };

  const doExtend = async () => {
    if (!selected || !expiresAt) {
      toast.error("Expiry date is required");
      return;
    }
    setBusy(true);
    try {
      await offerApi.extend(selected.id, new Date(expiresAt).toISOString());
      toast.success("Offer extended");
      setExtendOpen(false);
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to extend offer.");
    } finally {
      setBusy(false);
    }
  };

  const doDecline = async () => {
    if (!selected || !declineReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setBusy(true);
    try {
      await offerApi.decline(selected.id, declineReason.trim());
      toast.success("Offer declined");
      setDeclineOpen(false);
      setDeclineReason("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to decline offer.");
    } finally {
      setBusy(false);
    }
  };

  const doWithdraw = async () => {
    if (!selected || !withdrawReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setBusy(true);
    try {
      await offerApi.withdraw(selected.id, withdrawReason.trim());
      toast.success("Offer withdrawn");
      setWithdrawOpen(false);
      setWithdrawReason("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to withdraw offer.");
    } finally {
      setBusy(false);
    }
  };

  const doLogNego = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await offerApi.logNegotiation(selected.id, {
        proposedBy: "CANDIDATE",
        notes: negoNotes.trim() || undefined,
      });
      toast.success("Negotiation logged");
      setNegoOpen(false);
      setNegoNotes("");
      setNegotiations(await offerApi.listNegotiations(selected.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to log negotiation.");
    } finally {
      setBusy(false);
    }
  };

  const openRevise = () => {
    if (!selected) return;
    setReviseForm({
      offerNumber: `${selected.offerNumber}-R${selected.version + 1}`,
      applicationId: selected.applicationId,
      templateId: selected.templateId ?? "",
      designation: selected.designation,
      departmentOrgUnitId: selected.departmentOrgUnitId ?? "",
      location: selected.location ?? "",
      employmentType: selected.employmentType,
      targetJoiningDate: selected.targetJoiningDate ?? "",
      currency: selected.currency,
      baseSalary: String(selected.baseSalary),
      variablePay: selected.variablePay !== undefined ? String(selected.variablePay) : "",
      oneTimeBonus: selected.oneTimeBonus !== undefined ? String(selected.oneTimeBonus) : "",
      totalCtc: String(selected.totalCtc),
      noticePeriodDays:
        selected.noticePeriodDays !== undefined ? String(selected.noticePeriodDays) : "",
      probationDays: selected.probationDays !== undefined ? String(selected.probationDays) : "",
    });
    setReviseOpen(true);
  };

  const doRevise = async () => {
    if (!selected || !tenantId || !activeCompanyId) return;
    const validationError = validateOfferForm(reviseForm, false);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    const payload: CreateOfferPayload = {
      tenantId,
      companyId: activeCompanyId,
      offerNumber: reviseForm.offerNumber.trim(),
      applicationId: reviseForm.applicationId,
      templateId: reviseForm.templateId || undefined,
      designation: reviseForm.designation.trim(),
      departmentOrgUnitId: reviseForm.departmentOrgUnitId.trim() || undefined,
      location: reviseForm.location.trim() || undefined,
      employmentType: reviseForm.employmentType,
      targetJoiningDate: reviseForm.targetJoiningDate || undefined,
      currency: reviseForm.currency.trim(),
      baseSalary: Number(reviseForm.baseSalary),
      variablePay: reviseForm.variablePay ? Number(reviseForm.variablePay) : undefined,
      oneTimeBonus: reviseForm.oneTimeBonus ? Number(reviseForm.oneTimeBonus) : undefined,
      totalCtc: Number(reviseForm.totalCtc),
      noticePeriodDays: reviseForm.noticePeriodDays
        ? Number(reviseForm.noticePeriodDays)
        : undefined,
      probationDays: reviseForm.probationDays ? Number(reviseForm.probationDays) : undefined,
    };
    setBusy(true);
    try {
      await offerApi.revise(selected.id, payload);
      toast.success("Revised offer created as a new draft");
      setReviseOpen(false);
      setSelected(null);
      setStatus("DRAFT");
      await load("DRAFT");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revise offer.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Offers"
        description="Draft, approve, extend, and track compensation offers."
      />

      <Tabs defaultValue="offers">
        <TabsList>
          <TabsTrigger value="offers">Offers</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="offers" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as OfferStatus)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OFFER_STATUSES.map((s) => (
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
            <RequirePermission code="OFFER_WRITE">
              <Button size="sm" onClick={() => void openCreate()} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                New Offer
              </Button>
            </RequirePermission>
          </div>

          <div className="rounded-lg border border-border bg-card">
            {!activeCompanyId ? (
              <EmptyState
                icon={Handshake}
                title="Select a company"
                description="Choose a company to view offers."
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
                icon={Handshake}
                title={`No ${status.replace(/_/g, " ").toLowerCase()} offers`}
                description="Try a different status filter."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Offer #</TableHead>
                      <TableHead>Designation</TableHead>
                      <TableHead className="text-right">Total CTC</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => void openDetail(o)}
                      >
                        <TableCell className="font-mono text-xs">{o.offerNumber}</TableCell>
                        <TableCell className="text-sm">{o.designation}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {o.currency} {o.totalCtc.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={STATUS_TONE[o.status]}>
                            {o.status.replace(/_/g, " ")}
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
          <OfferTemplatesTab
            companyId={activeCompanyId}
            templates={templates}
            reload={loadTemplates}
            canWrite={canWrite}
            canDelete={has("OFFER_ADMIN")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Offer</DialogTitle>
            <DialogDescription>
              Draft an offer for an application in Offer Initiated stage.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-offer-number">
                Offer number<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-offer-number"
                value={form.offerNumber}
                onChange={(e) => setForm({ ...form, offerNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-application">
                Application<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={form.applicationId}
                onValueChange={(v) => setForm({ ...form, applicationId: v })}
              >
                <SelectTrigger id="f-application">
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.applicationNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="f-template-optional">Template (optional)</Label>
              <Select
                value={form.templateId}
                onValueChange={(v) => setForm({ ...form, templateId: v })}
              >
                <SelectTrigger id="f-template-optional">
                  <SelectValue placeholder="No template" />
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
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="f-designation">
                Designation<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-designation"
                value={form.designation}
                onChange={(e) => setForm({ ...form, designation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-employment-type">Employment type</Label>
              <Select
                value={form.employmentType}
                onValueChange={(v) =>
                  setForm({ ...form, employmentType: v as RecruitmentEmploymentType })
                }
              >
                <SelectTrigger id="f-employment-type">
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
              <Label htmlFor="f-location">Location</Label>
              <Input
                id="f-location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-target-joining-date">Target joining date</Label>
              <Input
                id="f-target-joining-date"
                type="date"
                value={form.targetJoiningDate}
                onChange={(e) => setForm({ ...form, targetJoiningDate: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-currency">Currency</Label>
              <Input
                id="f-currency"
                maxLength={3}
                value={form.currency}
                onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-base-salary">
                Base salary<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-base-salary"
                type="number"
                min={0}
                value={form.baseSalary}
                onChange={(e) => setForm({ ...form, baseSalary: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-total-ctc">
                Total CTC<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-total-ctc"
                type="number"
                min={0}
                value={form.totalCtc}
                onChange={(e) => setForm({ ...form, totalCtc: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-variable-pay">Variable pay</Label>
              <Input
                id="f-variable-pay"
                type="number"
                min={0}
                value={form.variablePay}
                onChange={(e) => setForm({ ...form, variablePay: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-one-time-bonus">One-time bonus</Label>
              <Input
                id="f-one-time-bonus"
                type="number"
                min={0}
                value={form.oneTimeBonus}
                onChange={(e) => setForm({ ...form, oneTimeBonus: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-notice-period-days">Notice period (days)</Label>
              <Input
                id="f-notice-period-days"
                type="number"
                min={0}
                value={form.noticePeriodDays}
                onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-probation-days">Probation (days)</Label>
              <Input
                id="f-probation-days"
                type="number"
                min={0}
                value={form.probationDays}
                onChange={(e) => setForm({ ...form, probationDays: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.offerNumber}</SheetTitle>
                <SheetDescription>
                  {selected.designation} ·{" "}
                  <StatusChip tone={STATUS_TONE[selected.status]}>
                    {selected.status.replace(/_/g, " ")}
                  </StatusChip>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                <div>
                  <div className="text-xs text-muted-foreground">Total CTC</div>
                  <div>
                    {selected.currency} {selected.totalCtc.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-muted-foreground">Base salary</div>
                  <div>
                    {selected.currency} {selected.baseSalary.toLocaleString()}
                  </div>
                </div>
                {selected.targetJoiningDate && (
                  <div>
                    <div className="text-xs text-muted-foreground">Target joining</div>
                    <div>{selected.targetJoiningDate}</div>
                  </div>
                )}
                {selected.expiresAt && (
                  <div>
                    <div className="text-xs text-muted-foreground">Expires</div>
                    <div>{selected.expiresAt.slice(0, 10)}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {selected.status === "DRAFT" && canWrite && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => void doSubmit()}
                    disabled={busy}
                  >
                    Submit for approval
                  </Button>
                )}
                {selected.status === "PENDING_APPROVAL" && canApprove && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runQuick(() => offerApi.approve(selected.id), "Offer approved")
                      }
                    >
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runQuick(() => offerApi.reject(selected.id), "Offer rejected")
                      }
                    >
                      Reject
                    </Button>
                  </>
                )}
                {selected.status === "APPROVED" && canWrite && (
                  <Button size="sm" variant="outline" onClick={() => setExtendOpen(true)}>
                    Extend to candidate
                  </Button>
                )}
                {selected.status === "EXTENDED" && canAccept && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runQuick(
                          () => offerApi.accept(selected.id, "candidate-portal-signature"),
                          "Offer accepted",
                        )
                      }
                    >
                      Accept
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setDeclineOpen(true)}>
                      Decline
                    </Button>
                  </>
                )}
                {selected.status === "EXTENDED" && canWrite && (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runQuick(() => offerApi.sendReminder(selected.id), "Reminder sent")
                      }
                    >
                      Send reminder
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void runQuick(() => offerApi.markExpired(selected.id), "Offer expired")
                      }
                    >
                      Mark expired
                    </Button>
                  </>
                )}
                {(selected.status === "EXTENDED" || selected.status === "PENDING_APPROVAL") &&
                  canWrite && (
                    <Button size="sm" variant="outline" onClick={openRevise}>
                      Revise offer
                    </Button>
                  )}
                {!["ACCEPTED", "DECLINED", "EXPIRED", "WITHDRAWN", "REJECTED"].includes(
                  selected.status,
                ) &&
                  canWrite && (
                    <Button size="sm" variant="destructive" onClick={() => setWithdrawOpen(true)}>
                      Withdraw
                    </Button>
                  )}
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Negotiations</h4>
                  {canWrite && (
                    <Button size="sm" variant="ghost" onClick={() => setNegoOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Log
                    </Button>
                  )}
                </div>
                {negotiations.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No negotiation history.</p>
                ) : (
                  negotiations.map((n) => (
                    <Card key={n.id}>
                      <CardContent className="p-3 text-sm">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusChip tone="neutral">{n.proposedBy}</StatusChip>
                          <span>{n.submittedAt.slice(0, 16).replace("T", " ")}</span>
                        </div>
                        {n.notes && <p className="mt-1">{n.notes}</p>}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={extendOpen} onOpenChange={setExtendOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Extend offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-expires-at">Expires at</Label>
            <Input
              id="f-expires-at"
              type="date"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void doExtend()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Extend
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Decline offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-reason">
              Reason<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="f-reason"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeclineOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void doDecline()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Decline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Withdraw offer</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-reason-2">
              Reason<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea
              id="f-reason-2"
              value={withdrawReason}
              onChange={(e) => setWithdrawReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWithdrawOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={() => void doWithdraw()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Withdraw
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={negoOpen} onOpenChange={setNegoOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Log negotiation</DialogTitle>
            <DialogDescription>
              Records a candidate counter-proposal against this offer.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="f-notes">Notes</Label>
            <Textarea
              id="f-notes"
              value={negoNotes}
              onChange={(e) => setNegoNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNegoOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void doLogNego()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviseOpen} onOpenChange={setReviseOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revise offer</DialogTitle>
            <DialogDescription>
              Creates a new offer version with updated terms for the same application. The current
              offer is superseded once this is created.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="revise-offerNumber">
                Offer number<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="revise-offerNumber"
                value={reviseForm.offerNumber}
                onChange={(e) => setReviseForm({ ...reviseForm, offerNumber: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-designation">
                Designation<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="revise-designation"
                value={reviseForm.designation}
                onChange={(e) => setReviseForm({ ...reviseForm, designation: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-currency">
                Currency<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="revise-currency"
                maxLength={3}
                value={reviseForm.currency}
                onChange={(e) =>
                  setReviseForm({ ...reviseForm, currency: e.target.value.toUpperCase() })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-baseSalary">
                Base salary<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="revise-baseSalary"
                type="number"
                min={0}
                value={reviseForm.baseSalary}
                onChange={(e) => setReviseForm({ ...reviseForm, baseSalary: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-totalCtc">
                Total CTC<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="revise-totalCtc"
                type="number"
                min={0}
                value={reviseForm.totalCtc}
                onChange={(e) => setReviseForm({ ...reviseForm, totalCtc: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-variablePay">Variable pay</Label>
              <Input
                id="revise-variablePay"
                type="number"
                min={0}
                value={reviseForm.variablePay}
                onChange={(e) => setReviseForm({ ...reviseForm, variablePay: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-oneTimeBonus">One-time bonus</Label>
              <Input
                id="revise-oneTimeBonus"
                type="number"
                min={0}
                value={reviseForm.oneTimeBonus}
                onChange={(e) => setReviseForm({ ...reviseForm, oneTimeBonus: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-targetJoiningDate">Target joining date</Label>
              <Input
                id="revise-targetJoiningDate"
                type="date"
                value={reviseForm.targetJoiningDate}
                onChange={(e) =>
                  setReviseForm({ ...reviseForm, targetJoiningDate: e.target.value })
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-noticePeriodDays">Notice period (days)</Label>
              <Input
                id="revise-noticePeriodDays"
                type="number"
                min={0}
                value={reviseForm.noticePeriodDays}
                onChange={(e) => setReviseForm({ ...reviseForm, noticePeriodDays: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="revise-probationDays">Probation (days)</Label>
              <Input
                id="revise-probationDays"
                type="number"
                min={0}
                value={reviseForm.probationDays}
                onChange={(e) => setReviseForm({ ...reviseForm, probationDays: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviseOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void doRevise()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Create revised offer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function OfferTemplatesTab({
  companyId,
  templates,
  reload,
  canWrite,
  canDelete,
}: {
  companyId: string | undefined;
  templates: OfferTemplateDto[];
  reload: () => Promise<void>;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [form, setForm] = useState<{
    code: string;
    name: string;
    bodyTemplate: string;
    defaultCurrency: string;
    defaultExpiryDays: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form || !companyId) return;
    if (!form.code.trim() || !form.name.trim() || !form.bodyTemplate.trim()) {
      toast.error("Code, name, and body template are required");
      return;
    }
    if (!OFFER_TEMPLATE_CODE_PATTERN.test(form.code.trim())) {
      toast.error(
        "Code must start with a letter or digit and contain only letters, digits, '.', '_', or '-'",
      );
      return;
    }
    if (form.defaultCurrency.trim() && !CURRENCY_PATTERN.test(form.defaultCurrency.trim())) {
      toast.error("Default currency must be a 3-letter uppercase code, e.g. INR");
      return;
    }
    const defaultExpiryDays = Number(form.defaultExpiryDays);
    if (!Number.isFinite(defaultExpiryDays) || defaultExpiryDays < 1) {
      toast.error("Default expiry must be at least 1 day");
      return;
    }
    setSaving(true);
    try {
      await offerTemplateApi.create({
        companyId,
        code: form.code.trim(),
        name: form.name.trim(),
        bodyTemplate: form.bodyTemplate.trim(),
        defaultCurrency: form.defaultCurrency.trim() || undefined,
        defaultExpiryDays,
      });
      toast.success("Template created");
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
      await offerTemplateApi.remove(id);
      toast.success("Template deleted");
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
              bodyTemplate: "",
              defaultCurrency: "INR",
              defaultExpiryDays: "7",
            })
          }
          disabled={!companyId}
        >
          <Plus className="h-4 w-4" />
          New template
        </Button>
      )}
      {templates.length === 0 ? (
        <EmptyState
          title="No templates yet"
          description="Create a reusable offer letter template."
        />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead className="text-right">Expiry (days)</TableHead>
                <TableHead>Status</TableHead>
                {canDelete && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell className="text-sm">{t.name}</TableCell>
                  <TableCell className="text-sm">{t.defaultCurrency ?? "—"}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.defaultExpiryDays}</TableCell>
                  <TableCell>
                    <StatusChip tone={t.active ? "success" : "neutral"}>
                      {t.active ? "Active" : "Inactive"}
                    </StatusChip>
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void remove(t.id)}
                        aria-label={`Delete template ${t.name}`}
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New offer template</DialogTitle>
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="f-default-currency">Default currency</Label>
                  <Input
                    id="f-default-currency"
                    maxLength={3}
                    value={form.defaultCurrency}
                    onChange={(e) =>
                      setForm({ ...form, defaultCurrency: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="f-default-expiry-days">Default expiry (days)</Label>
                  <Input
                    id="f-default-expiry-days"
                    type="number"
                    min={1}
                    value={form.defaultExpiryDays}
                    onChange={(e) => setForm({ ...form, defaultExpiryDays: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-body-template">Body template</Label>
                <Textarea
                  id="f-body-template"
                  rows={6}
                  value={form.bodyTemplate}
                  onChange={(e) => setForm({ ...form, bodyTemplate: e.target.value })}
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
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
