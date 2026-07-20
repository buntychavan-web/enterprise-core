import { createFileRoute } from "@tanstack/react-router";
import { Download, FileText, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PAYSLIPS, type Payslip } from "@/lib/mock/self-service";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/payslips")({
  head: () => ({
    meta: [
      { title: "Payslips — EWOS" },
      { name: "description", content: "Monthly payslips, YTD earnings and downloads." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PayslipsPage,
});

const TONE: Record<Payslip["status"], StatusTone> = {
  Paid: "success",
  Processed: "info",
  Pending: "warning",
};

const inr = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);

function PayslipsPage() {
  const ytdGross = PAYSLIPS.reduce((s, p) => s + p.gross, 0);
  const ytdNet = PAYSLIPS.reduce((s, p) => s + p.net, 0);
  const ytdTax = PAYSLIPS.reduce((s, p) => s + p.deductions, 0);

  const download = (p: Payslip) =>
    toast.info("Download queued", { description: `${p.period} payslip will be emailed to you.` });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Compensation"
        title="Payslips"
        description="Download monthly payslips and view year-to-date earnings."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="YTD gross" icon={<Wallet className="h-5 w-5" />} value={inr(ytdGross)} />
        <StatCard label="YTD net" icon={<Wallet className="h-5 w-5" />} value={inr(ytdNet)} />
        <StatCard label="YTD tax & deductions" icon={<FileText className="h-5 w-5" />} value={inr(ytdTax)} />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Payslip history</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross</TableHead>
                  <TableHead className="text-right">Deductions</TableHead>
                  <TableHead className="text-right">Net</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Paid on</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {PAYSLIPS.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.id}</TableCell>
                    <TableCell>{p.period}</TableCell>
                    <TableCell className="text-right tabular-nums">{inr(p.gross)}</TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      −{inr(p.deductions)}
                    </TableCell>
                    <TableCell className="text-right font-medium tabular-nums">{inr(p.net)}</TableCell>
                    <TableCell>
                      <StatusChip tone={TONE[p.status]}>{p.status}</StatusChip>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.paidOn ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" onClick={() => download(p)}>
                        <Download className="mr-1.5 h-3.5 w-3.5" /> PDF
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {PAYSLIPS.map((p) => (
              <li key={p.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{p.period}</div>
                  <StatusChip tone={TONE[p.status]}>{p.status}</StatusChip>
                </div>
                <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Net {inr(p.net)}</span>
                  <span>{p.paidOn ?? "—"}</span>
                </div>
                <div className="mt-2">
                  <Button size="sm" variant="outline" onClick={() => download(p)} className="w-full">
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download PDF
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
