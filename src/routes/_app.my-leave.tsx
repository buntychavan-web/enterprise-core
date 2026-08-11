import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CalendarPlus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogDescription,
  DialogFooter,
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
import {
  ApiError,
  leaveSelfServiceApi,
  type LeaveBalanceDto,
  type LeaveRequestDto,
  type LeaveTypeDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-leave")({
  head: () => ({
    meta: [{ title: "My Leave — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyLeavePage,
});

const STATUS_TONE: Record<LeaveRequestDto["status"], StatusTone> = {
  DRAFT: "neutral",
  SUBMITTED: "info",
  APPROVED: "success",
  REJECTED: "danger",
  CANCELLED: "neutral",
};

export function MyLeavePage() {
  const [balances, setBalances] = useState<LeaveBalanceDto[] | null>(null);
  const [requests, setRequests] = useState<LeaveRequestDto[] | null>(null);
  const [leaveTypes, setLeaveTypes] = useState<LeaveTypeDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [b, r, t] = await Promise.all([
        leaveSelfServiceApi.myBalances(),
        leaveSelfServiceApi.myRequests(),
        leaveSelfServiceApi.leaveTypes(),
      ]);
      setBalances(b);
      setRequests(r);
      setLeaveTypes(t);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setBalances([]);
        setRequests([]);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to load leave data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: string) => {
    setCancellingId(id);
    try {
      await leaveSelfServiceApi.cancelRequest(id);
      toast.success("Leave request cancelled");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to cancel request.");
    } finally {
      setCancellingId(null);
    }
  };

  const cancellable = (status: LeaveRequestDto["status"]) =>
    status === "DRAFT" || status === "SUBMITTED";

  const submit = async (id: string) => {
    setSubmittingId(id);
    try {
      await leaveSelfServiceApi.submitRequest(id);
      toast.success("Leave request submitted for approval");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to submit request.");
    } finally {
      setSubmittingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self-Service"
        title="My Leave"
        description="Your leave balance, requests, and history."
        actions={
          <Button size="sm" onClick={() => setApplyOpen(true)} disabled={leaveTypes.length === 0}>
            <CalendarPlus className="h-4 w-4" />
            Apply for leave
          </Button>
        }
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : requests && requests.length === 0 && (!balances || balances.length === 0) ? (
        <EmptyState
          title="No employee record linked"
          description="No leave record is linked to your account. Contact an administrator if this seems wrong."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {(balances ?? []).map((b) => (
              <Card key={b.id}>
                <CardContent className="p-5">
                  <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {b.leaveTypeCode ?? "Leave"}
                  </div>
                  <div className="mt-2 text-3xl font-semibold tracking-tight">
                    {b.availableDays}
                    <span className="ml-1 text-sm font-normal text-muted-foreground">
                      days available
                    </span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {b.pendingDays} pending &middot; {b.consumedDays} used
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Request history</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!requests || requests.length === 0 ? (
                <EmptyState
                  title="No leave requests yet"
                  description="Apply for leave to see it here."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-36 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="text-sm">{r.leaveTypeCode ?? "—"}</TableCell>
                          <TableCell className="text-sm">
                            {r.startDate} &rarr; {r.endDate}
                          </TableCell>
                          <TableCell className="text-sm">{r.daysRequested}</TableCell>
                          <TableCell>
                            <StatusChip tone={STATUS_TONE[r.status]}>{r.status}</StatusChip>
                          </TableCell>
                          <TableCell className="text-right">
                            {r.status === "DRAFT" && (
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={submittingId === r.id}
                                onClick={() => submit(r.id)}
                              >
                                {submittingId === r.id && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Submit
                              </Button>
                            )}
                            {cancellable(r.status) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                disabled={cancellingId === r.id}
                                onClick={() => cancel(r.id)}
                              >
                                {cancellingId === r.id && (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                )}
                                Cancel
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      <ApplyDialog
        open={applyOpen}
        onOpenChange={setApplyOpen}
        leaveTypes={leaveTypes}
        onCreated={load}
      />
    </div>
  );
}

function ApplyDialog({
  open,
  onOpenChange,
  leaveTypes,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leaveTypes: LeaveTypeDto[];
  onCreated: () => Promise<void>;
}) {
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const reset = () => {
    setLeaveTypeId("");
    setStartDate("");
    setEndDate("");
    setReason("");
  };

  const submit = async () => {
    if (!leaveTypeId || !startDate || !endDate) {
      toast.error("Leave type, start date, and end date are required");
      return;
    }
    setSaving(true);
    try {
      await leaveSelfServiceApi.createRequest({
        leaveTypeId,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      });
      toast.success("Leave request created as a draft");
      reset();
      onOpenChange(false);
      await onCreated();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create request.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Apply for leave</DialogTitle>
          <DialogDescription>
            Creates a draft request. Use "Submit" on the request once saved to send it for approval.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>
              Leave type<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select value={leaveTypeId} onValueChange={setLeaveTypeId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a leave type" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="leave-start">
                Start date<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="leave-start"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="leave-end">
                End date<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="leave-end"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="leave-reason">Reason</Label>
            <Input
              id="leave-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Submit
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
