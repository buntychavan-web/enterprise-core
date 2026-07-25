import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, CalendarDays, ClipboardList, LayoutList, Network } from "lucide-react";
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
import { providerDashboardApi, type ProviderDashboardSummary } from "@/lib/api-client";

// Sprint 14.2 — Provider Dashboard. Reuses the existing StatCard / StatusChip / Card / Table
// building blocks from the main Dashboard and CRUD screens; every list here is already
// Chinese-Wall-scoped server-side (ProviderDashboardService builds it entirely from the
// caller's own accessible-client set), so no client-side filtering is needed.

export const Route = createFileRoute("/_app/provider-dashboard")({
  head: () => ({
    meta: [{ title: "Provider Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: ProviderDashboardPage,
});

const RUN_STATUS_TONE: Record<string, StatusTone> = {
  PENDING: "neutral",
  PROCESSING: "info",
  COMPLETED: "warning",
  FINALIZED: "success",
  FROZEN: "success",
  FAILED: "danger",
};

function ProviderDashboardPage() {
  const [summary, setSummary] = useState<ProviderDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    let cancelled = false;
    providerDashboardApi
      .get()
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
        title="Provider Dashboard"
        description="Your book of business: assigned clients, active payroll periods, run status, and pending approvals."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Assigned clients"
          icon={<Network className="h-5 w-5" />}
          value={summary?.assignedClients.length ?? null}
          loading={loading}
          unavailable={unavailable}
        />
        <StatCard
          label="Active payroll periods"
          icon={<CalendarDays className="h-5 w-5" />}
          value={summary?.activePayrollPeriods.length ?? null}
          loading={loading}
          unavailable={unavailable}
        />
        <StatCard
          label="Pending approvals"
          icon={<ClipboardList className="h-5 w-5" />}
          value={summary?.pendingApprovals.length ?? null}
          loading={loading}
          unavailable={unavailable}
          hint="Runs completed, awaiting finalization"
        />
        <StatCard
          label="Active services"
          icon={<LayoutList className="h-5 w-5" />}
          value={summary ? `${summary.activeServiceCount} / ${summary.totalServiceCount}` : null}
          loading={loading}
          unavailable={unavailable}
          hint="Service catalogue"
        />
      </div>

      {unavailable ? (
        <EmptyState
          icon={Building2}
          title="Coming soon"
          description="The provider dashboard endpoint (GET /api/v1/payroll/provider-dashboard) is not yet available on the backend."
        />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Payroll run status</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {loading ? (
                <span className="text-xs text-muted-foreground">Loading…</span>
              ) : summary && Object.keys(summary.payrollStatusCounts).length > 0 ? (
                Object.entries(summary.payrollStatusCounts).map(([status, count]) => (
                  <StatusChip key={status} tone={RUN_STATUS_TONE[status] ?? "neutral"}>
                    {status}: {count}
                  </StatusChip>
                ))
              ) : (
                <span className="text-xs text-muted-foreground">No payroll runs yet.</span>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Assigned clients</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-5 text-xs text-muted-foreground">Loading…</div>
                ) : summary && summary.assignedClients.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>Legal name</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.assignedClients.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="text-sm">{c.code}</TableCell>
                          <TableCell className="text-sm">{c.legalName}</TableCell>
                          <TableCell className="text-sm">{c.status}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-5 text-xs text-muted-foreground">No clients assigned yet.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Pending approvals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-5 text-xs text-muted-foreground">Loading…</div>
                ) : summary && summary.pendingApprovals.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Run type</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {summary.pendingApprovals.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.runType}</TableCell>
                          <TableCell className="text-sm">
                            <StatusChip tone={RUN_STATUS_TONE[r.status] ?? "neutral"}>
                              {r.status}
                            </StatusChip>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="p-5 text-xs text-muted-foreground">
                    Nothing awaiting approval.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Payroll calendar</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 text-xs text-muted-foreground">Loading…</div>
              ) : summary && summary.payrollCalendar.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Period start</TableHead>
                      <TableHead>Period end</TableHead>
                      <TableHead>Pay date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {summary.payrollCalendar.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm">{p.name}</TableCell>
                        <TableCell className="text-sm">{p.status}</TableCell>
                        <TableCell className="text-sm">{p.periodStart}</TableCell>
                        <TableCell className="text-sm">{p.periodEnd}</TableCell>
                        <TableCell className="text-sm">{p.payDate}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="p-5 text-xs text-muted-foreground">
                  No payroll periods for your assigned clients yet.
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
