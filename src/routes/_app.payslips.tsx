import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Receipt, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { payrollApi } from "@/lib/api-client";
import { formatDate, formatMoney, humanizeEnum, requestStatusTone } from "@/lib/format";

export const Route = createFileRoute("/_app/payslips")({
  head: () => ({
    meta: [
      { title: "Payslips — EWOS" },
      { name: "description", content: "Your payslip history and earnings breakdown." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayslipsPage,
});

function PayslipsPage() {
  const [openId, setOpenId] = useState<string | null>(null);

  const payslips = useQuery({
    queryKey: ["payroll", "my-payslips"],
    queryFn: ({ signal }) => payrollApi.myPayslips({ page: 0, size: 24 }, signal),
  });

  const detail = useQuery({
    queryKey: ["payroll", "payslip", openId],
    queryFn: ({ signal }) => payrollApi.payslip(openId!, signal),
    enabled: !!openId,
  });

  const rows = payslips.data?.content ?? [];
  const latest = rows[0];
  const currency = latest?.currency;
  const ytdNet = rows.reduce((sum, p) => sum + (p.netAmount ?? 0), 0);
  const ytdGross = rows.reduce((sum, p) => sum + (p.grossAmount ?? 0), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self service"
        title="Payslips"
        description="Your published payslips and earnings history."
      />

      <section aria-labelledby="payslip-stats-heading">
        <h2 id="payslip-stats-heading" className="sr-only">
          Earnings summary
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Latest net pay"
            value={latest ? formatMoney(latest.netAmount, currency) : null}
            loading={payslips.isLoading}
            unavailable={!!payslips.error}
            icon={<Wallet className="h-4 w-4" />}
            hint={latest ? `Paid ${formatDate(latest.payDate)}` : "No payslips published"}
          />
          <StatCard
            label="Gross to date"
            value={rows.length ? formatMoney(ytdGross, currency) : null}
            loading={payslips.isLoading}
            unavailable={!!payslips.error}
            icon={<Receipt className="h-4 w-4" />}
            hint={`${rows.length} published payslip${rows.length === 1 ? "" : "s"}`}
          />
          <StatCard
            label="Net to date"
            value={rows.length ? formatMoney(ytdNet, currency) : null}
            loading={payslips.isLoading}
            unavailable={!!payslips.error}
            icon={<Wallet className="h-4 w-4" />}
            hint="Sum of published payslips"
          />
        </div>
      </section>

      <section
        aria-labelledby="payslip-history-heading"
        className="rounded-lg border border-border bg-card"
      >
        <h2
          id="payslip-history-heading"
          className="border-b border-border px-4 py-3 text-sm font-semibold"
        >
          Payslip history
        </h2>
        <QueryState
          isLoading={payslips.isLoading}
          error={payslips.error}
          onRetry={() => void payslips.refetch()}
          label="payslips"
        >
          {rows.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payslips published"
              description="Payslips appear here once a payroll run for your pay group is finalized."
            />
          ) : (
            <>
              <ul className="divide-y divide-border md:hidden">
                {rows.map((p) => (
                  <li key={p.id} className="p-4">
                    <button
                      type="button"
                      onClick={() => setOpenId(p.id)}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">
                          {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Paid {formatDate(p.payDate)}
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-sm font-semibold">
                          {formatMoney(p.netAmount, p.currency)}
                        </div>
                        <StatusChip tone={requestStatusTone(p.status)}>
                          {humanizeEnum(p.status)}
                        </StatusChip>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="hidden overflow-x-auto md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Period</TableHead>
                      <TableHead>Pay date</TableHead>
                      <TableHead className="text-right">Gross</TableHead>
                      <TableHead className="text-right">Deductions</TableHead>
                      <TableHead className="text-right">Net</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="text-sm font-medium">
                          {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                        </TableCell>
                        <TableCell className="text-sm">{formatDate(p.payDate)}</TableCell>
                        <TableCell className="text-right text-sm">
                          {formatMoney(p.grossAmount, p.currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {formatMoney(p.deductionsAmount, p.currency)}
                        </TableCell>
                        <TableCell className="text-right text-sm font-semibold">
                          {formatMoney(p.netAmount, p.currency)}
                        </TableCell>
                        <TableCell>
                          <StatusChip tone={requestStatusTone(p.status)}>
                            {humanizeEnum(p.status)}
                          </StatusChip>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline" onClick={() => setOpenId(p.id)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </QueryState>
      </section>

      <Dialog open={openId !== null} onOpenChange={(o) => !o && setOpenId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Payslip breakdown</DialogTitle>
            <DialogDescription>
              {detail.data
                ? `${formatDate(detail.data.periodStart)} – ${formatDate(detail.data.periodEnd)}`
                : "Loading payslip details…"}
            </DialogDescription>
          </DialogHeader>

          <QueryState
            isLoading={detail.isLoading}
            error={detail.error}
            onRetry={() => void detail.refetch()}
            label="payslip"
          >
            {detail.data && (
              <div className="space-y-4">
                <dl className="max-h-[45vh] divide-y divide-border overflow-y-auto">
                  {(detail.data.lines ?? []).map((line, i) => (
                    <div
                      key={line.id ?? `${line.componentCode}-${i}`}
                      className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 py-2"
                    >
                      <dt className="min-w-0 truncate text-sm">
                        {line.componentName ?? line.componentCode}
                      </dt>
                      <dd className="shrink-0 text-sm font-medium">
                        {formatMoney(line.amount, detail.data!.currency)}
                      </dd>
                    </div>
                  ))}
                  {(detail.data.lines ?? []).length === 0 && (
                    <p className="py-2 text-sm text-muted-foreground">
                      No component breakdown was returned for this payslip.
                    </p>
                  )}
                </dl>

                <div className="space-y-1 border-t border-border pt-3 text-sm">
                  <Row label="Gross" value={formatMoney(detail.data.grossAmount, detail.data.currency)} />
                  <Row
                    label="Deductions"
                    value={formatMoney(detail.data.deductionsAmount, detail.data.currency)}
                  />
                  <Row
                    label="Net pay"
                    value={formatMoney(detail.data.netAmount, detail.data.currency)}
                    emphasis
                  />
                </div>

                <Button variant="outline" size="sm" className="w-full" disabled>
                  <Download className="h-4 w-4" />
                  PDF download (backend dependency)
                </Button>
              </div>
            )}
          </QueryState>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Row({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
      <span className={emphasis ? "font-semibold" : "text-muted-foreground"}>{label}</span>
      <span className={emphasis ? "font-semibold" : ""}>{value}</span>
    </div>
  );
}
