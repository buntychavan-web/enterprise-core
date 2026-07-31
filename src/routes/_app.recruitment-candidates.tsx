import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2, Plus, RefreshCw, Search, UserSearch } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { DataPagination } from "@/components/ewos/DataPagination";
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
import { RequirePermission } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  CANDIDATE_SOURCES,
  CANDIDATE_STATUSES,
  candidateApi,
  type CandidateDto,
  type CandidatePayload,
  type CandidateSource,
  type CandidateStatus,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-candidates")({
  head: () => ({
    meta: [{ title: "Candidates — EWOS Recruitment" }, { name: "robots", content: "noindex" }],
  }),
  component: CandidatesPage,
});

const STATUS_TONE: Record<CandidateStatus, StatusTone> = {
  NEW: "info",
  ACTIVE: "success",
  ENGAGED: "info",
  HIRED: "success",
  ARCHIVED: "neutral",
  BLACKLISTED: "danger",
};

const ALL = "__ALL__";
const PAGE_SIZE = 20;

type FormState = {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  currentLocation: string;
  currentEmployer: string;
  currentDesignation: string;
  totalExperienceMonths: string;
  expectedCtcCurrency: string;
  expectedCtcAmount: string;
  noticePeriodDays: string;
  source: CandidateSource;
  sourceDetails: string;
  linkedinUrl: string;
  summary: string;
};

const emptyForm: FormState = {
  firstName: "",
  middleName: "",
  lastName: "",
  email: "",
  phone: "",
  currentLocation: "",
  currentEmployer: "",
  currentDesignation: "",
  totalExperienceMonths: "",
  expectedCtcCurrency: "INR",
  expectedCtcAmount: "",
  noticePeriodDays: "",
  source: "DIRECT",
  sourceDetails: "",
  linkedinUrl: "",
  summary: "",
};

