import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApiError, resourceApi, DEFAULT_TENANT_ID, type ResourceRecord } from "@/lib/api-client";

export const Route = createFileRoute("/_app/payslips")({
  head: () => ({
    meta: [
      { title: "Payslips — EWOS" },
      { name: "description", content: "Payslip history by employee." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayslipsPage,
});

// Sprint 13 fix — the previous screen rendered a hardcoded PAYSLIPS mock and a
// "Download PDF" button that only ever showed a toast (no real endpoint exists
// for that either). The real backend (com.ewos.payroll.api.PayslipController)
// has no tenant-wide "list all payslips" endpoint at all — only lookups by
// payslip id, payroll run id, or employee id. A self-service "my payslips"
// view would need the Employee⇄User link that doesn't exist (same gap noted
// on Employees/Attendance/Leave). This screen now does a real, employee-ID-
// keyed lookup against GET /api/v1/payroll/payslips/employee/{employeeId} —
// paste an Employee ID from the Employees screen to see real data.

type PayslipLine = { componentCode?: string; componentName?: string; amount?: number };
type PayslipRow = ResourceRecord & {
  employeeNumber?: string;
  employeeName?: string;
  periodStart?: string;
  periodEnd?: string;
  payDate?: string;
  currency?: string;
  grossAmount?: number;
  deductionsAmount?: number;
  netAmount?: number;
  status?: "DRAFT" | "FINALIZED" | "PAID" | string;
  lines?: PayslipLine[];
};

const TONE: Record<string, StatusTone> = {
  PAID: "success",
  FINALIZED: "info",
  DRAFT: "warning",
};

function money(n: number | undefined, currency: string | undefined) {
  if (n === undefined) return "—";
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: currency || "INR",
      maximumFractionDigits: 0,
    }).format(n);
  } catch {
    return String(n);
  }
}

function PayslipsPage() {
  const [employeeId, setEmployeeId] = useState("");
  const [payslips, setPayslips] = useState<PayslipRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  const search = async () => {
    if (!employeeId.trim()) return;
    setLoading(true);
    setError(null);
    setUnavailable(false);
    try {
      const api = resourceApi<PayslipRow>(`/payroll/payslips/employee/${employeeId.trim()}`);
      const res = await api.list();
      setPayslips(res.items);
      setUnavailable(res.unavailable);
    } catch (err) {
      setPayslips(null);
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to load payslips.");
      }
    } finally {
      setLoading(false);
    }
  };

  const ytdGross = (payslips ?? []).reduce((s, p) => s + (p.grossAmount ?? 0), 0);
  const ytdNet = (payslips ?? []).reduce((s, p) => s + (p.netAmount ?? 0), 0);
  const ytdDeductions = (payslips ?? []).reduce((s, p) => s + (p.deductionsAmount ?? 0), 0);
  const currency = payslips?.[0]?.currency;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compensation"
        title="Payslips"
        description={`Look up payslips by Employee ID (tenant ${DEFAULT_TENANT_ID} placeholder — see Sprint 13 report).`}
      />

      <Card>
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <Label htmlFor="employeeId">Employee ID</Label>
            <Input
              id="employeeId"
              placeholder="UUID — copy from the Employees screen"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
            />
          </div>
          <Button onClick={search} disabled={loading || !employeeId.trim()}>
            <Search className="h-4 w-4" />
            {loading ? "Searching…" : "Search"}
          </Button>
        </CardContent>
      </Card>

      {payslips !== null && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatCardInline label="Gross (shown)" value={money(ytdGross, currency)} />
            <StatCardInline label="Net (shown)" value={money(ytdNet, currency)} />
            <StatCardInline label="Deductions (shown)" value={money(ytdDeductions, currency)} />
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Payslip history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {unavailable ? (
                <EmptyState
                  title="Coming soon"
                  description="GET /api/v1/payroll/payslips/employee/{id} is not yet available on the backend."
                />
              ) : error ? (
                <div className="p-8 text-center text-sm text-destructive">{error}</div>
              ) : payslips.length === 0 ? (
                <EmptyState
                  title="No payslips found"
                  description="No payslips exist for this employee ID under this tenant."
                />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Pay date</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payslips.map((p) => (
                      <TableRow key={String(p.id)}>
                        <TableCell className="font-medium">
                          {p.periodStart ?? "—"} → {p.periodEnd ?? "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">{p.payDate ?? "—"}</TableCell>
                        <TableCell className="text-right tabular-nums">
                          {money(p.grossAmount, p.currency)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          −{money(p.deductionsAmount, p.currency)}
                        </TableCell>
                        <TableCell className="text-right font-medium tabular-nums">
                          {money(p.netAmount, p.currency)}
                        </TableCell>
                        <TableCell>
                          {p.status && (
                            <StatusChip tone={TONE[p.status] ?? "neutral"}>{p.status}</StatusChip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function StatCardInline({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
          <Wallet className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-lg font-semibold tabular-nums">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
