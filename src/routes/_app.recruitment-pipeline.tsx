import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowRight, GitBranch, Loader2, MoreHorizontal, Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { DataPagination } from "@/components/ewos/DataPagination";
import { Button } from "@/components/ui/button";
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
  APPLICATION_FORWARD_STAGES,
  APPLICATION_STATUSES,
  ApiError,
  candidateApi,
  jobApplicationApi,
  jobRequisitionApi,
  REJECTION_REASONS,
  type ApplicationStatus,
  type CandidateDto,
  type JobApplicationDto,
  type JobRequisitionDto,
  type RejectionReason,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-pipeline")({
  head: () => ({
    meta: [{ title: "Recruitment Pipeline — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PipelinePage,
});

const STATUS_TONE: Record<ApplicationStatus, StatusTone> = {
  NEW: "info",
  SCREENING: "info",
  SHORTLISTED: "info",
  INTERVIEW_SCHEDULED: "warning",
  INTERVIEWING: "warning",
  INTERVIEW_COMPLETED: "warning",
  OFFER_INITIATED: "success",
  OFFER_EXTENDED: "success",
  OFFER_ACCEPTED: "success",
  OFFER_DECLINED: "danger",
  HIRED: "success",
  ONBOARDING: "success",
  ON_HOLD: "neutral",
  REJECTED: "danger",
  WITHDRAWN: "neutral",
};

const PAGE_SIZE = 20;

type ActionType = "advance" | "hold" | "resume" | "reject" | "withdraw";

function nextForwardStage(status: ApplicationStatus): ApplicationStatus | null {
  const idx = APPLICATION_FORWARD_STAGES.indexOf(status);
  if (idx === -1 || idx === APPLICATION_FORWARD_STAGES.length - 1) return null;
  return APPLICATION_FORWARD_STAGES[idx + 1];
}

function PipelinePage() {
  const { activeCompanyId } = useTenant();
  const { has } = usePermissions();
  const [status, setStatus] = useState<ApplicationStatus>("NEW");
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<JobApplicationDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [candidates, setCandidates] = useState<CandidateDto[]>([]);
  const [openReqs, setOpenReqs] = useState<JobRequisitionDto[]>([]);
  const [pickCandidate, setPickCandidate] = useState("");
  const [pickRequisition, setPickRequisition] = useState("");
  const [saving, setSaving] = useState(false);

  const [action, setAction] = useState<{ row: JobApplicationDto; type: ActionType } | null>(null);
  const [notes, setNotes] = useState("");
  const [rejectReason, setRejectReason] = useState<RejectionReason>("NOT_QUALIFIED");
  const [acting, setActing] = useState(false);

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await jobApplicationApi.byStatus(activeCompanyId, status, page, PAGE_SIZE);
      setRows(result.content);
      setTotal(result.totalElements);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId, status, page]);

  useEffect(() => setPage(0), [status]);

  const openCreate = async () => {
    setCreateOpen(true);
    if (!activeCompanyId) return;
    try {
      const [c, r] = await Promise.all([
        candidateApi.list(activeCompanyId, undefined, 0, 100),
        jobRequisitionApi.byStatus(activeCompanyId, "OPEN"),
      ]);
      setCandidates(c.content);
      setOpenReqs(r);
    } catch {
      toast.error("Failed to load candidates/requisitions for the picker.");
    }
  };

  const submitCreate = async () => {
    if (!pickCandidate || !pickRequisition) {
      toast.error("Select a candidate and a requisition");
      return;
    }
    const candidate = candidates.find((c) => c.id === pickCandidate);
    if (!candidate) return;
    setSaving(true);
    try {
      await jobApplicationApi.create({
        tenantId: candidate.tenantId,
        companyId: candidate.companyId,
        applicationNumber: `APP-${Date.now()}`,
        candidateId: pickCandidate,
        jobRequisitionId: pickRequisition,
        source: candidate.source,
      });
      toast.success("Application created");
      setCreateOpen(false);
      setPickCandidate("");
      setPickRequisition("");
      setStatus("NEW");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create application.");
    } finally {
      setSaving(false);
    }
  };

  const runAction = async () => {
    if (!action) return;
    if (action.type === "withdraw" && !notes.trim()) {
      toast.error("Notes are required to withdraw an application");
      return;
    }
    setActing(true);
    try {
      const { row, type } = action;
      switch (type) {
        case "advance": {
          const next = nextForwardStage(row.status);
          if (!next) {
            toast.error("No forward stage available.");
            setActing(false);
            return;
          }
          await jobApplicationApi.advance(row.id, next, notes.trim() || undefined);
          break;
        }
        case "hold":
          await jobApplicationApi.hold(row.id);
          break;
        case "resume":
          await jobApplicationApi.resume(row.id, row.status, notes.trim() || undefined);
          break;
        case "reject":
          await jobApplicationApi.reject(row.id, rejectReason, notes.trim() || undefined);
          break;
        case "withdraw":
          await jobApplicationApi.withdraw(row.id, notes.trim());
          break;
      }
      toast.success("Application updated");
      setAction(null);
      setNotes("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setActing(false);
    }
  };

  const canWrite = has("ATS_WRITE");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Pipeline"
        description="Every candidate application, grouped by pipeline stage."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as ApplicationStatus)}>
              <SelectTrigger className="h-9 w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {APPLICATION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <RequirePermission code="ATS_WRITE">
              <Button size="sm" onClick={() => void openCreate()} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                New Application
              </Button>
            </RequirePermission>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {!activeCompanyId ? (
          <EmptyState
            icon={GitBranch}
            title="Select a company"
            description="Choose a company from the switcher above to view the pipeline."
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon={GitBranch}
            title={`No applications in ${status.replace(/_/g, " ").toLowerCase()}`}
            description="Try a different stage, or start a new application."
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Application #</TableHead>
                    <TableHead>Candidate</TableHead>
                    <TableHead>Applied</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-16 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">{a.applicationNumber}</TableCell>
                      <TableCell className="text-sm">
                        <Link
                          to="/recruitment-candidates/$id"
                          params={{ id: a.candidateId }}
                          className="text-primary hover:underline"
                        >
                          View candidate
                        </Link>
                      </TableCell>
                      <TableCell className="text-sm">{a.appliedAt.slice(0, 10)}</TableCell>
                      <TableCell>
                        <StatusChip tone={STATUS_TONE[a.status]}>
                          {a.status.replace(/_/g, " ")}
                        </StatusChip>
                      </TableCell>
                      <TableCell className="text-right">
                        {canWrite && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" aria-label="Application actions">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {nextForwardStage(a.status) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAction({ row: a, type: "advance" });
                                    setNotes("");
                                  }}
                                >
                                  <ArrowRight className="h-4 w-4" />
                                  Advance to {nextForwardStage(a.status)?.replace(/_/g, " ")}
                                </DropdownMenuItem>
                              )}
                              {a.status !== "ON_HOLD" &&
                                !["REJECTED", "WITHDRAWN", "HIRED"].includes(a.status) && (
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setAction({ row: a, type: "hold" });
                                      setNotes("");
                                    }}
                                  >
                                    Put on hold
                                  </DropdownMenuItem>
                                )}
                              {a.status === "ON_HOLD" && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAction({ row: a, type: "resume" });
                                    setNotes("");
                                  }}
                                >
                                  Resume
                                </DropdownMenuItem>
                              )}
                              {!["REJECTED", "WITHDRAWN", "HIRED"].includes(a.status) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAction({ row: a, type: "reject" });
                                    setNotes("");
                                  }}
                                >
                                  Reject
                                </DropdownMenuItem>
                              )}
                              {!["REJECTED", "WITHDRAWN", "HIRED"].includes(a.status) && (
                                <DropdownMenuItem
                                  onClick={() => {
                                    setAction({ row: a, type: "withdraw" });
                                    setNotes("");
                                  }}
                                >
                                  Withdraw
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
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

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Application</DialogTitle>
            <DialogDescription>
              Apply an existing candidate to an open requisition.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Candidate</Label>
              <Select value={pickCandidate} onValueChange={setPickCandidate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select candidate" />
                </SelectTrigger>
                <SelectContent>
                  {candidates.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.candidateNumber} — {c.firstName} {c.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Requisition (open)</Label>
              <Select value={pickRequisition} onValueChange={setPickRequisition}>
                <SelectTrigger>
                  <SelectValue placeholder="Select requisition" />
                </SelectTrigger>
                <SelectContent>
                  {openReqs.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.requisitionNumber} — {r.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

      <Dialog open={action !== null} onOpenChange={(o) => !o && setAction(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {action?.type === "advance" && "Advance application"}
              {action?.type === "hold" && "Put application on hold"}
              {action?.type === "resume" && "Resume application"}
              {action?.type === "reject" && "Reject application"}
              {action?.type === "withdraw" && "Withdraw application"}
            </DialogTitle>
            <DialogDescription>{action?.row.applicationNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {action?.type === "reject" && (
              <div className="space-y-1.5">
                <Label>Reason</Label>
                <Select
                  value={rejectReason}
                  onValueChange={(v) => setRejectReason(v as RejectionReason)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REJECTION_REASONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {action?.type !== "hold" && (
              <div className="space-y-1.5">
                <Label>
                  Notes
                  {action?.type === "withdraw" && (
                    <span className="ml-0.5 text-destructive">*</span>
                  )}
                </Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            )}
          </div>
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
