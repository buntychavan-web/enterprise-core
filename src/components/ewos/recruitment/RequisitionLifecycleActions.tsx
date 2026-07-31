import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  CircleSlash,
  Loader2,
  Lock,
  MoreHorizontal,
  PauseCircle,
  PlayCircle,
  Send,
  UserCheck,
  XCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useRecruitmentAccess } from "@/hooks/use-recruitment-access";
import {
  jobRequisitionsApi,
  recruitmentWorkflowApi,
  requisitionActions,
  type JobRequisitionResponse,
} from "@/lib/recruitment-api";

type PromptKind = "submit" | "approve" | "reject" | "fill" | "close" | "cancel" | null;

/**
 * Lifecycle controls for a single requisition, gated by backend permissions
 * (RECRUITMENT_WRITE / RECRUITMENT_APPROVE) and the state machine in
 * `RequisitionPolicy`.
 */
export function RequisitionLifecycleActions({
  requisition,
  variant = "menu",
}: {
  requisition: JobRequisitionResponse;
  variant?: "menu" | "buttons";
}) {
  const qc = useQueryClient();
  const { canWrite, canApprove } = useRecruitmentAccess();
  const [prompt, setPrompt] = useState<PromptKind>(null);
  const [notes, setNotes] = useState("");
  const [fills, setFills] = useState("1");
  const [workflowId, setWorkflowId] = useState<string>("");

  const status = requisition.status;
  const remaining = Math.max(0, (requisition.headcount ?? 0) - (requisition.filledCount ?? 0));

  const workflows = useQuery({
    queryKey: ["recruitment", "workflow-definitions"],
    queryFn: ({ signal }) => recruitmentWorkflowApi.definitions(signal),
    enabled: prompt === "submit",
  });

  const run = useMutation({
    mutationFn: async (kind: Exclude<PromptKind, null> | "open" | "hold" | "resume") => {
      switch (kind) {
        case "submit":
          return jobRequisitionsApi.submit(requisition.id, workflowId);
        case "approve":
          return jobRequisitionsApi.approve(requisition.id, notes || undefined);
        case "reject":
          return jobRequisitionsApi.reject(requisition.id, notes || undefined);
        case "open":
          return jobRequisitionsApi.open(requisition.id);
        case "hold":
          return jobRequisitionsApi.hold(requisition.id);
        case "resume":
          return jobRequisitionsApi.resume(requisition.id);
        case "fill":
          return jobRequisitionsApi.fill(requisition.id, Number(fills) || 1);
        case "close":
          return jobRequisitionsApi.close(requisition.id, notes);
        case "cancel":
          return jobRequisitionsApi.cancel(requisition.id, notes);
      }
    },
    onSuccess: () => {
      toast.success("Requisition updated");
      qc.invalidateQueries({ queryKey: ["recruitment"] });
      setPrompt(null);
      setNotes("");
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "The action could not be completed"),
  });

  const items = [
    {
      key: "submit" as const,
      label: "Submit for approval",
      icon: Send,
      show: canWrite && requisitionActions.submittable(status),
      onSelect: () => setPrompt("submit"),
    },
    {
      key: "approve" as const,
      label: "Approve",
      icon: CheckCircle2,
      show: canApprove && requisitionActions.decidable(status),
      onSelect: () => setPrompt("approve"),
    },
    {
      key: "reject" as const,
      label: "Reject",
      icon: XCircle,
      show: canApprove && requisitionActions.decidable(status),
      onSelect: () => setPrompt("reject"),
    },
    {
      key: "open" as const,
      label: "Open for hiring",
      icon: PlayCircle,
      show: canWrite && requisitionActions.openable(status),
      onSelect: () => run.mutate("open"),
    },
    {
      key: "hold" as const,
      label: "Put on hold",
      icon: PauseCircle,
      show: canWrite && requisitionActions.holdable(status),
      onSelect: () => run.mutate("hold"),
    },
    {
      key: "resume" as const,
      label: "Resume hiring",
      icon: PlayCircle,
      show: canWrite && requisitionActions.resumable(status),
      onSelect: () => run.mutate("resume"),
    },
    {
      key: "fill" as const,
      label: "Record fill",
      icon: UserCheck,
      show: canWrite && requisitionActions.fillable(status) && remaining > 0,
      onSelect: () => {
        setFills("1");
        setPrompt("fill");
      },
    },
    {
      key: "close" as const,
      label: "Close requisition",
      icon: Lock,
      show: canWrite && requisitionActions.closeable(status),
      onSelect: () => setPrompt("close"),
    },
    {
      key: "cancel" as const,
      label: "Cancel requisition",
      icon: Ban,
      show: canWrite && requisitionActions.cancellable(status),
      onSelect: () => setPrompt("cancel"),
    },
  ].filter((i) => i.show);

  const dialog = (() => {
    if (!prompt) return null;
    const config = {
      submit: {
        title: "Submit for approval",
        description: "Choose the approval workflow that should route this requisition.",
        confirm: "Submit",
      },
      approve: {
        title: "Approve requisition",
        description: "Optionally record a decision note for the audit trail.",
        confirm: "Approve",
      },
      reject: {
        title: "Reject requisition",
        description: "Optionally record why this requisition was rejected.",
        confirm: "Reject",
      },
      fill: {
        title: "Record fill",
        description: `${remaining} of ${requisition.headcount} openings still to fill.`,
        confirm: "Record",
      },
      close: {
        title: "Close requisition",
        description: "Closing is terminal. A reason is required.",
        confirm: "Close",
      },
      cancel: {
        title: "Cancel requisition",
        description: "Cancelling is terminal. A reason is required.",
        confirm: "Cancel requisition",
      },
    }[prompt];

    const needsReason = prompt === "close" || prompt === "cancel";
    const disabled =
      run.isPending ||
      (prompt === "submit" && !workflowId) ||
      (needsReason && notes.trim().length === 0);

    return (
      <Dialog open onOpenChange={(v) => !v && setPrompt(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{config.title}</DialogTitle>
            <DialogDescription>{config.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            {prompt === "submit" && (
              <div className="space-y-2">
                <Label htmlFor="wf-def">Approval workflow</Label>
                <Select value={workflowId} onValueChange={setWorkflowId}>
                  <SelectTrigger id="wf-def">
                    <SelectValue
                      placeholder={workflows.isLoading ? "Loading…" : "Select a workflow"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {(workflows.data ?? []).map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name ?? d.code ?? d.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!workflows.isLoading && (workflows.data ?? []).length === 0 && (
                  <p className="text-sm text-muted-foreground">
                    No active workflow is configured for{" "}
                    <code className="text-xs">recruitment.requisition</code>. Ask an administrator
                    to publish one before submitting.
                  </p>
                )}
              </div>
            )}

            {prompt === "fill" && (
              <div className="space-y-2">
                <Label htmlFor="fill-count">Number of fills</Label>
                <Input
                  id="fill-count"
                  type="number"
                  min={1}
                  max={remaining || 1}
                  value={fills}
                  onChange={(e) => setFills(e.target.value)}
                />
              </div>
            )}

            {prompt !== "submit" && prompt !== "fill" && (
              <div className="space-y-2">
                <Label htmlFor="decision-notes">{needsReason ? "Reason" : "Notes"}</Label>
                <Textarea
                  id="decision-notes"
                  rows={4}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={needsReason ? "Required" : "Optional"}
                />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setPrompt(null)}>
              Back
            </Button>
            <Button disabled={disabled} onClick={() => run.mutate(prompt)}>
              {run.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {config.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  })();

  if (items.length === 0) {
    return variant === "buttons" ? null : (
      <span className="inline-flex items-center text-xs text-muted-foreground">
        <CircleSlash className="mr-1 h-3.5 w-3.5" aria-hidden />
        No actions
      </span>
    );
  }

  if (variant === "buttons") {
    return (
      <>
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <Button
              key={i.key}
              size="sm"
              variant={i.key === "cancel" || i.key === "reject" ? "outline" : "default"}
              onClick={i.onSelect}
              disabled={run.isPending}
            >
              <i.icon className="mr-2 h-4 w-4" aria-hidden />
              {i.label}
            </Button>
          ))}
        </div>
        {dialog}
      </>
    );
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Actions for ${requisition.title}`}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Lifecycle</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {items.map((i) => (
            <DropdownMenuItem key={i.key} onSelect={() => i.onSelect()}>
              <i.icon className="mr-2 h-4 w-4" aria-hidden />
              {i.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      {dialog}
    </>
  );
}
