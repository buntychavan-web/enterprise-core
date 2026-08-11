import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
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
import { ApiError, payslipSelfServiceApi, type PayslipDto } from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-payslips")({
  head: () => ({
    meta: [{ title: "My Payslips — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyPayslipsPage,
});

// Sprint 1 (ESS Core Polish) — matches the admin Payslips screen's money()
// formatter (Intl.NumberFormat) instead of raw string concatenation, so the
// same figure is formatted identically on both screens.
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

export function MyPayslipsPage() {
  const [payslips, setPayslips] = useState<PayslipDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    payslipSelfServiceApi
      .myPayslips()
      .then((p) => {
        if (!cancelled) setPayslips(p);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setPayslips([]);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load payslips.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self-Service"
        title="My Payslips"
        description="Your finalized payslip history."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Wallet className="h-4 w-4" />
            Payslips
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="grid place-items-center p-16 text-sm text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : error ? (
            <p className="p-5 text-sm text-destructive">{error}</p>
          ) : !payslips || payslips.length === 0 ? (
            <EmptyState
              title="No payslips yet"
              description="No employee record is linked to your account, or no payslips have been finalized yet."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Period</TableHead>
                    <TableHead>Pay date</TableHead>
                    <TableHead>Gross</TableHead>
                    <TableHead>Deductions</TableHead>
                    <TableHead>Net</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payslips.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {p.periodStart} — {p.periodEnd}
                      </TableCell>
                      <TableCell className="text-sm">{p.payDate}</TableCell>
                      <TableCell className="font-mono text-sm tabular-nums">
                        {money(p.grossAmount, p.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-sm tabular-nums text-muted-foreground">
                        −{money(p.deductionsAmount, p.currency)}
                      </TableCell>
                      <TableCell className="font-mono text-sm font-medium tabular-nums">
                        {money(p.netAmount, p.currency)}
                      </TableCell>
                      <TableCell className="text-sm">{p.status}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
