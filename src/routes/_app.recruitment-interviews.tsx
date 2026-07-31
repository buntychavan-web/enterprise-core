import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Trash2,
  UserPlus,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  candidateInterviewFeedbackApi,
  INTERVIEW_MODES,
  INTERVIEW_PARTICIPANT_ATTENDANCE,
  INTERVIEW_PARTICIPANT_ROLES,
  INTERVIEW_STATUSES,
  INTERVIEW_TYPES,
  interviewPanelApi,
  interviewRoundApi,
  interviewScorecardApi,
  interviewTemplateApi,
  jobApplicationApi,
  SCORECARD_RECOMMENDATIONS,
  type ApplicationStatus,
  type CandidateInterviewFeedbackDto,
  type InterviewDecision,
  type InterviewMode,
  type InterviewParticipantAttendance,
  type InterviewParticipantDto,
  type InterviewParticipantRole,
  type InterviewRoundDto,
  type InterviewScorecardDto,
  type InterviewStatus,
  type InterviewTemplateDto,
  type InterviewType,
  type JobApplicationDto,
  type RoundScorecardSummaryDto,
  type ScorecardRecommendation,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-interviews")({
  head: () => ({
    meta: [{ title: "Interviews — EWOS Recruitment" }, { name: "robots", content: "noindex" }],
  }),
  component: InterviewsPage,
});

const STATUS_TONE: Record<InterviewStatus, StatusTone> = {
  DRAFT: "neutral",
  SCHEDULED: "info",
  RESCHEDULED: "warning",
  IN_PROGRESS: "warning",
  COMPLETED: "success",
  CANCELLED: "danger",
  NO_SHOW: "danger",
  PENDING_FEEDBACK: "warning",
};

const APPLICATION_SOURCE_STATUSES: ApplicationStatus[] = [
  "SHORTLISTED",
  "INTERVIEW_SCHEDULED",
  "INTERVIEWING",
];

function toLocalInput(iso?: string): string {
  if (!iso) return "";
  return iso.slice(0, 16);
}

