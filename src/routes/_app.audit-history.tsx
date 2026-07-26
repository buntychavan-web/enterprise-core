import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClipboardList, Loader2, Search, UserCog, Workflow as WorkflowIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HistoryTimeline, type HistoryEntry } from "@/components/ewos/HistoryTimeline";
import { cn } from "@/lib/utils";
import {
  ApiError,
  dataExchangeApi,
  employeeIdentityHistoryApi,
  workflowApi,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/audit-history")({
  head: () => ({
    meta: [{ title: "Audit History — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: AuditHistoryPage,
});

type SubView = "workflow" | "data-exchange" | "employee-identity";

const SUB_VIEWS: { key: SubView; title: string; icon: typeof WorkflowIcon; idLabel: string }[] = [
  {
    key: "workflow",
    title: "Workflow History",
    icon: WorkflowIcon,
    idLabel: "Workflow Instance ID",
  },
  {
    key: "data-exchange",
    title: "Data Exchange History",
    icon: ClipboardList,
    idLabel: "Data Exchange Record ID",
  },
  {
    key: "employee-identity",
    title: "Employee Identity Link History",
    icon: UserCog,
    idLabel: "Employee ID",
  },
];

async function loadHistory(view: SubView, id: string): Promise<HistoryEntry[]> {
  if (view === "workflow") {
    const rows = await workflowApi.historyOf(id);
    return rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt,
      actor: r.actorId,
      action: `${r.fromStateCode ?? "—"} → ${r.toStateCode} (${r.actionCode})`,
      notes: r.notes,
    }));
  }
  if (view === "data-exchange") {
    const rows = await dataExchangeApi.history(id);
    return rows.map((r) => ({
      id: r.id,
      occurredAt: r.occurredAt,
      actor: r.actorId,
      action: `${r.fromStatus ?? "—"} → ${r.toStatus}`,
      notes: r.notes,
    }));
  }
  const rows = await employeeIdentityHistoryApi.of(id);
  return rows.map((r) => ({
    id: r.id,
    occurredAt: r.occurredAt,
    actor: r.actorId,
    action:
      r.action === "LINK"
        ? `Linked to user ${r.newUserId}`
        : r.action === "UNLINK"
          ? `Unlinked from user ${r.previousUserId}`
          : `Provisioned and linked to new user ${r.newUserId}`,
    notes: r.reason,
  }));
}

function AuditHistoryPage() {
  const [active, setActive] = useState<SubView>("workflow");
  const [id, setId] = useState("");
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = SUB_VIEWS.find((v) => v.key === active)!;

  const search = async () => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    try {
      setEntries(await loadHistory(active, id.trim()));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load history.");
      setEntries(null);
    } finally {
      setLoading(false);
    }
  };

  const switchTab = (key: SubView) => {
    setActive(key);
    setEntries(null);
    setError(null);
    setId("");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Audit
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Audit History</h1>
        <p className="text-sm text-muted-foreground">
          Look up the chronological history of a workflow instance, data-exchange record, or
          employee identity link — enter the subject's ID to view it.
        </p>
      </div>

      <nav aria-label="Audit history sub-views" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {SUB_VIEWS.map((v) => {
          const Icon = v.icon;
          const isActive = v.key === active;
          return (
            <button
              key={v.key}
              type="button"
              onClick={() => switchTab(v.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {v.title}
            </button>
          );
        })}
      </nav>

      <div className="rounded-lg border border-border bg-card p-4">
        <Label htmlFor="history-id">{current.idLabel}</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="history-id"
            value={id}
            onChange={(e) => setId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="UUID"
          />
          <Button onClick={search} disabled={loading || !id.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            View history
          </Button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {entries && <HistoryTimeline entries={entries} />}
    </div>
  );
}
