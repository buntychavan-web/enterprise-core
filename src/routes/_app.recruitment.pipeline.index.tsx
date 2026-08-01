import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { KanbanSquare } from "lucide-react";

import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { CompanyScopeSelect } from "@/components/ewos/recruitment/CompanyScopeSelect";
import { RequisitionLifecycleActions } from "@/components/ewos/recruitment/RequisitionLifecycleActions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useActiveCompany } from "@/hooks/use-active-company";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatDate, humanizeEnum } from "@/lib/format";
import {
  PIPELINE_STAGES,
  jobRequisitionsApi,
  requisitionStatusTone,
  type JobRequisitionResponse,
  type RequisitionStatus,
} from "@/lib/recruitment-api";

export const Route = createFileRoute("/_app/recruitment/pipeline/")({
  head: () => ({
    meta: [
      { title: "Hiring Pipeline — EWOS" },
      {
        name: "description",
        content: "Kanban view of every job requisition across the hiring lifecycle.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PipelinePage,
});

function PipelinePage() {
  const { companies, companyId, setCompanyId, isLoading: companyLoading } = useActiveCompany();
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 250);

  const query = useQuery({
    queryKey: ["recruitment", "requisitions", companyId],
    queryFn: ({ signal }) => jobRequisitionsApi.all(companyId!, undefined, signal),
    enabled: !!companyId,
  });

  const columns = useMemo(() => {
    const term = debounced.trim().toLowerCase();
    const rows = (query.data ?? []).filter(
      (r) =>
        !term ||
        r.title.toLowerCase().includes(term) ||
        r.requisitionNumber.toLowerCase().includes(term) ||
        (r.location ?? "").toLowerCase().includes(term),
    );
    return PIPELINE_STAGES.map((stage) => ({
      stage,
      items: rows.filter((r) => r.status === stage),
    }));
  }, [query.data, debounced]);

  const total = columns.reduce((n, c) => n + c.items.length, 0);

  if (!companyLoading && !companyId) {
    return (
      <EmptyState
        icon={KanbanSquare}
        title="No company available"
        description="The pipeline is scoped to a company. None were returned for your tenant."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search the pipeline…"
          aria-label="Search requisitions"
          className="h-9 w-full sm:max-w-xs"
        />
        <CompanyScopeSelect companies={companies} companyId={companyId} onChange={setCompanyId} />
      </div>

      <QueryState
        isLoading={query.isLoading || companyLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        label="the hiring pipeline"
      >
        {total === 0 ? (
          <EmptyState
            icon={KanbanSquare}
            title="Nothing in the pipeline"
            description={
              search
                ? "No requisition matches your search."
                : "Requisitions appear here as soon as they are created."
            }
          />
        ) : (
          <div className="-mx-1 flex snap-x gap-3 overflow-x-auto px-1 pb-2">
            {columns.map(({ stage, items }) => (
              <PipelineColumn key={stage} stage={stage} items={items} />
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}

function PipelineColumn({
  stage,
  items,
}: {
  stage: RequisitionStatus;
  items: JobRequisitionResponse[];
}) {
  return (
    <section
      aria-label={`${humanizeEnum(stage)} (${items.length})`}
      className="w-[17rem] shrink-0 snap-start"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <StatusChip tone={requisitionStatusTone(stage)}>{humanizeEnum(stage)}</StatusChip>
        <span className="text-xs tabular-nums text-muted-foreground">{items.length}</span>
      </div>
      <div className="space-y-2 rounded-lg bg-muted/40 p-2">
        {items.length === 0 ? (
          <p className="px-1 py-6 text-center text-xs text-muted-foreground">No requisitions</p>
        ) : (
          items.map((r) => (
            <Card key={r.id} className="space-y-2 p-3">
              <div className="flex items-start justify-between gap-1">
                <Link
                  to="/recruitment/requisitions/$id"
                  params={{ id: r.id }}
                  className="min-w-0 text-sm font-medium text-foreground hover:underline"
                >
                  {r.title}
                </Link>
                <RequisitionLifecycleActions requisition={r} />
              </div>
              <p className="text-xs text-muted-foreground">
                {r.requisitionNumber} · {r.filledCount ?? 0}/{r.headcount} filled
              </p>
              <p className="text-xs text-muted-foreground">
                {r.location ? `${r.location} · ` : ""}
                {r.targetStartDate ? `Target ${formatDate(r.targetStartDate)}` : "No target date"}
              </p>
            </Card>
          ))
        )}
      </div>
    </section>
  );
}
