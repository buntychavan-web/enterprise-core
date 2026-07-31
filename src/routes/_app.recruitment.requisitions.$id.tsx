import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Briefcase } from "lucide-react";

import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { RequisitionLifecycleActions } from "@/components/ewos/recruitment/RequisitionLifecycleActions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, humanizeEnum } from "@/lib/format";
import { jobRequisitionsApi, requisitionStatusTone } from "@/lib/recruitment-api";

export const Route = createFileRoute("/_app/recruitment/requisitions/$id")({
  head: () => ({
    meta: [
      { title: "Requisition detail — EWOS" },
      { name: "description", content: "Full detail and lifecycle actions for a job requisition." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RequisitionDetail,
});

function RequisitionDetail() {
  const { id } = Route.useParams();
  const query = useQuery({
    queryKey: ["recruitment", "requisition", id],
    queryFn: ({ signal }) => jobRequisitionsApi.get(id, signal),
  });

  const r = query.data;

  return (
    <div className="space-y-4">
      <Button asChild variant="ghost" size="sm">
        <Link to="/recruitment/requisitions">
          <ArrowLeft className="mr-2 h-4 w-4" aria-hidden />
          Back to requisitions
        </Link>
      </Button>

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        label="requisition"
      >
        {!r ? (
          <EmptyState icon={Briefcase} title="Requisition not found" />
        ) : (
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <CardTitle className="text-lg">{r.title}</CardTitle>
                <div className="mt-1 text-sm text-muted-foreground">
                  {r.requisitionNumber} · {humanizeEnum(r.employmentType)}
                  {r.location ? ` · ${r.location}` : ""}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusChip tone={requisitionStatusTone(r.status)}>
                    {humanizeEnum(r.status)}
                  </StatusChip>
                  <StatusChip tone="neutral">
                    {humanizeEnum(r.priority ?? "MEDIUM")} priority
                  </StatusChip>
                </div>
              </div>
              <RequisitionLifecycleActions requisition={r} variant="buttons" />
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Field label="Headcount" value={`${r.filledCount ?? 0} / ${r.headcount} filled`} />
              <Field label="Target start" value={formatDate(r.targetStartDate)} />
              <Field label="Budget" value={formatMoney(r.budgetAmount, r.budgetCurrency)} />
              <Field label="Hiring manager" value={r.hiringManagerId ?? "—"} />
              <Field label="Recruiter" value={r.recruiterId ?? "—"} />
              <Field label="Department" value={r.departmentOrgUnitId ?? "—"} />
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Justification
                </div>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                  {r.justification || "—"}
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </QueryState>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm text-foreground">{value}</div>
    </div>
  );
}
