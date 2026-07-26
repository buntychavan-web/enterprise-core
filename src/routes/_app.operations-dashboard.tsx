import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Workflow as WorkflowIcon } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DEFAULT_COMPANY_ID,
  operationsDashboardApi,
  type OperationsDashboardData,
} from "@/lib/api-client";

// Sprint 14.4 — Operations Dashboard. One row per Payroll Run, showing the whole pipeline:
// Payroll -> Client Approval -> Data Exchange -> Integration -> Acknowledgement. Built entirely
// by reading each module's own state server-side (com.ewos.integration.application.
// OperationsDashboardService); this screen just renders the composed rows.

export const Route = createFileRoute("/_app/operations-dashboard")({
  head: () => ({
    meta: [{ title: "Operations Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: OperationsDashboardPage,
});

const RUN_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  COMPLETED: "warning",
  FINALIZED: "success",
  FROZEN: "success",
  FAILED: "danger",
};

const WORKFLOW_TONE: Record<string, StatusTone> = {
  RUNNING: "info",
  COMPLETED: "success",
  CANCELLED: "neutral",
  ERROR: "danger",
};

const EXCHANGE_TONE: Record<string, StatusTone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  SUCCESS: "success",
  FAILED: "danger",
  RETRY: "warning",
  ACKNOWLEDGED: "success",
  CANCELLED: "neutral",
};

const INTEGRATION_TONE: Record<string, StatusTone> = {
  SUCCESS: "success",
  FAILURE: "danger",
};

function OperationsDashboardPage() {
  const [data, setData] = useState<OperationsDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    operationsDashboardApi
      .forCompany(DEFAULT_COMPANY_ID)
      .then((d) => {
        if (cancelled) return;
        if (d === null) {
          setUnavailable(true);
        } else {
          setData(d);
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Outsourcing"
        title="Operations Dashboard"
        description="Payroll → Client Approval → Data Exchange → Integration → Acknowledgement, one row per run."
      />

      <div className="rounded-lg border border-border bg-card">
        {loading ? (
          <div className="p-16 text-center text-sm text-muted-foreground">Loading…</div>
        ) : unavailable ? (
          <EmptyState
            icon={WorkflowIcon}
            title="Coming soon"
            description="The operations dashboard endpoint (GET /api/v1/integration/operations-dashboard) is not yet available on the backend."
          />
        ) : !data || data.rows.length === 0 ? (
          <EmptyState
            icon={WorkflowIcon}
            title="No payroll runs yet"
            description="Rows appear here once payroll runs exist for this company."
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payroll run</TableHead>
                  <TableHead>Client approval</TableHead>
                  <TableHead>Data exchange</TableHead>
                  <TableHead>Integration</TableHead>
                  <TableHead>Acknowledged</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.rows.map((r) => (
                  <TableRow key={r.payrollRunId}>
                    <TableCell>
                      <StatusChip tone={RUN_STATUS_TONE[r.payrollRunStatus] ?? "neutral"}>
                        {r.payrollRunStatus}
                      </StatusChip>
                    </TableCell>
                    <TableCell>
                      {r.clientApprovalInstanceStatus ? (
                        <StatusChip
                          tone={WORKFLOW_TONE[r.clientApprovalInstanceStatus] ?? "neutral"}
                        >
                          {r.clientApprovalStateCode ?? r.clientApprovalInstanceStatus}
                        </StatusChip>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not started</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.dataExchangeStatus ? (
                        <StatusChip tone={EXCHANGE_TONE[r.dataExchangeStatus] ?? "neutral"}>
                          {r.dataExchangeStatus}
                        </StatusChip>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not queued</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {r.lastIntegrationOutcome ? (
                        <StatusChip tone={INTEGRATION_TONE[r.lastIntegrationOutcome] ?? "neutral"}>
                          {r.lastIntegrationOutcome}
                        </StatusChip>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not attempted</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <StatusChip tone={r.acknowledged ? "success" : "neutral"}>
                        {r.acknowledged ? "Yes" : "No"}
                      </StatusChip>
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
