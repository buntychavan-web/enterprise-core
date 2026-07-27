import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Users2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
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
import {
  ApiError,
  employeeReportsApi,
  leaveApprovalsApi,
  leaveSelfServiceApi,
  type LeaveRequestDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-team")({
  head: () => ({
    meta: [{ title: "My Team — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyTeamPage,
});

function MyTeamPage() {
  const [reports, setReports] = useState<ResourceRecord[] | null>(null);
  const [pending, setPending] = useState<LeaveRequestDto[] | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [decidingId, setDecidingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const myReports = await employeeReportsApi.myReports();
      setReports(myReports);
    } catch {
      setReports([]);
    }
    try {
      // Sprint 4 audit fix: server-side scoped to the caller's own reports and
      // paginated, replacing the tenant-wide query + client-side reportIds filter.
      const page = await leaveSelfServiceApi.pendingForMyReports(0, 50);
      setPending(page.content);
      setPendingError(null);
    } catch (err) {
      // A manager may hold LEAVE_APPROVE without LEAVE_READ — degrade
      // gracefully to "roster only" rather than blocking the whole screen.
      setPending(null);
      setPendingError(err instanceof ApiError ? err.message : "Could not load pending approvals.");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, action: "approve" | "reject") => {
    setDecidingId(id);
    try {
      if (action === "approve") {
        await leaveApprovalsApi.approve(id);
      } else {
        await leaveApprovalsApi.reject(id, "Rejected via My Team");
      }
      toast.success(action === "approve" ? "Request approved" : "Request rejected");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to decide request.");
    } finally {
      setDecidingId(null);
    }
  };

  const pendingForReports = pending ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self-Service"
        title="My Team"
        description="Your direct reports and their pending leave approvals."
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !reports || reports.length === 0 ? (
        <EmptyState title="No direct reports" description="No employees currently report to you." />
      ) : (
        <>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <Users2 className="h-4 w-4" />
                Direct reports
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Employee number</TableHead>
                      <TableHead>Work email</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reports.map((r) => (
                      <TableRow key={String(r.id)}>
                        <TableCell className="text-sm">
                          {String(r.firstName ?? "")} {String(r.lastName ?? "")}
                        </TableCell>
                        <TableCell className="text-sm">{String(r.employeeNumber ?? "—")}</TableCell>
                        <TableCell className="text-sm">{String(r.workEmail ?? "—")}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Pending leave approvals</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendingError ? (
                <p className="p-5 text-sm text-muted-foreground">{pendingError}</p>
              ) : pendingForReports.length === 0 ? (
                <EmptyState
                  title="Nothing pending"
                  description="No leave requests from your reports are awaiting your decision."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Dates</TableHead>
                        <TableHead>Days</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead className="w-40 text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pendingForReports.map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="text-sm">
                            {p.startDate} &rarr; {p.endDate}
                          </TableCell>
                          <TableCell className="text-sm">{p.daysRequested}</TableCell>
                          <TableCell className="text-sm">{p.reason ?? "—"}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={decidingId === p.id}
                              onClick={() => decide(p.id, "approve")}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              disabled={decidingId === p.id}
                              onClick={() => decide(p.id, "reject")}
                            >
                              Reject
                            </Button>
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
    </div>
  );
}
