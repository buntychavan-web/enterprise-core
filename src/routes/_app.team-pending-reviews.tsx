import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ClipboardCheck, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Toolbar } from "@/components/ewos/Toolbar";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  performanceSelfServiceApi,
  resourceApi,
  type AppraisalDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/team-pending-reviews")({
  head: () => ({
    meta: [{ title: "Pending Reviews — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TeamPendingReviewsPage,
});

type EmployeeOption = ResourceRecord & {
  id: string;
  displayName?: string;
  employeeNumber?: string;
};

function employeeLabel(id: string, employees: EmployeeOption[]): string {
  const e = employees.find((x) => x.id === id);
  if (!e) return id;
  return e.displayName ? `${e.displayName}${e.employeeNumber ? ` (${e.employeeNumber})` : ""}` : id;
}

function TeamPendingReviewsPage() {
  const { apiOptions } = useTenant();
  const [appraisals, setAppraisals] = useState<AppraisalDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    performanceSelfServiceApi
      .pendingManagerReview()
      .then((data) => !cancelled && setAppraisals(data))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load pending reviews.");
      })
      .finally(() => !cancelled && setLoading(false));
    resourceApi<EmployeeOption>("/employees", apiOptions)
      .list()
      .then((r) => !cancelled && setEmployees(r.items))
      .catch(() => !cancelled && setEmployees([]));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = appraisals.filter((a) =>
    employeeLabel(a.employeeId, employees).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Team Performance"
        title="Pending Reviews"
        description="Appraisals from your direct reports awaiting your manager review."
      />

      <div className="rounded-lg border border-border bg-card">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by employee…"
        />
        {loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : error ? (
          <EmptyState title="Couldn't load pending reviews" description={error} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ClipboardCheck}
            title="Nothing pending"
            description="No appraisals from your team are currently awaiting your review."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Employee</TableHead>
                  <TableHead>Self rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="text-sm font-medium">
                      {employeeLabel(a.employeeId, employees)}
                    </TableCell>
                    <TableCell className="text-sm tabular-nums text-muted-foreground">
                      {a.selfRating ?? "—"}
                    </TableCell>
                    <TableCell>
                      <AppraisalStatusChip status={a.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <Link
                        to="/manager-review/$id"
                        params={{ id: a.id }}
                        className="text-sm text-primary hover:underline"
                      >
                        Review
                      </Link>
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
