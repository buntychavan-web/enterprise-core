import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Toolbar } from "@/components/ewos/Toolbar";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
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
  ApiError,
  APPRAISAL_STATUSES,
  performanceSelfServiceApi,
  type AppraisalDto,
  type AppraisalStatus,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-appraisal-history")({
  head: () => ({
    meta: [{ title: "Appraisal History — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyAppraisalHistoryPage,
});

function MyAppraisalHistoryPage() {
  const [appraisals, setAppraisals] = useState<AppraisalDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<AppraisalStatus | "ALL">("ALL");

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .myAppraisals()
      .then((data) => !cancelled && setAppraisals(data))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load your appraisal history.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = appraisals
    .filter((a) => statusFilter === "ALL" || a.status === statusFilter)
    .filter((a) => !search || (a.finalBand ?? "").toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="Appraisal History"
        description="Every appraisal you've had, across every cycle."
      />

      <div className="rounded-lg border border-border bg-card">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by final band…"
          filters={
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as AppraisalStatus | "ALL")}
            >
              <SelectTrigger className="h-9 w-44" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {APPRAISAL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s.replace(/_/g, " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        {loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load your appraisal history" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ScrollText}
            title={appraisals.length === 0 ? "No appraisal history yet" : "No matches"}
            description={
              appraisals.length === 0
                ? "You have no appraisals on record yet."
                : "Try a different search or filter."
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Self</TableHead>
                  <TableHead>Manager</TableHead>
                  <TableHead>Reviewer</TableHead>
                  <TableHead>Final</TableHead>
                  <TableHead>Band</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <AppraisalStatusChip status={a.status} />
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {a.selfRating ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {a.managerRating ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm text-muted-foreground">
                      {a.reviewerRating ?? "—"}
                    </TableCell>
                    <TableCell className="tabular-nums text-sm">{a.finalRating ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {a.finalBand ?? "—"}
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
