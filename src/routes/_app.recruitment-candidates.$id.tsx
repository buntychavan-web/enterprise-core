import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  ShieldCheck,
  StickyNote,
  Tag as TagIcon,
} from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequirePermission, usePermissions } from "@/lib/permissions";
import {
  ApiError,
  CANDIDATE_CONSENT_SOURCES,
  CANDIDATE_STATUSES,
  COMMUNICATION_CHANNELS,
  candidateApi,
  candidateCommunicationApi,
  candidateDocumentApi,
  candidateNoteApi,
  candidateResumeApi,
  candidateTagApi,
  candidateTimelineApi,
  DOCUMENT_TYPES,
  jobApplicationApi,
  NOTE_TYPES,
  type CandidateCommunicationDto,
  type CandidateConsentSource,
  type CandidateDocumentDto,
  type CandidateDto,
  type CandidateNoteDto,
  type CandidateResumeDto,
  type CandidateStatus,
  type CandidateTagDto,
  type CandidateTimelineEventDto,
  type CommunicationChannel,
  type DocumentType,
  type JobApplicationDto,
  type NoteType,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment-candidates/$id")({
  head: ({ params }) => ({
    meta: [
      { title: `Candidate ${params.id} — EWOS Recruitment` },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CandidateDetailPage,
});

const STATUS_TONE: Record<CandidateStatus, StatusTone> = {
  NEW: "info",
  ACTIVE: "success",
  ENGAGED: "info",
  HIRED: "success",
  ARCHIVED: "neutral",
  BLACKLISTED: "danger",
};

function CandidateDetailPage() {
  const { id } = Route.useParams();
  const { has } = usePermissions();
  const [candidate, setCandidate] = useState<CandidateDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [resumes, setResumes] = useState<CandidateResumeDto[]>([]);
  const [documents, setDocuments] = useState<CandidateDocumentDto[]>([]);
  const [notes, setNotes] = useState<CandidateNoteDto[]>([]);
  const [tags, setTags] = useState<CandidateTagDto[]>([]);
  const [comms, setComms] = useState<CandidateCommunicationDto[]>([]);
  const [timeline, setTimeline] = useState<CandidateTimelineEventDto[]>([]);
  const [applications, setApplications] = useState<JobApplicationDto[]>([]);
  const [subLoading, setSubLoading] = useState(true);

  const [statusDialog, setStatusDialog] = useState(false);
  const [nextStatus, setNextStatus] = useState<CandidateStatus>("ACTIVE");
  const [statusReason, setStatusReason] = useState("");
  const [consentDialog, setConsentDialog] = useState(false);
  const [consentGiven, setConsentGiven] = useState(true);
  const [consentSource, setConsentSource] = useState<CandidateConsentSource>("MANUAL_ENTRY");
  const [busy, setBusy] = useState(false);

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteType, setNoteType] = useState<NoteType>("GENERAL");
  const [noteBody, setNoteBody] = useState("");
  const [notePrivate, setNotePrivate] = useState(false);

  const [tagDialog, setTagDialog] = useState(false);
  const [tagValue, setTagValue] = useState("");

  const [commDialog, setCommDialog] = useState(false);
  const [commChannel, setCommChannel] = useState<CommunicationChannel>("EMAIL");
  const [commDirection, setCommDirection] = useState<"INBOUND" | "OUTBOUND">("OUTBOUND");
  const [commSubject, setCommSubject] = useState("");
  const [commSummary, setCommSummary] = useState("");

  const [resumeDialog, setResumeDialog] = useState(false);
  const [resumeUri, setResumeUri] = useState("");
  const [resumeFilename, setResumeFilename] = useState("");

  const [docDialog, setDocDialog] = useState(false);
  const [docType, setDocType] = useState<DocumentType>("OTHER");
  const [docUri, setDocUri] = useState("");
  const [docFilename, setDocFilename] = useState("");

  const loadCandidate = async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const data = await candidateApi.getById(id);
      setCandidate(data);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) setNotFound(true);
      else setError(err instanceof ApiError ? err.message : "Failed to load candidate.");
    } finally {
      setLoading(false);
    }
  };

  const loadSubResources = async () => {
    setSubLoading(true);
    try {
      const [r, d, n, t, c, tl, apps] = await Promise.all([
        candidateResumeApi.list(id),
        candidateDocumentApi.list(id),
        candidateNoteApi.list(id),
        candidateTagApi.list(id),
        candidateCommunicationApi.list(id),
        candidateTimelineApi.forCandidate(id),
        jobApplicationApi.byCandidate(id),
      ]);
      setResumes(r);
      setDocuments(d);
      setNotes(n);
      setTags(t);
      setComms(c);
      setTimeline(tl);
      setApplications(apps);
    } catch {
      // sub-resource load failures degrade to empty-state tabs, not a page-level error
    } finally {
      setSubLoading(false);
    }
  };

  useEffect(() => {
    void loadCandidate();
    void loadSubResources();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const changeStatus = async () => {
    setBusy(true);
    try {
      await candidateApi.changeStatus(id, nextStatus, statusReason.trim() || undefined);
      toast.success("Status updated");
      setStatusDialog(false);
      setStatusReason("");
      await Promise.all([loadCandidate(), loadSubResources()]);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setBusy(false);
    }
  };

  const recordConsent = async () => {
    setBusy(true);
    try {
      await candidateApi.recordConsent(id, { consentGiven, consentSource });
      toast.success(consentGiven ? "Consent recorded" : "Consent withdrawn");
      setConsentDialog(false);
      await loadCandidate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to record consent.");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!noteBody.trim()) {
      toast.error("Note body is required");
      return;
    }
    setBusy(true);
    try {
      await candidateNoteApi.add(id, { noteType, body: noteBody.trim(), privateNote: notePrivate });
      toast.success("Note added");
      setNoteDialog(false);
      setNoteBody("");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add note.");
    } finally {
      setBusy(false);
    }
  };

  const addTag = async () => {
    if (!tagValue.trim()) {
      toast.error("Tag is required");
      return;
    }
    setBusy(true);
    try {
      await candidateTagApi.add(id, tagValue.trim());
      toast.success("Tag added");
      setTagDialog(false);
      setTagValue("");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add tag.");
    } finally {
      setBusy(false);
    }
  };

  const removeTag = async (tag: string) => {
    try {
      await candidateTagApi.remove(id, tag);
      toast.success("Tag removed");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to remove tag.");
    }
  };

  const logComm = async () => {
    setBusy(true);
    try {
      await candidateCommunicationApi.log(id, {
        channel: commChannel,
        direction: commDirection,
        subject: commSubject.trim() || undefined,
        bodySummary: commSummary.trim() || undefined,
      });
      toast.success("Communication logged");
      setCommDialog(false);
      setCommSubject("");
      setCommSummary("");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to log communication.");
    } finally {
      setBusy(false);
    }
  };

  const uploadResume = async () => {
    if (!resumeUri.trim() || !resumeFilename.trim()) {
      toast.error("Filename and storage URI are required");
      return;
    }
    setBusy(true);
    try {
      await candidateResumeApi.upload(id, {
        filename: resumeFilename.trim(),
        mimeType: "application/pdf",
        sizeBytes: 0,
        storageUri: resumeUri.trim(),
      });
      toast.success("Resume added");
      setResumeDialog(false);
      setResumeUri("");
      setResumeFilename("");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add resume.");
    } finally {
      setBusy(false);
    }
  };

  const markPrimary = async (resumeId: string) => {
    try {
      await candidateResumeApi.markPrimary(resumeId);
      toast.success("Marked as primary resume");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update resume.");
    }
  };

  const uploadDoc = async () => {
    if (!docUri.trim() || !docFilename.trim()) {
      toast.error("Filename and storage URI are required");
      return;
    }
    setBusy(true);
    try {
      await candidateDocumentApi.upload(id, {
        documentType: docType,
        filename: docFilename.trim(),
        mimeType: "application/octet-stream",
        sizeBytes: 0,
        storageUri: docUri.trim(),
      });
      toast.success("Document added");
      setDocDialog(false);
      setDocUri("");
      setDocFilename("");
      await loadSubResources();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add document.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/recruitment-candidates">
            <ArrowLeft className="h-4 w-4" />
            Back to Candidates
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : notFound ? (
        <EmptyState title="Candidate not found" description={`No candidate with id "${id}".`} />
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : candidate ? (
        <>
          <PageHeader
            eyebrow={candidate.candidateNumber}
            title={`${candidate.firstName} ${candidate.lastName}`}
            description={[
              candidate.currentDesignation,
              candidate.currentEmployer,
              candidate.currentLocation,
            ]
              .filter(Boolean)
              .join(" · ")}
            actions={
              <div className="flex flex-wrap items-center gap-2">
                <StatusChip tone={STATUS_TONE[candidate.status]}>{candidate.status}</StatusChip>
                <RequirePermission code="ATS_WRITE">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setNextStatus(candidate.status);
                      setStatusDialog(true);
                    }}
                  >
                    Change status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setConsentGiven(!candidate.consentGiven);
                      setConsentDialog(true);
                    }}
                  >
                    <ShieldCheck className="h-4 w-4" />
                    {candidate.consentGiven ? "Withdraw consent" : "Record consent"}
                  </Button>
                </RequirePermission>
              </div>
            }
          />

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Contact</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-4 w-4" /> {candidate.email ?? "—"}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Phone className="h-4 w-4" /> {candidate.phone ?? "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Source</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div>{candidate.source.replace(/_/g, " ")}</div>
                {candidate.sourceDetails && <div>{candidate.sourceDetails}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Compliance</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm text-muted-foreground">
                <div>Consent: {candidate.consentGiven ? "Given" : "Not given"}</div>
                {candidate.retentionExpiresAt && (
                  <div>Retention until {candidate.retentionExpiresAt.slice(0, 10)}</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="applications">
            <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
              <TabsTrigger value="applications">Applications</TabsTrigger>
              <TabsTrigger value="resumes">Resumes</TabsTrigger>
              <TabsTrigger value="documents">Documents</TabsTrigger>
              <TabsTrigger value="notes">Notes</TabsTrigger>
              <TabsTrigger value="tags">Tags</TabsTrigger>
              <TabsTrigger value="communications">Communications</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
            </TabsList>

            <TabsContent value="applications" className="mt-4">
              {subLoading ? (
                <Loading />
              ) : applications.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No applications"
                  description="This candidate hasn't applied to any requisitions yet — start one from the Pipeline screen."
                />
              ) : (
                <div className="space-y-2">
                  {applications.map((a) => (
                    <Card key={a.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-medium">{a.applicationNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            Applied {a.appliedAt.slice(0, 10)}
                          </div>
                        </div>
                        <StatusChip tone="info">{a.status.replace(/_/g, " ")}</StatusChip>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="resumes" className="mt-4 space-y-3">
              <RequirePermission code="ATS_WRITE">
                <Button size="sm" variant="outline" onClick={() => setResumeDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add resume
                </Button>
              </RequirePermission>
              {subLoading ? (
                <Loading />
              ) : resumes.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No resumes"
                  description="No resumes uploaded yet."
                />
              ) : (
                <div className="space-y-2">
                  {resumes.map((r) => (
                    <Card key={r.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-medium">{r.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            Uploaded {r.uploadedAt.slice(0, 10)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {r.primary ? (
                            <StatusChip tone="success">Primary</StatusChip>
                          ) : (
                            <RequirePermission code="ATS_WRITE">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => void markPrimary(r.id)}
                              >
                                Mark primary
                              </Button>
                            </RequirePermission>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="documents" className="mt-4 space-y-3">
              <RequirePermission code="ATS_WRITE">
                <Button size="sm" variant="outline" onClick={() => setDocDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add document
                </Button>
              </RequirePermission>
              {subLoading ? (
                <Loading />
              ) : documents.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No documents"
                  description="No documents uploaded yet."
                />
              ) : (
                <div className="space-y-2">
                  {documents.map((d) => (
                    <Card key={d.id}>
                      <CardContent className="flex items-center justify-between p-4">
                        <div>
                          <div className="text-sm font-medium">{d.filename}</div>
                          <div className="text-xs text-muted-foreground">
                            {d.documentType.replace(/_/g, " ")} · {d.uploadedAt.slice(0, 10)}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4 space-y-3">
              <RequirePermission code="ATS_WRITE">
                <Button size="sm" variant="outline" onClick={() => setNoteDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add note
                </Button>
              </RequirePermission>
              {subLoading ? (
                <Loading />
              ) : notes.length === 0 ? (
                <EmptyState
                  icon={StickyNote}
                  title="No notes"
                  description="No notes recorded yet."
                />
              ) : (
                <div className="space-y-2">
                  {notes.map((n) => (
                    <Card key={n.id}>
                      <CardContent className="p-4">
                        <div className="mb-1 flex items-center gap-2">
                          <StatusChip tone="neutral">{n.noteType}</StatusChip>
                          {n.privateNote && <StatusChip tone="warning">Private</StatusChip>}
                          <span className="ml-auto text-xs text-muted-foreground">
                            {n.createdAt.slice(0, 10)}
                          </span>
                        </div>
                        <p className="text-sm text-foreground">{n.body}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="tags" className="mt-4 space-y-3">
              <RequirePermission code="ATS_WRITE">
                <Button size="sm" variant="outline" onClick={() => setTagDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Add tag
                </Button>
              </RequirePermission>
              {subLoading ? (
                <Loading />
              ) : tags.length === 0 ? (
                <EmptyState icon={TagIcon} title="No tags" description="No tags added yet." />
              ) : (
                <div className="flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <StatusChip key={t.id} tone="neutral">
                      <button
                        type="button"
                        onClick={() => void removeTag(t.tag)}
                        className="cursor-pointer"
                        aria-label={`Remove tag ${t.tag}`}
                      >
                        {t.tag} ×
                      </button>
                    </StatusChip>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="communications" className="mt-4 space-y-3">
              <RequirePermission code="ATS_COMMUNICATE">
                <Button size="sm" variant="outline" onClick={() => setCommDialog(true)}>
                  <Plus className="h-4 w-4" />
                  Log communication
                </Button>
              </RequirePermission>
              {subLoading ? (
                <Loading />
              ) : comms.length === 0 ? (
                <EmptyState
                  icon={MessageSquare}
                  title="No communications"
                  description="No communications logged yet."
                />
              ) : (
                <div className="space-y-2">
                  {comms.map((c) => (
                    <Card key={c.id}>
                      <CardContent className="p-4">
                        <div className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
                          <StatusChip tone="info">{c.channel}</StatusChip>
                          <span>{c.direction}</span>
                          <span className="ml-auto">
                            {c.occurredAt.slice(0, 16).replace("T", " ")}
                          </span>
                        </div>
                        {c.subject && <div className="text-sm font-medium">{c.subject}</div>}
                        {c.bodySummary && (
                          <p className="mt-1 text-sm text-muted-foreground">{c.bodySummary}</p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              {subLoading ? (
                <Loading />
              ) : timeline.length === 0 ? (
                <EmptyState
                  title="No activity yet"
                  description="Nothing has happened on this candidate yet."
                />
              ) : (
                <ul className="space-y-3 border-l border-border pl-4">
                  {timeline.map((e) => (
                    <li key={e.id} className="relative">
                      <span className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-primary" />
                      <div className="text-sm text-foreground">{e.eventSummary}</div>
                      <div className="text-xs text-muted-foreground">
                        {e.occurredAt.slice(0, 16).replace("T", " ")}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </>
      ) : null}

      <Dialog open={statusDialog} onOpenChange={setStatusDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>New status</Label>
              <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as CandidateStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Reason (optional)</Label>
              <Textarea value={statusReason} onChange={(e) => setStatusReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStatusDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void changeStatus()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={consentDialog} onOpenChange={setConsentDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{consentGiven ? "Record consent" : "Withdraw consent"}</DialogTitle>
          </DialogHeader>
          {consentGiven && (
            <div className="space-y-1.5">
              <Label>Consent source</Label>
              <Select
                value={consentSource}
                onValueChange={(v) => setConsentSource(v as CandidateConsentSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CANDIDATE_CONSENT_SOURCES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setConsentDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void recordConsent()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add note</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={noteType} onValueChange={(v) => setNoteType(v as NoteType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {NOTE_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>
                Note<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Textarea value={noteBody} onChange={(e) => setNoteBody(e.target.value)} rows={4} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="note-private"
                checked={notePrivate}
                onCheckedChange={(c) => setNotePrivate(c === true)}
              />
              <Label htmlFor="note-private">Private note</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void addNote()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={tagDialog} onOpenChange={setTagDialog}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>Add tag</DialogTitle>
          </DialogHeader>
          <Input
            value={tagValue}
            onChange={(e) => setTagValue(e.target.value)}
            placeholder="e.g. react"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setTagDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void addTag()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={commDialog} onOpenChange={setCommDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Log communication</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Channel</Label>
              <Select
                value={commChannel}
                onValueChange={(v) => setCommChannel(v as CommunicationChannel)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMMUNICATION_CHANNELS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Direction</Label>
              <Select
                value={commDirection}
                onValueChange={(v) => setCommDirection(v as "INBOUND" | "OUTBOUND")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUTBOUND">Outbound</SelectItem>
                  <SelectItem value="INBOUND">Inbound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Subject</Label>
              <Input value={commSubject} onChange={(e) => setCommSubject(e.target.value)} />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label>Summary</Label>
              <Textarea value={commSummary} onChange={(e) => setCommSummary(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCommDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void logComm()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={resumeDialog} onOpenChange={setResumeDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add resume</DialogTitle>
            <DialogDescription>
              Reference an already-uploaded file by its storage URI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Filename</Label>
              <Input value={resumeFilename} onChange={(e) => setResumeFilename(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Storage URI</Label>
              <Input value={resumeUri} onChange={(e) => setResumeUri(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResumeDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void uploadResume()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={docDialog} onOpenChange={setDocDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add document</DialogTitle>
            <DialogDescription>
              Reference an already-uploaded file by its storage URI.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={docType} onValueChange={(v) => setDocType(v as DocumentType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOCUMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Filename</Label>
              <Input value={docFilename} onChange={(e) => setDocFilename(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Storage URI</Label>
              <Input value={docUri} onChange={(e) => setDocUri(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocDialog(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={() => void uploadDoc()} disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Loading() {
  return (
    <div className="grid place-items-center p-10 text-sm text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}
