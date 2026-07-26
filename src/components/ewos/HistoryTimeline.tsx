import { EmptyState } from "@/components/ewos/EmptyState";

export type HistoryEntry = {
  id: string;
  occurredAt: string;
  actor?: string;
  action: string;
  notes?: string;
};

// Sprint 2.5, §9.4 — one reusable chronological list renderer parameterized
// over the three history shapes (workflow transitions, data-exchange status
// changes, employee identity link actions); each call site maps its own DTO
// into this shape. Read-only, loads on-demand per subject ID.
export function HistoryTimeline({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) {
    return (
      <EmptyState title="No history yet" description="Nothing has happened for this subject yet." />
    );
  }

  return (
    <ol className="space-y-3">
      {entries.map((e) => (
        <li key={e.id} className="rounded-md border border-border p-3 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-medium text-foreground">{e.action}</span>
            <span className="shrink-0 text-xs text-muted-foreground">
              {new Date(e.occurredAt).toLocaleString()}
            </span>
          </div>
          {e.actor && <div className="mt-0.5 text-xs text-muted-foreground">By {e.actor}</div>}
          {e.notes && <p className="mt-1 text-sm text-muted-foreground">{e.notes}</p>}
        </li>
      ))}
    </ol>
  );
}
