import { useState } from "react";
import { Info, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, roleImpactApi, type RoleImpactResponse } from "@/lib/api-client";

// Sprint 2.3, §7.4 — Role Usage Impact Analysis panel: assigned-user count,
// company/department usage, pending workflow tasks, and the canDelete flag
// GET /roles/{id}/impact already returns (Sprint 1.4). Loads on-demand only
// (button click), not eagerly per row, to avoid an N+1-shaped burst of calls.
export function RoleImpactButton({ roleId, roleName }: { roleId: string; roleName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [impact, setImpact] = useState<RoleImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      setImpact(await roleImpactApi.of(roleId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load impact analysis.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button variant="ghost" size="icon" onClick={load} aria-label={`View impact for ${roleName}`}>
        <Info className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Usage impact — {roleName}</DialogTitle>
          <DialogDescription>Assigned users and dependencies within your tenant.</DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : impact ? (
          <div className="space-y-2 text-sm">
            <div>
              <strong>{impact.assignedUserCount}</strong> user
              {impact.assignedUserCount === 1 ? "" : "s"} currently hold this role.
            </div>
            <div>
              <strong>{impact.companies.length}</strong> compan
              {impact.companies.length === 1 ? "y" : "ies"} in use.
            </div>
            <div>
              <strong>{impact.departments.length}</strong> department
              {impact.departments.length === 1 ? "" : "s"} in use.
            </div>
            <div>
              <strong>{impact.pendingWorkflowTaskCount}</strong> pending workflow task
              {impact.pendingWorkflowTaskCount === 1 ? "" : "s"} routed to this role.
            </div>
            <div
              className={
                impact.canDelete ? "text-muted-foreground" : "font-medium text-destructive"
              }
            >
              {impact.canDelete
                ? "This role can be safely deleted."
                : "This role cannot be deleted while it is in use."}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export function impactSummary(impact: RoleImpactResponse): string {
  if (impact.canDelete) {
    return "No users, companies, or pending workflow tasks depend on this role — safe to delete.";
  }
  const parts: string[] = [];
  if (impact.assignedUserCount > 0) {
    parts.push(`${impact.assignedUserCount} user${impact.assignedUserCount === 1 ? "" : "s"}`);
  }
  if (impact.pendingWorkflowTaskCount > 0) {
    parts.push(
      `${impact.pendingWorkflowTaskCount} pending workflow task${impact.pendingWorkflowTaskCount === 1 ? "" : "s"}`,
    );
  }
  return `Cannot delete — ${parts.join(" and ")} still depend on this role. Reassign them first.`;
}
