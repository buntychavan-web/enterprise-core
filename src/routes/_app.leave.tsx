import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { CalendarPlus, Plus } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LEAVE_BALANCES, LEAVE_REQUESTS, type LeaveRequest } from "@/lib/mock/self-service";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/leave")({
  head: () => ({
    meta: [
      { title: "Leave — EWOS" },
      { name: "description", content: "Leave balances, requests and approvals." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LeavePage,
});

const TONE: Record<LeaveRequest["status"], StatusTone> = {
  Approved: "success",
  Pending: "warning",
  Rejected: "danger",
};

function LeavePage() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<LeaveRequest[]>(LEAVE_REQUESTS);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Time-off"
        title="Leave"
        description="Track balances, apply for leave and monitor approvals."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-1.5 h-4 w-4" /> Apply for leave
              </Button>
            </DialogTrigger>
            <ApplyLeaveDialog
              onSubmit={(req) => {
                setRequests((xs) => [req, ...xs]);
                setOpen(false);
                toast.success("Leave request submitted", {
                  description: `${req.days} day(s) awaiting approval.`,
                });
              }}
            />
          </Dialog>
        }
      />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {LEAVE_BALANCES.map((b) => (
          <Card key={b.type}>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">{b.type}</div>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-semibold tabular-nums">{b.balance}</span>
                <span className="text-xs text-muted-foreground">/ {b.entitled} days</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary"
                  style={{ width: `${(b.used / b.entitled) * 100}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Used {b.used}</span>
                <span>Pending {b.pending}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">My requests</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Ref</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Approver</TableHead>
                  <TableHead>Applied</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.id}</TableCell>
                    <TableCell>{r.type}</TableCell>
                    <TableCell>{r.from}</TableCell>
                    <TableCell>{r.to}</TableCell>
                    <TableCell className="text-right tabular-nums">{r.days}</TableCell>
                    <TableCell>
                      <StatusChip tone={TONE[r.status]}>{r.status}</StatusChip>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.approver}</TableCell>
                    <TableCell className="text-muted-foreground">{r.appliedOn}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <ul className="divide-y divide-border md:hidden">
            {requests.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-medium">{r.type}</div>
                  <StatusChip tone={TONE[r.status]}>{r.status}</StatusChip>
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {r.from} → {r.to} · {r.days} day(s)
                </div>
                <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                  {r.id} · Applied {r.appliedOn}
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

function ApplyLeaveDialog({ onSubmit }: { onSubmit: (r: LeaveRequest) => void }) {
  const [type, setType] = useState("Casual Leave");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [reason, setReason] = useState("");

  const days = calcDays(from, to);

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarPlus className="h-4 w-4" /> Apply for leave
        </DialogTitle>
      </DialogHeader>
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!from || !to) return;
          onSubmit({
            id: `LR-${Math.floor(Math.random() * 9000 + 1000)}`,
            type,
            from,
            to,
            days,
            reason: reason || "—",
            status: "Pending",
            approver: "Priya Nair",
            appliedOn: new Date().toISOString().slice(0, 10),
          });
        }}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Leave type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LEAVE_BALANCES.map((b) => (
                  <SelectItem key={b.type} value={b.type}>
                    {b.type} · {b.balance} left
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="from">From</Label>
            <Input
              id="from"
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to">To</Label>
            <Input
              id="to"
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Brief reason for the leave"
            />
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {from && to ? `${days} day(s) will be requested.` : "Select from and to dates."}
        </div>
        <DialogFooter>
          <Button type="submit" disabled={!from || !to}>
            Submit request
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function calcDays(a: string, b: string) {
  if (!a || !b) return 0;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / (1000 * 60 * 60 * 24);
  return Math.max(1, Math.floor(d) + 1);
}
