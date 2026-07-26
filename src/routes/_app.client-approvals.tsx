import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, ClipboardCheck, Loader2, RefreshCw, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ApiError,
  workflowApi,
  type WorkflowInstanceDto,
  type WorkflowTaskDto,
} from "@/lib/api-client";

// Sprint 14.3 — Client Approval screens. Reuses the existing generic Workflow engine end to end:
// no bespoke "approval" backend, just the standard Task API filtered to the CLIENT_ADMIN role —
// the same role both the Client Onboarding and Payroll Client Approval workflow definitions
// (migration V36) require on their APPROVE/REJECT transitions. Completing a task drives the
// workflow instance forward; for Payroll runs, reaching APPROVED automatically finalizes the run
// (see PayrollApprovalWorkflowListener) with zero UI-side plumbing.

export const Route = createFileRoute("/_app/client-approvals")({
  head: () => ({
    meta: [{ title: "Client Approvals — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: ClientApprovalsPage,
});

const APPROVER_ROLE = "CLIENT_ADMIN";

type Row = WorkflowTaskDto & { instance?: WorkflowInstanceDto };

function ClientApprovalsPage() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const tasks = await workflowApi.tasksByRole(APPROVER_ROLE);
      const withInstances = await Promise.all(
        tasks.map(async (t) => {
          try {
            const instance = await workflowApi.getInstance(t.instanceId);
            return { ...t, instance };
          } catch {
            return { ...t };
          }
        }),
      );
      setRows(withInstances);
      setUnavailable(false);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setUnavailable(true);
      } else {
        toast.error(err instanceof ApiError ? err.message : "Failed to load approvals.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const decide = async (taskId: string, actionCode: "APPROVE" | "REJECT") => {
    setBusyId(taskId);
    try {
      await workflowApi.completeTask(taskId, { actionCode, outcomeCode: actionCode });
      toast.success(actionCode === "APPROVE" ? "Approved" : "Rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Outsourcing"
        title="Client Approvals"
        description="Pending Client Onboarding and Payroll Client Approval decisions, assigned to the CLIENT_ADMIN role."
        actions={
          <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : unavailable ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Coming soon"
            description="The workflow tasks endpoint is not yet available on the backend."
          />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing pending"
            description="No Client Onboarding or Payroll Client Approval decisions are waiting on you right now."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Current state</TableHead>
                  <TableHead>Task status</TableHead>
                  <TableHead className="w-48 text-right">Decision</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-sm">{r.instance?.definitionCode ?? "—"}</TableCell>
                    <TableCell className="text-sm font-mono text-xs">
                      {r.instance ? `${r.instance.subjectType}:${r.instance.subjectId}` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">{r.stateCode}</TableCell>
                    <TableCell>
                      <StatusChip tone={r.status === "CLAIMED" ? "info" : "neutral"}>
                        {r.status}
                      </StatusChip>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, "APPROVE")}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Approve
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled={busyId === r.id}
                          onClick={() => void decide(r.id, "REJECT")}
                        >
                          <XCircle className="h-4 w-4" />
                          Reject
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
