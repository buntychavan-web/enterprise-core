import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Briefcase, Download, Plus } from "lucide-react";

import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Toolbar } from "@/components/ewos/Toolbar";
import { CompanyScopeSelect } from "@/components/ewos/recruitment/CompanyScopeSelect";
import { RequisitionFormDialog } from "@/components/ewos/recruitment/RequisitionFormDialog";
import { RequisitionLifecycleActions } from "@/components/ewos/recruitment/RequisitionLifecycleActions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { useActiveCompany } from "@/hooks/use-active-company";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useRecruitmentAccess } from "@/hooks/use-recruitment-access";
import { downloadCsv, timestampedName } from "@/lib/export";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { useAuth } from "@/lib/auth-context";
import {
  REQUISITION_STATUSES,
  jobRequisitionsApi,
  requisitionStatusTone,
  type JobRequisitionResponse,
  type RequisitionStatus,
} from "@/lib/recruitment-api";

export const Route = createFileRoute("/_app/recruitment/requisitions/")({
  head: () => ({
    meta: [
      { title: "Job Requisitions — EWOS" },
      {
        name: "description",
        content: "Create, approve and track job requisitions across their hiring lifecycle.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequisitionsPage,
});

const PRIORITY_TONE = {
  URGENT: "danger",
  HIGH: "warning",
  MEDIUM: "info",
  LOW: "neutral",
} as const;

function RequisitionsPage() {
  const { user } = useAuth();
  const { canWrite } = useRecruitmentAccess();
  const { companies, companyId, setCompanyId, isLoading: companyLoading } = useActiveCompany();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"ALL" | RequisitionStatus>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JobRequisitionResponse | null>(null);
  const debounced = useDebouncedValue(search, 250);

  const query = useQuery({
    queryKey: ["recruitment", "requisitions", companyId],
    queryFn: ({ signal }) => jobRequisitionsApi.all(companyId!, undefined, signal),
    enabled: !!companyId,
  });

  const rows = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    return (query.data ?? [])
      .filter((r) => status === "ALL" || r.status === status)
      .filter(
        (r) =>
          !term ||
          r.title.toLowerCase().includes(term) ||
          r.requisitionNumber.toLowerCase().includes(term) ||
          (r.location ?? "").toLowerCase().includes(term),
      )
      .sort((a, b) => a.requisitionNumber.localeCompare(b.requisitionNumber));
  }, [query.data, debounced, status]);

  function exportCsv() {
    downloadCsv(timestampedName("requisitions"), rows, [
      { key: "number", header: "Number", value: (r) => r.requisitionNumber },
      { key: "title", header: "Title", value: (r) => r.title },
      { key: "status", header: "Status", value: (r) => humanizeEnum(r.status) },
      { key: "priority", header: "Priority", value: (r) => humanizeEnum(r.priority ?? "MEDIUM") },
      { key: "type", header: "Type", value: (r) => humanizeEnum(r.employmentType) },
      { key: "headcount", header: "Headcount", value: (r) => r.headcount },
      { key: "filled", header: "Filled", value: (r) => r.filledCount ?? 0 },
      { key: "location", header: "Location", value: (r) => r.location ?? "" },
      { key: "targetStart", header: "Target start", value: (r) => r.targetStartDate ?? "" },
      { key: "budget", header: "Budget", value: (r) => r.budgetAmount ?? "" },
    ]);
  }

  if (!companyLoading && !companyId) {
    return (
      <EmptyState
        icon={Briefcase}
        title="No company available"
        description="Requisitions are scoped to a company. None were returned for your tenant."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <CompanyScopeSelect companies={companies} companyId={companyId} onChange={setCompanyId} />
        <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
          <Download className="mr-2 h-4 w-4" aria-hidden />
          Export CSV
        </Button>
        {canWrite && (
          <Button
            size="sm"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden />
            New requisition
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by number, title or location…"
          filters={
            <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
              <SelectTrigger className="h-9 w-[12rem]" aria-label="Filter by status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All statuses</SelectItem>
                {REQUISITION_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {humanizeEnum(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          }
        />

        <QueryState
          isLoading={query.isLoading || companyLoading}
          error={query.error}
          onRetry={() => query.refetch()}
          label="requisitions"
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No requisitions found"
              description={
                search || status !== "ALL"
                  ? "Adjust the filters to widen your search."
                  : "Create the first requisition to start hiring."
              }
            />
          ) : (
            <>
              {/* Desktop table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Requisition</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Fill</TableHead>
                      <TableHead>Target start</TableHead>
                      <TableHead>Budget</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <Link
                            to="/recruitment/requisitions/$id"
                            params={{ id: r.id }}
                            className="font-medium text-foreground hover:underline"
                          >
                            {r.title}
                          </Link>
                          <div className="text-xs text-muted-foreground">
                            {r.requisitionNumber} · {humanizeEnum(r.employmentType)}
                            {r.location ? ` · ${r.location}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={requisitionStatusTone(r.status)}>
                            {humanizeEnum(r.status)}
                          </StatusChip>
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={PRIORITY_TONE[r.priority ?? "MEDIUM"]}>
                            {humanizeEnum(r.priority ?? "MEDIUM")}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="tabular-nums">
                          {r.filledCount ?? 0}/{r.headcount}
                        </TableCell>
                        <TableCell>{formatDate(r.targetStartDate)}</TableCell>
                        <TableCell>{formatMoney(r.budgetAmount, r.budgetCurrency)}</TableCell>
                        <TableCell>
                          <RequisitionLifecycleActions requisition={r} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile cards */}
              <ul className="divide-y divide-border md:hidden">
                {rows.map((r) => (
                  <li key={r.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        to="/recruitment/requisitions/$id"
                        params={{ id: r.id }}
                        className="min-w-0"
                      >
                        <div className="truncate text-sm font-medium text-foreground">
                          {r.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {r.requisitionNumber} · {r.filledCount ?? 0}/{r.headcount} filled
                        </div>
                      </Link>
                      <RequisitionLifecycleActions requisition={r} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusChip tone={requisitionStatusTone(r.status)}>
                        {humanizeEnum(r.status)}
                      </StatusChip>
                      <StatusChip tone={PRIORITY_TONE[r.priority ?? "MEDIUM"]}>
                        {humanizeEnum(r.priority ?? "MEDIUM")}
                      </StatusChip>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryState>
      </Card>

      <RequisitionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        requisition={editing}
        tenantId={user?.tenantId}
        companyId={companyId}
      />
    </div>
  );
}