function CandidatesPage() {
  const { activeCompanyId, tenantId } = useTenant();
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<CandidateDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await candidateApi.list(
        activeCompanyId,
        statusFilter === ALL ? undefined : (statusFilter as CandidateStatus),
        page,
        PAGE_SIZE,
      );
      setRows(result.content);
      setTotal(result.totalElements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load candidates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, statusFilter, page]);

  useEffect(() => {
    setPage(0);
  }, [statusFilter]);

  const filtered = useMemo(
    () =>
      query
        ? rows.filter((r) =>
            `${r.firstName} ${r.lastName} ${r.email ?? ""} ${r.phone ?? ""} ${r.candidateNumber}`
              .toLowerCase()
              .includes(query.toLowerCase()),
          )
        : rows,
    [rows, query],
  );

  const openCreate = () => setForm({ ...emptyForm });

  const submitCreate = async () => {
    if (!form) return;
    if (!form.firstName.trim() || !form.lastName.trim()) {
      toast.error("First and last name are required");
      return;
    }
    if (!form.email.trim() && !form.phone.trim()) {
      toast.error("Provide an email or a phone number");
      return;
    }
    const payload: CandidatePayload = {
      tenantId,
      companyId: activeCompanyId,
      firstName: form.firstName.trim(),
      middleName: form.middleName.trim() || undefined,
      lastName: form.lastName.trim(),
      email: form.email.trim() || undefined,
      phone: form.phone.trim() || undefined,
      currentLocation: form.currentLocation.trim() || undefined,
      currentEmployer: form.currentEmployer.trim() || undefined,
      currentDesignation: form.currentDesignation.trim() || undefined,
      totalExperienceMonths: form.totalExperienceMonths
        ? Number(form.totalExperienceMonths)
        : undefined,
      expectedCtcCurrency: form.expectedCtcAmount ? form.expectedCtcCurrency.trim() : undefined,
      expectedCtcAmount: form.expectedCtcAmount ? Number(form.expectedCtcAmount) : undefined,
      noticePeriodDays: form.noticePeriodDays ? Number(form.noticePeriodDays) : undefined,
      source: form.source,
      sourceDetails: form.sourceDetails.trim() || undefined,
      linkedinUrl: form.linkedinUrl.trim() || undefined,
      summary: form.summary.trim() || undefined,
    };
    setSaving(true);
    try {
      const result = await candidateApi.create(payload);
      if (result.potentialDuplicates.length > 0) {
        toast.warning(
          `Candidate created — ${result.potentialDuplicates.length} potential duplicate(s) found: ` +
            result.potentialDuplicates.map((d) => `${d.fullName} (${d.matchType})`).join(", "),
        );
      } else {
        toast.success("Candidate created");
      }
      setForm(null);
      setStatusFilter(ALL);
      setPage(0);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Candidates"
        description="The candidate pool feeding every job requisition's pipeline."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All statuses</SelectItem>
                {CANDIDATE_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <RequirePermission code="ATS_WRITE">
              <Button size="sm" onClick={openCreate} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                New Candidate
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
              placeholder="Search this page…"
              className="pl-8"
              disabled={loading}
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {loading ? "…" : `${total} total`}
          </div>
        </div>

        {!activeCompanyId ? (
          <EmptyState
            icon={UserSearch}
            title="Select a company"
            description="Choose a company from the switcher above to view candidates."
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
            icon={UserSearch}
            title={rows.length === 0 ? "No candidates yet" : "No matches"}
            description={
              rows.length === 0
                ? "Add your first candidate to get started."
                : "Try a different search term."
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Candidate #</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((c) => (
                    <TableRow key={c.id} className="cursor-pointer hover:bg-muted/40">
                      <TableCell className="font-mono text-xs">
                        <Link
                          to="/recruitment-candidates/$id"
                          params={{ id: c.id }}
                          className="text-primary hover:underline"
                        >
                          {c.candidateNumber}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm font-medium">
                        <Link to="/recruitment-candidates/$id" params={{ id: c.id }}>
                          {c.firstName} {c.lastName}
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{c.email ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.phone ?? "—"}</TableCell>
                      <TableCell className="text-sm">{c.source.replace(/_/g, " ")}</TableCell>
                      <TableCell>
                        <StatusChip tone={STATUS_TONE[c.status]}>{c.status}</StatusChip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DataPagination
              page={page + 1}
              pageSize={PAGE_SIZE}
              total={total}
              onPageChange={(p) => setPage(p - 1)}
            />
          </>
        )}
      </div>

      <Dialog open={form !== null} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New Candidate</DialogTitle>
            <DialogDescription>
              Add a candidate to the pool. Duplicate email/phone matches are flagged after saving.
            </DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>
                  First name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  value={form.firstName}
                  onChange={(e) => setForm({ ...form, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>
                  Last name<span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                  value={form.lastName}
                  onChange={(e) => setForm({ ...form, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current location</Label>
                <Input
                  value={form.currentLocation}
                  onChange={(e) => setForm({ ...form, currentLocation: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current employer</Label>
                <Input
                  value={form.currentEmployer}
                  onChange={(e) => setForm({ ...form, currentEmployer: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Current designation</Label>
                <Input
                  value={form.currentDesignation}
                  onChange={(e) => setForm({ ...form, currentDesignation: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Total experience (months)</Label>
                <Input
                  type="number"
                  value={form.totalExperienceMonths}
                  onChange={(e) => setForm({ ...form, totalExperienceMonths: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expected CTC currency</Label>
                <Input
                  value={form.expectedCtcCurrency}
                  onChange={(e) => setForm({ ...form, expectedCtcCurrency: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expected CTC amount</Label>
                <Input
                  type="number"
                  value={form.expectedCtcAmount}
                  onChange={(e) => setForm({ ...form, expectedCtcAmount: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Notice period (days)</Label>
                <Input
                  type="number"
                  value={form.noticePeriodDays}
                  onChange={(e) => setForm({ ...form, noticePeriodDays: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select
                  value={form.source}
                  onValueChange={(v) => setForm({ ...form, source: v as CandidateSource })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CANDIDATE_SOURCES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Source details</Label>
                <Input
                  value={form.sourceDetails}
                  onChange={(e) => setForm({ ...form, sourceDetails: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>LinkedIn URL</Label>
                <Input
                  value={form.linkedinUrl}
                  onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })}
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Summary</Label>
                <Textarea
                  value={form.summary}
                  onChange={(e) => setForm({ ...form, summary: e.target.value })}
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
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