function InterviewsPage() {
  const { activeCompanyId } = useTenant();
  const { has } = usePermissions();
  const [status, setStatus] = useState<InterviewStatus>("SCHEDULED");
  const [rounds, setRounds] = useState<InterviewRoundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [templates, setTemplates] = useState<InterviewTemplateDto[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [applications, setApplications] = useState<JobApplicationDto[]>([]);
  const [saving, setSaving] = useState(false);
  const [newRound, setNewRound] = useState({
    applicationId: "",
    name: "",
    interviewType: "TECHNICAL" as InterviewType,
    durationMinutes: "60",
    mode: "VIDEO" as InterviewMode,
    location: "",
    meetingUrl: "",
  });

  const [selected, setSelected] = useState<InterviewRoundDto | null>(null);
  const [scheduleOpen, setScheduleOpen] = useState<"schedule" | "reschedule" | null>(null);
  const [scheduleStart, setScheduleStart] = useState("");
  const [scheduleEnd, setScheduleEnd] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [decideOpen, setDecideOpen] = useState(false);
  const [decision, setDecision] = useState<InterviewDecision>("PROCEED");
  const [decisionNotes, setDecisionNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const canWrite = has("INTERVIEW_WRITE");

  const load = async (s: InterviewStatus) => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await interviewRoundApi.byStatus(activeCompanyId, s);
      setRounds(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load interview rounds.");
    } finally {
      setLoading(false);
    }
  };

  const loadTemplates = async () => {
    if (!activeCompanyId) return;
    setTemplatesLoading(true);
    try {
      setTemplates(await interviewTemplateApi.listForCompany(activeCompanyId));
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
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
    if (!activeCompanyId) return;
    try {
      const lists = await Promise.all(
        APPLICATION_SOURCE_STATUSES.map((s) =>
          jobApplicationApi.byStatus(activeCompanyId, s, 0, 50).then((r) => r.content),
        ),
      );
      setApplications(lists.flat());
    } catch {
      toast.error("Failed to load eligible applications.");
    }
  };

  const submitCreate = async () => {
    if (!newRound.applicationId || !newRound.name.trim()) {
      toast.error("Application and round name are required");
      return;
    }
    setSaving(true);
    try {
      await interviewRoundApi.create({
        applicationId: newRound.applicationId,
        name: newRound.name.trim(),
        interviewType: newRound.interviewType,
        durationMinutes: Number(newRound.durationMinutes) || 60,
        mode: newRound.mode,
        location: newRound.location.trim() || undefined,
        meetingUrl: newRound.meetingUrl.trim() || undefined,
      });
      toast.success("Interview round created");
      setCreateOpen(false);
      setNewRound({
        applicationId: "",
        name: "",
        interviewType: "TECHNICAL",
        durationMinutes: "60",
        mode: "VIDEO",
        location: "",
        meetingUrl: "",
      });
      setStatus("DRAFT");
      await load("DRAFT");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create round.");
    } finally {
      setSaving(false);
    }
  };

  const refreshSelected = async () => {
    if (!selected) return;
    try {
      const fresh = await interviewRoundApi.getById(selected.id);
      setSelected(fresh);
      setRounds((rs) => rs.map((r) => (r.id === fresh.id ? fresh : r)));
    } catch {
      // ignore — sheet stays on stale data until manually refreshed
    }
  };

  const doSchedule = async () => {
    if (!selected || !scheduleStart || !scheduleEnd) {
      toast.error("Start and end times are required");
      return;
    }
    setBusy(true);
    try {
      const startIso = new Date(scheduleStart).toISOString();
      const endIso = new Date(scheduleEnd).toISOString();
      if (scheduleOpen === "schedule")
        await interviewRoundApi.schedule(selected.id, startIso, endIso);
      else await interviewRoundApi.reschedule(selected.id, startIso, endIso);
      toast.success("Interview scheduled");
      setScheduleOpen(null);
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to schedule.");
    } finally {
      setBusy(false);
    }
  };

  const quickAction = async (fn: () => Promise<unknown>, label: string) => {
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

  const doCancel = async () => {
    if (!selected || !cancelReason.trim()) {
      toast.error("Reason is required");
      return;
    }
    setBusy(true);
    try {
      await interviewRoundApi.cancel(selected.id, cancelReason.trim());
      toast.success("Round cancelled");
      setCancelOpen(false);
      setCancelReason("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel.");
    } finally {
      setBusy(false);
    }
  };

  const doDecide = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await interviewRoundApi.decide(selected.id, decision, decisionNotes.trim() || undefined);
      toast.success("Decision recorded");
      setDecideOpen(false);
      setDecisionNotes("");
      await refreshSelected();
      await load(status);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record decision.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Interviews"
        description="Interview rounds, panels, scorecards, and candidate feedback."
      />

      <Tabs defaultValue="rounds">
        <TabsList>
          <TabsTrigger value="rounds">Rounds</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
        </TabsList>

        <TabsContent value="rounds" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Select value={status} onValueChange={(v) => setStatus(v as InterviewStatus)}>
              <SelectTrigger className="h-9 w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INTERVIEW_STATUSES.map((s) => (
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
            <RequirePermission code="INTERVIEW_WRITE">
              <Button size="sm" onClick={() => void openCreate()} disabled={!activeCompanyId}>
                <Plus className="h-4 w-4" />
                Schedule Interview
              </Button>
            </RequirePermission>
          </div>

          <div className="rounded-lg border border-border bg-card">
            {!activeCompanyId ? (
              <EmptyState
                icon={CalendarClock}
                title="Select a company"
                description="Choose a company from the switcher above to view interviews."
              />
            ) : loading ? (
              <div className="grid place-items-center p-16 text-sm text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : error ? (
              <div className="p-8 text-center">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            ) : rounds.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title={`No ${status.replace(/_/g, " ").toLowerCase()} rounds`}
                description="Try a different status, or schedule a new interview."
              />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Round</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Mode</TableHead>
                      <TableHead>Scheduled</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Decision</TableHead>
                      <TableHead className="w-16 text-right">Manage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rounds.map((r) => (
                      <TableRow
                        key={r.id}
                        className="cursor-pointer"
                        onClick={() => setSelected(r)}
                      >
                        <TableCell className="text-sm font-medium">{r.name}</TableCell>
                        <TableCell className="text-sm">
                          {r.interviewType.replace(/_/g, " ")}
                        </TableCell>
                        <TableCell className="text-sm">{r.mode}</TableCell>
                        <TableCell className="text-sm">
                          {r.scheduledStart ? r.scheduledStart.slice(0, 16).replace("T", " ") : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={STATUS_TONE[r.status]}>
                            {r.status.replace(/_/g, " ")}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="text-sm">{r.decision}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(r);
                            }}
                            aria-label="Manage round"
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
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
          <TemplatesTab
            companyId={activeCompanyId}
            templates={templates}
            loading={templatesLoading}
            reload={loadTemplates}
            canWrite={canWrite}
            canDelete={has("INTERVIEW_ADMIN")}
          />
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Schedule Interview</DialogTitle>
            <DialogDescription>
              Create a round for a candidate currently shortlisted or in interviewing.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Application<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select
                value={newRound.applicationId}
                onValueChange={(v) => setNewRound({ ...newRound, applicationId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select application" />
                </SelectTrigger>
                <SelectContent>
                  {applications.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.applicationNumber} ({a.status.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>
                Round name<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                value={newRound.name}
                onChange={(e) => setNewRound({ ...newRound, name: e.target.value })}
                placeholder="e.g. Technical Round 1"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select
                value={newRound.interviewType}
                onValueChange={(v) =>
                  setNewRound({ ...newRound, interviewType: v as InterviewType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Mode</Label>
              <Select
                value={newRound.mode}
                onValueChange={(v) => setNewRound({ ...newRound, mode: v as InterviewMode })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_MODES.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Duration (minutes)</Label>
              <Input
                type="number"
                value={newRound.durationMinutes}
                onChange={(e) => setNewRound({ ...newRound, durationMinutes: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Location</Label>
              <Input
                value={newRound.location}
                onChange={(e) => setNewRound({ ...newRound, location: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Meeting URL</Label>
              <Input
                value={newRound.meetingUrl}
                onChange={(e) => setNewRound({ ...newRound, meetingUrl: e.target.value })}
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

      <Sheet open={selected !== null} onOpenChange={(o) => !o && setSelected(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-xl">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{selected.name}</SheetTitle>
                <SheetDescription>
                  {selected.interviewType.replace(/_/g, " ")} · {selected.mode} ·{" "}
                  <StatusChip tone={STATUS_TONE[selected.status]}>
                    {selected.status.replace(/_/g, " ")}
                  </StatusChip>
                </SheetDescription>
              </SheetHeader>

              {canWrite && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {["DRAFT", "SCHEDULED", "RESCHEDULED"].includes(selected.status) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setScheduleStart(toLocalInput(selected.scheduledStart));
                        setScheduleEnd(toLocalInput(selected.scheduledEnd));
                        setScheduleOpen(selected.status === "DRAFT" ? "schedule" : "reschedule");
                      }}
                    >
                      {selected.status === "DRAFT" ? "Schedule" : "Reschedule"}
                    </Button>
                  )}
                  {(selected.status === "SCHEDULED" || selected.status === "RESCHEDULED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void quickAction(
                          () => interviewRoundApi.start(selected.id),
                          "Round started",
                        )
                      }
                    >
                      Start
                    </Button>
                  )}
                  {selected.status === "IN_PROGRESS" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void quickAction(
                          () => interviewRoundApi.complete(selected.id),
                          "Round completed",
                        )
                      }
                    >
                      Complete
                    </Button>
                  )}
                  {(selected.status === "SCHEDULED" || selected.status === "RESCHEDULED") && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void quickAction(
                          () => interviewRoundApi.markNoShow(selected.id),
                          "Marked as no-show",
                        )
                      }
                    >
                      Mark no-show
                    </Button>
                  )}
                  {["COMPLETED", "PENDING_FEEDBACK"].includes(selected.status) && (
                    <Button size="sm" variant="outline" onClick={() => setDecideOpen(true)}>
                      Record decision
                    </Button>
                  )}
                  {!["COMPLETED", "CANCELLED", "NO_SHOW"].includes(selected.status) && (
                    <Button size="sm" variant="outline" onClick={() => setCancelOpen(true)}>
                      Cancel round
                    </Button>
                  )}
                </div>
              )}

              <Tabs defaultValue="panel" className="mt-6">
                <TabsList>
                  <TabsTrigger value="panel">Panel</TabsTrigger>
                  <TabsTrigger value="scorecards">Scorecards</TabsTrigger>
                  <TabsTrigger value="feedback">Candidate Feedback</TabsTrigger>
                </TabsList>
                <TabsContent value="panel" className="mt-4">
                  <PanelTab roundId={selected.id} canWrite={canWrite} />
                </TabsContent>
                <TabsContent value="scorecards" className="mt-4">
                  <ScorecardsTab
                    roundId={selected.id}
                    canSubmit={has("INTERVIEW_SUBMIT_SCORECARD")}
                  />
                </TabsContent>
                <TabsContent value="feedback" className="mt-4">
                  <FeedbackTab roundId={selected.id} canWrite={canWrite} />
                </TabsContent>
              </Tabs>
            </>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={scheduleOpen !== null} onOpenChange={(o) => !o && setScheduleOpen(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {scheduleOpen === "schedule" ? "Schedule" : "Reschedule"} interview
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <Input
                type="datetime-local"
                value={scheduleStart}
                onChange={(e) => setScheduleStart(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <Input
                type="datetime-local"
                value={scheduleEnd}
                onChange={(e) => setScheduleEnd(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleOpen(null)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void doSchedule()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Cancel round</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>
              Reason<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Textarea value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)} disabled={busy}>
              Back
            </Button>
            <Button variant="destructive" onClick={() => void doCancel()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Cancel round
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={decideOpen} onOpenChange={setDecideOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record round decision</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Decision</Label>
              <Select value={decision} onValueChange={(v) => setDecision(v as InterviewDecision)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PROCEED">Proceed</SelectItem>
                  <SelectItem value="HOLD">Hold</SelectItem>
                  <SelectItem value="REJECT">Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea value={decisionNotes} onChange={(e) => setDecisionNotes(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDecideOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void doDecide()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PanelTab({ roundId, canWrite }: { roundId: string; canWrite: boolean }) {
  const [rows, setRows] = useState<InterviewParticipantDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [role, setRole] = useState<InterviewParticipantRole>("INTERVIEWER");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setRows(await interviewPanelApi.list(roundId));
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const add = async () => {
    if (!employeeId.trim()) {
      toast.error("Employee ID is required");
      return;
    }
    setBusy(true);
    try {
      await interviewPanelApi.add(roundId, { employeeId: employeeId.trim(), role });
      toast.success("Panelist added");
      setAddOpen(false);
      setEmployeeId("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add panelist.");
    } finally {
      setBusy(false);
    }
  };

  const updateAttendance = async (
    participantId: string,
    attendance: InterviewParticipantAttendance,
  ) => {
    try {
      await interviewPanelApi.updateAttendance(participantId, attendance);
      toast.success("Attendance updated");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update attendance.");
    }
  };

  const remove = async (participantId: string) => {
    try {
      await interviewPanelApi.remove(participantId);
      toast.success("Panelist removed");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove panelist.");
    }
  };

  return (
    <div className="space-y-3">
      {canWrite && (
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <UserPlus className="h-4 w-4" />
          Add panelist
        </Button>
      )}
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No panelists"
          description="No one has been added to this round's panel yet."
        />
      ) : (
        <div className="space-y-2">
          {rows.map((p) => (
            <Card key={p.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-2 p-3">
                <div className="text-sm">
                  <div className="font-mono text-xs">{p.employeeId}</div>
                  <div className="text-muted-foreground">{p.role}</div>
                </div>
                <div className="flex items-center gap-2">
                  {canWrite ? (
                    <Select
                      value={p.attendance}
                      onValueChange={(v) =>
                        void updateAttendance(p.id, v as InterviewParticipantAttendance)
                      }
                    >
                      <SelectTrigger className="h-8 w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INTERVIEW_PARTICIPANT_ATTENDANCE.map((a) => (
                          <SelectItem key={a} value={a}>
                            {a}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <StatusChip tone="neutral">{p.attendance}</StatusChip>
                  )}
                  {canWrite && (
                    <Button variant="ghost" size="icon" onClick={() => void remove(p.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add panelist</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Employee ID</Label>
              <Input value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as InterviewParticipantRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INTERVIEW_PARTICIPANT_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void add()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ScorecardsTab({ roundId, canSubmit }: { roundId: string; canSubmit: boolean }) {
  const [summary, setSummary] = useState<RoundScorecardSummaryDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [interviewerId, setInterviewerId] = useState("");
  const [rating, setRating] = useState("3");
  const [recommendation, setRecommendation] = useState<ScorecardRecommendation>("HIRE");
  const [strengths, setStrengths] = useState("");
  const [weaknesses, setWeaknesses] = useState("");
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setSummary(await interviewScorecardApi.summary(roundId));
    } catch {
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const submit = async () => {
    if (!interviewerId.trim()) {
      toast.error("Interviewer ID is required");
      return;
    }
    setBusy(true);
    try {
      await interviewScorecardApi.submit(roundId, {
        interviewerId: interviewerId.trim(),
        overallRating: rating ? Number(rating) : undefined,
        recommendation,
        strengths: strengths.trim() || undefined,
        weaknesses: weaknesses.trim() || undefined,
        comments: comments.trim() || undefined,
      });
      toast.success("Scorecard submitted");
      setFormOpen(false);
      setStrengths("");
      setWeaknesses("");
      setComments("");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit scorecard.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {canSubmit && (
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Submit scorecard
        </Button>
      )}
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : !summary || summary.submittedCount === 0 ? (
        <EmptyState
          title="No scorecards yet"
          description="No interviewer has submitted a scorecard yet."
        />
      ) : (
        <div className="space-y-3">
          <Card>
            <CardContent className="grid grid-cols-2 gap-3 p-4 text-sm sm:grid-cols-3">
              <div>
                <div className="text-xs text-muted-foreground">Submitted</div>
                <div className="font-semibold">{summary.submittedCount}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Avg rating</div>
                <div className="font-semibold">{summary.averageRating?.toFixed(1) ?? "—"}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Leans</div>
                <StatusChip tone={summary.leansHire ? "success" : "danger"}>
                  {summary.leansHire ? "Hire" : "No hire"}
                </StatusChip>
              </div>
            </CardContent>
          </Card>
          {summary.scorecards.map((sc) => (
            <Card key={sc.id}>
              <CardContent className="p-4 text-sm">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-xs">{sc.interviewerId}</span>
                  <StatusChip tone="info">{sc.recommendation.replace(/_/g, " ")}</StatusChip>
                  {sc.overallRating !== undefined && (
                    <span className="text-xs text-muted-foreground">Rating {sc.overallRating}</span>
                  )}
                </div>
                {sc.strengths && <p className="text-muted-foreground">Strengths: {sc.strengths}</p>}
                {sc.weaknesses && (
                  <p className="text-muted-foreground">Weaknesses: {sc.weaknesses}</p>
                )}
                {sc.comments && <p className="text-muted-foreground">{sc.comments}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Submit scorecard</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Interviewer (employee ID)</Label>
              <Input value={interviewerId} onChange={(e) => setInterviewerId(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Overall rating (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={rating}
                  onChange={(e) => setRating(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Recommendation</Label>
                <Select
                  value={recommendation}
                  onValueChange={(v) => setRecommendation(v as ScorecardRecommendation)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SCORECARD_RECOMMENDATIONS.map((r) => (
                      <SelectItem key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Strengths</Label>
              <Textarea value={strengths} onChange={(e) => setStrengths(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Weaknesses</Label>
              <Textarea value={weaknesses} onChange={(e) => setWeaknesses(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Comments</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FeedbackTab({ roundId, canWrite }: { roundId: string; canWrite: boolean }) {
  const [feedback, setFeedback] = useState<CandidateInterviewFeedbackDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [ratingExperience, setRatingExperience] = useState("4");
  const [ratingProcess, setRatingProcess] = useState("4");
  const [wouldReapply, setWouldReapply] = useState(true);
  const [comments, setComments] = useState("");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setFeedback(await candidateInterviewFeedbackApi.get(roundId));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roundId]);

  const submit = async () => {
    setBusy(true);
    try {
      await candidateInterviewFeedbackApi.submit(roundId, {
        ratingExperience: ratingExperience ? Number(ratingExperience) : undefined,
        ratingProcess: ratingProcess ? Number(ratingProcess) : undefined,
        wouldReapply,
        comments: comments.trim() || undefined,
      });
      toast.success("Candidate feedback recorded");
      setFormOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit feedback.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3">
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : feedback ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Candidate feedback</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm text-muted-foreground">
            <div>Experience rating: {feedback.ratingExperience ?? "—"}</div>
            <div>Process rating: {feedback.ratingProcess ?? "—"}</div>
            <div>Would reapply: {feedback.wouldReapply ? "Yes" : "No"}</div>
            {feedback.comments && <div>{feedback.comments}</div>}
          </CardContent>
        </Card>
      ) : (
        <EmptyState
          title="No candidate feedback yet"
          description="The candidate hasn't submitted post-interview feedback yet."
        />
      )}
      {canWrite && !feedback && (
        <Button size="sm" variant="outline" onClick={() => setFormOpen(true)}>
          <Plus className="h-4 w-4" />
          Record on behalf of candidate
        </Button>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Record candidate feedback</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Experience (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingExperience}
                  onChange={(e) => setRatingExperience(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Process (1-5)</Label>
                <Input
                  type="number"
                  min={1}
                  max={5}
                  value={ratingProcess}
                  onChange={(e) => setRatingProcess(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Would reapply?</Label>
              <Select
                value={wouldReapply ? "yes" : "no"}
                onValueChange={(v) => setWouldReapply(v === "yes")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">Yes</SelectItem>
                  <SelectItem value="no">No</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Comments</Label>
              <Textarea value={comments} onChange={(e) => setComments(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void submit()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TemplatesTab({
  companyId,
  templates,
  loading,
  reload,
  canWrite,
  canDelete,
}: {
  companyId: string | undefined;
  templates: InterviewTemplateDto[];
  loading: boolean;
  reload: () => Promise<void>;
  canWrite: boolean;
  canDelete: boolean;
}) {
  const [form, setForm] = useState<{
    code: string;
    name: string;
    description: string;
    interviewType: InterviewType;
    defaultDurationMinutes: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!form || !companyId) return;
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      await interviewTemplateApi.create({
        companyId,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        interviewType: form.interviewType,
        defaultDurationMinutes: Number(form.defaultDurationMinutes) || 60,
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
      await interviewTemplateApi.remove(id);
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
              description: "",
              interviewType: "TECHNICAL",
              defaultDurationMinutes: "60",
            })
          }
          disabled={!companyId}
        >
          <Plus className="h-4 w-4" />
          New template
        </Button>
      )}
      {loading ? (
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      ) : templates.length === 0 ? (
        <EmptyState title="No templates yet" description="Create a reusable interview template." />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Duration</TableHead>
                <TableHead>Status</TableHead>
                {canDelete && <TableHead className="w-12" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {templates.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="font-mono text-xs">{t.code}</TableCell>
                  <TableCell className="text-sm">{t.name}</TableCell>
                  <TableCell className="text-sm">{t.interviewType.replace(/_/g, " ")}</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {t.defaultDurationMinutes}m
                  </TableCell>
                  <TableCell>
                    <StatusChip tone={t.active ? "success" : "neutral"}>
                      {t.active ? "Active" : "Inactive"}
                    </StatusChip>
                  </TableCell>
                  {canDelete && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => void remove(t.id)}>
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
            <DialogTitle>New interview template</DialogTitle>
          </DialogHeader>
          {form && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.interviewType}
                  onValueChange={(v) => setForm({ ...form, interviewType: v as InterviewType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INTERVIEW_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Default duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.defaultDurationMinutes}
                  onChange={(e) => setForm({ ...form, defaultDurationMinutes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
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
