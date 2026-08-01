import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
  onboardingSelfServiceApi,
  type OnboardingPlanDto,
  type OnboardingPlanStatus,
  type OnboardingTaskInstanceDto,
  type OnboardingTaskStatus,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-onboarding")({
  head: () => ({
    meta: [{ title: "My Onboarding — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyOnboardingPage,
});

const PLAN_STATUS_TONE: Record<OnboardingPlanStatus, StatusTone> = {
  PLANNED: "neutral",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const TASK_STATUS_TONE: Record<OnboardingTaskStatus, StatusTone> = {
  PENDING: "neutral",
  IN_PROGRESS: "info",
  WAITING_ON_EMPLOYEE: "warning",
  WAITING_ON_COMPANY: "warning",
  COMPLETED: "success",
  SKIPPED: "neutral",
  FAILED: "danger",
};

function MyOnboardingPage() {
  const [plan, setPlan] = useState<OnboardingPlanDto | null>(null);
  const [tasks, setTasks] = useState<OnboardingTaskInstanceDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [p, t] = await Promise.all([
        onboardingSelfServiceApi.myPlan(),
        onboardingSelfServiceApi.myTasks(),
      ]);
      setPlan(p);
      setTasks(t);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setPlan(null);
        setTasks([]);
      } else {
        setError(err instanceof ApiError ? err.message : "Failed to load onboarding data.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const mandatoryOutstanding = (tasks ?? []).filter(
    (t) => t.mandatory && t.status !== "COMPLETED" && t.status !== "SKIPPED",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Self-Service"
        title="My Onboarding"
        description="Your onboarding plan and tasks."
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : !plan ? (
        <EmptyState
          title="No onboarding plan linked"
          description="No onboarding plan is linked to your account yet. Contact HR if you're a new hire and expected one."
        />
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip tone={PLAN_STATUS_TONE[plan.status]}>
                    {plan.status.replace(/_/g, " ")}
                  </StatusChip>
                  {plan.joiningDate && (
                    <span className="text-sm text-muted-foreground">
                      Joining {plan.joiningDate}
                    </span>
                  )}
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Progress value={plan.completionPercent} className="h-2 w-48" />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {plan.completionPercent}% complete
                  </span>
                </div>
                {mandatoryOutstanding > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    {mandatoryOutstanding} mandatory task{mandatoryOutstanding === 1 ? "" : "s"}{" "}
                    still outstanding.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">My tasks</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!tasks || tasks.length === 0 ? (
                <EmptyState
                  title="No tasks yet"
                  description="Tasks will appear here as HR adds them to your plan."
                />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Task</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Due</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {[...tasks]
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map((t) => (
                          <TableRow key={t.id}>
                            <TableCell className="text-sm">
                              <div className="font-medium">
                                {t.name}
                                {t.mandatory && <span className="ml-1 text-destructive">*</span>}
                              </div>
                              {t.notes && (
                                <div className="text-xs text-muted-foreground">{t.notes}</div>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {t.taskType.replace(/_/g, " ")}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {t.dueDate ?? "—"}
                            </TableCell>
                            <TableCell>
                              <StatusChip tone={TASK_STATUS_TONE[t.status]}>
                                {t.status.replace(/_/g, " ")}
                              </StatusChip>
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
