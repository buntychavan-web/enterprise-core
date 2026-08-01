import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Building2, Download, Pencil, Plus, Trash2 } from "lucide-react";

import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Toolbar } from "@/components/ewos/Toolbar";
import { CompanyScopeSelect } from "@/components/ewos/recruitment/CompanyScopeSelect";
import { PositionFormDialog } from "@/components/ewos/recruitment/PositionFormDialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import { formatMoney, humanizeEnum } from "@/lib/format";
import { ApiError } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import {
  EMPLOYMENT_TYPES,
  jobPositionsApi,
  type JobPositionResponse,
} from "@/lib/recruitment-api";

export const Route = createFileRoute("/_app/recruitment/positions/")({
  head: () => ({
    meta: [
      { title: "Job Positions — EWOS" },
      {
        name: "description",
        content: "Maintain the job position catalogue used to raise requisitions.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PositionsPage,
});

function PositionsPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { canWrite, canAdmin } = useRecruitmentAccess();
  const { companies, companyId, setCompanyId, isLoading: companyLoading } = useActiveCompany();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<"ALL" | (typeof EMPLOYMENT_TYPES)[number]>("ALL");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<JobPositionResponse | null>(null);
  const [pendingDelete, setPendingDelete] = useState<JobPositionResponse | null>(null);
  const debounced = useDebouncedValue(search, 250);

  const query = useQuery({
    queryKey: ["recruitment", "positions", companyId],
    queryFn: ({ signal }) => jobPositionsApi.list(companyId!, signal),
    enabled: !!companyId,
  });

  const remove = useMutation({
    mutationFn: (id: string) => jobPositionsApi.remove(id),
    onSuccess: () => {
      toast.success("Position deleted");
      setPendingDelete(null);
      void qc.invalidateQueries({ queryKey: ["recruitment", "positions"] });
    },
    onError: (e) =>
      toast.error(e instanceof ApiError ? e.message : "Could not delete this position"),
  });

  const rows = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    return (query.data ?? [])
      .filter((p) => type === "ALL" || p.employmentType === type)
      .filter(
        (p) =>
          !term ||
          p.title.toLowerCase().includes(term) ||
          p.code.toLowerCase().includes(term) ||
          (p.location ?? "").toLowerCase().includes(term),
      )
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [query.data, debounced, type]);

  function exportCsv() {
    downloadCsv(timestampedName("job-positions"), rows, [
      { key: "code", header: "Code", value: (p) => p.code },
      { key: "title", header: "Title", value: (p) => p.title },
      { key: "type", header: "Employment type", value: (p) => humanizeEnum(p.employmentType) },
      { key: "grade", header: "Grade", value: (p) => p.grade ?? "" },
      { key: "location", header: "Location", value: (p) => p.location ?? "" },
      { key: "salaryMin", header: "Salary min", value: (p) => p.salaryMin ?? "" },
      { key: "salaryMax", header: "Salary max", value: (p) => p.salaryMax ?? "" },
      { key: "active", header: "Active", value: (p) => (p.active === false ? "No" : "Yes") },
    ]);
  }

  if (!companyLoading && !companyId) {
    return (
      <EmptyState
        icon={Building2}
        title="No company available"
        description="Job positions are scoped to a company. None were returned for your tenant."
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
            New position
          </Button>
        )}
      </div>

      <Card className="overflow-hidden p-0">
        <Toolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by code, title or location…"
          filters={
            <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
              <SelectTrigger className="h-9 w-[12rem]" aria-label="Filter by employment type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All employment types</SelectItem>
                {EMPLOYMENT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {humanizeEnum(t)}
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
          label="job positions"
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No job positions found"
              description={
                search || type !== "ALL"
                  ? "Adjust the filters to widen your search."
                  : "Create the first job position to start raising requisitions."
              }
            />
          ) : (
            <>
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Position</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead>Salary range</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead className="w-24" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>
                          <div className="font-medium text-foreground">{p.title}</div>
                          <div className="text-xs text-muted-foreground">
                            {p.code}
                            {p.location ? ` · ${p.location}` : ""}
                          </div>
                        </TableCell>
                        <TableCell>{humanizeEnum(p.employmentType)}</TableCell>
                        <TableCell>{p.grade ?? "—"}</TableCell>
                        <TableCell className="tabular-nums">
                          {p.salaryMin || p.salaryMax
                            ? `${formatMoney(p.salaryMin, p.salaryCurrency)} – ${formatMoney(
                                p.salaryMax,
                                p.salaryCurrency,
                              )}`
                            : "—"}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={p.active === false ? "neutral" : "success"}>
                            {p.active === false ? "Inactive" : "Active"}
                          </StatusChip>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            {canWrite && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Edit ${p.title}`}
                                onClick={() => {
                                  setEditing(p);
                                  setFormOpen(true);
                                }}
                              >
                                <Pencil className="h-4 w-4" aria-hidden />
                              </Button>
                            )}
                            {canAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                aria-label={`Delete ${p.title}`}
                                onClick={() => setPendingDelete(p)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <ul className="divide-y divide-border md:hidden">
                {rows.map((p) => (
                  <li key={p.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">
                          {p.title}
                        </div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {p.code} · {humanizeEnum(p.employmentType)}
                        </div>
                      </div>
                      <StatusChip tone={p.active === false ? "neutral" : "success"}>
                        {p.active === false ? "Inactive" : "Active"}
                      </StatusChip>
                    </div>
                    {(canWrite || canAdmin) && (
                      <div className="mt-3 flex gap-2">
                        {canWrite && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditing(p);
                              setFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        )}
                        {canAdmin && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setPendingDelete(p)}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}
        </QueryState>
      </Card>

      <PositionFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        position={editing}
        tenantId={user?.tenantId}
        companyId={companyId}
      />

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(v) => !v && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this job position?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.title} ({pendingDelete?.code}) will be removed. Requisitions already
              raised against it are not affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (pendingDelete) remove.mutate(pendingDelete.id);
              }}
              disabled={remove.isPending}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
