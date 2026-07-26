import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  integrationMonitoringApi,
  type IntegrationMonitoringSummary,
} from "@/lib/api-client";

// Sprint 14.4 — Integration Monitoring Dashboard. Read view over the append-only
// integration_execution_records audit trail (com.ewos.integration.application.
// IntegrationMonitoringService); no new persistence, purely aggregation. Reuses the
// StatCard / StatusChip / Card / Table building blocks from the Provider Dashboard (Sprint 14.2).

export const Route = createFileRoute("/_app/integration-monitoring")({
  head: () => ({
    meta: [{ title: "Integration Monitoring — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: IntegrationMonitoringPage,
});

const OUTCOME_TONE: StatusTone = "danger";
const CLASSIFICATION_TONE: Record<string, StatusTone> = {
  VALIDATION: "warning",
  AUTHENTICATION: "danger",
  TRANSIENT_NETWORK: "info",
  DATA_MAPPING: "warning",
  EXTERNAL_SYSTEM: "danger",
  CONFIGURATION: "neutral",
  UNKNOWN: "neutral",
};

function IntegrationMonitoringPage() {
  const [summary, setSummary] = useState<IntegrationMonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    integrationMonitoringApi
      .summary(DEFAULT_COMPANY_ID)
      .then((d) => {
        if (cancelled) return;
        if (d === null) {
          setUnavailable(true);
        } else {
          setSummary(d);
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
        title="Integration Monitoring"
        description="Success/failure counts and error-classification breakdown for the configured integration adapters."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total executions"
          icon={<Activity className="h-5 w-5" />}
          value={summary?.totalExecutions ?? null}
          loading={loading}
          unavailable={unavailable}
        />
        <StatCard
          label="Successful"
          icon={<CheckCircle2 className="h-5 w-5" />}
          value={summary?.successCount ?? null}
          loading={loading}
          unavailable={unavailable}
        />
        <StatCard
          label="Failed"
          icon={<XCircle className="h-5 w-5" />}
          value={summary?.failureCount ?? null}
          loading={loading}
          unavailable={unavailable}
        />
        <StatCard
          label="Recent failures shown"
          icon={<AlertTriangle className="h-5 w-5" />}
          value={summary?.recentFailures.length ?? null}
          loading={loading}
          unavailable={unavailable}
          hint="Most recent, up to 20"
        />
      </div>

      {unavailable ? (
        <EmptyState
          icon={Activity}
          title="Coming soon"
          description="The integration monitoring endpoint (GET /api/v1/integration/monitoring/summary) is not yet available on the backend."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Executions by adapter type</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {loading ? (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                ) : summary && Object.keys(summary.byAdapterType).length > 0 ? (
                  Object.entries(summary.byAdapterType).map(([type, count]) => (
                    <StatusChip key={type} tone="info">
                      {type}: {count}
                    </StatusChip>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No executions yet.</span>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Failures by classification</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {loading ? (
                  <span className="text-xs text-muted-foreground">Loading…</span>
                ) : summary && Object.keys(summary.byErrorClassification).length > 0 ? (
                  Object.entries(summary.byErrorClassification).map(([cls, count]) => (
                    <StatusChip key={cls} tone={CLASSIFICATION_TONE[cls] ?? "neutral"}>
                      {cls}: {count}
                    </StatusChip>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No failures recorded.</span>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent failures</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 text-xs text-muted-foreground">Loading…</div>
              ) : summary && summary.recentFailures.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Adapter</TableHead>
                      <TableHead>Attempt</TableHead>
                      <TableHead>Classification</TableHead>
                      <TableHead>Error</TableHead>
                      <TableHead>Started</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.recentFailures.map((f) => (
                      <TableRow key={f.id}>
                        <TableCell className="text-sm">{f.adapterType ?? "—"}</TableCell>
                        <TableCell className="text-sm">{f.attemptNumber}</TableCell>
                        <TableCell className="text-sm">
                          {f.errorClassification && (
                            <StatusChip tone={OUTCOME_TONE}>{f.errorClassification}</StatusChip>
                          )}
                        </TableCell>
                        <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                          {f.errorMessage ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm">{f.startedAt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-5 text-xs text-muted-foreground">No failures recorded.</div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
