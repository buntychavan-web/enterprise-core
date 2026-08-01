import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  appraisalApi,
  appraisalTemplateApi,
  performanceCycleApi,
  resourceApi,
  type AppraisalTemplateDto,
  type PerformanceCycleDto,
  type ResourceRecord,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-employee-assignment")({
  validateSearch: (search: Record<string, unknown>): { cycleId?: string } => ({
    cycleId: typeof search.cycleId === "string" ? search.cycleId : undefined,
  }),
  head: () => ({
    meta: [{ title: "Employee Assignment — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: EmployeeAssignmentPage,
});

type EmployeeOption = ResourceRecord & {
  id: string;
  displayName?: string;
  employeeNumber?: string;
};

function EmployeeAssignmentPage() {
  const { tenantId, activeCompanyId, apiOptions } = useTenant();
  const { cycleId: initialCycleId } = Route.useSearch();

  const [cycles, setCycles] = useState<PerformanceCycleDto[]>([]);
  const [templates, setTemplates] = useState<AppraisalTemplateDto[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  const [cycleId, setCycleId] = useState(initialCycleId ?? "");
  const [templateId, setTemplateId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [managerEmployeeId, setManagerEmployeeId] = useState("");
  const [reviewerEmployeeId, setReviewerEmployeeId] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    performanceCycleApi
      .listForCompany(activeCompanyId)
      .then(setCycles)
      .catch(() => setCycles([]));
    appraisalTemplateApi
      .listForCompany(activeCompanyId)
      .then(setTemplates)
      .catch(() => setTemplates([]));
    resourceApi<EmployeeOption>("/employees", apiOptions)
      .list()
      .then((r) => setEmployees(r.items))
      .catch(() => setEmployees([]));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const NONE = "__none__";

  const submit = async () => {
    if (!tenantId || !activeCompanyId || !cycleId || !templateId || !employeeId) {
      toast.error("Cycle, template, and employee are required");
      return;
    }
    setSubmitting(true);
    try {
      await appraisalApi.open({
        tenantId,
        companyId: activeCompanyId,
        cycleId,
        templateId,
        employeeId,
        managerEmployeeId: managerEmployeeId || undefined,
        reviewerEmployeeId: reviewerEmployeeId || undefined,
      });
      toast.success("Appraisal opened for this employee");
      setEmployeeId("");
      setManagerEmployeeId("");
      setReviewerEmployeeId("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to open appraisal.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Employee Assignment"
        description="Open a single employee's appraisal for a cycle — for late joiners, corrections, or employees missed by a bulk launch."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Open appraisal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-cycle">
                Appraisal cycle<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select value={cycleId} onValueChange={setCycleId}>
                <SelectTrigger id="f-cycle">
                  <SelectValue placeholder="Select a cycle" />
                </SelectTrigger>
                <SelectContent>
                  {cycles.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-template">
                Appraisal template<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger id="f-template">
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="f-employee">
              Employee<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger id="f-employee">
                <SelectValue placeholder="Select an employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.displayName ?? e.id}
                    {e.employeeNumber ? ` (${e.employeeNumber})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="f-manager">Manager</Label>
              <Select
                value={managerEmployeeId || NONE}
                onValueChange={(v) => setManagerEmployeeId(v === NONE ? "" : v)}
              >
                <SelectTrigger id="f-manager">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.displayName ?? e.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-reviewer">Reviewer</Label>
              <Select
                value={reviewerEmployeeId || NONE}
                onValueChange={(v) => setReviewerEmployeeId(v === NONE ? "" : v)}
              >
                <SelectTrigger id="f-reviewer">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Unassigned</SelectItem>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.displayName ?? e.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={() => void submit()}
              disabled={submitting || !cycleId || !templateId || !employeeId}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserCog className="h-4 w-4" />
              )}
              Open appraisal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
