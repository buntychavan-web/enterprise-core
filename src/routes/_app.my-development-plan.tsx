import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Check, Circle, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  developmentPlanSelfServiceApi,
  type DevelopmentActionDto,
  type DevelopmentPlanDto,
  type DevelopmentPlanStatus,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-development-plan")({
  head: () => ({
    meta: [{ title: "Development Plan — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyDevelopmentPlanPage,
});

const STATUS_TONE: Record<DevelopmentPlanStatus, StatusTone> = {
  DRAFT: "neutral",
  ACTIVE: "info",
  COMPLETED: "success",
  CANCELLED: "danger",
};

function MyDevelopmentPlanPage() {
  const { user } = useAuth();
  const employeeId = user?.employeeId;

  const [plans, setPlans] = useState<DevelopmentPlanDto[] | null>(null);
  const [actionsByPlan, setActionsByPlan] = useState<Record<string, DevelopmentActionDto[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const load = async () => {
    if (!employeeId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await developmentPlanSelfServiceApi.myPlans();
      setPlans(data);
      const entries = await Promise.all(
        data.map(
          async (p) => [p.id, await developmentPlanSelfServiceApi.myPlanActions(p.id)] as const,
        ),
      );
      setActionsByPlan(Object.fromEntries(entries));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load your development plan.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const completeAction = async (planId: string, actionId: string) => {
    setBusyAction(actionId);
    try {
      await developmentPlanSelfServiceApi.completeMyAction(actionId);
      toast.success("Action marked complete");
      const refreshed = await developmentPlanSelfServiceApi.myPlanActions(planId);
      setActionsByPlan((cur) => ({ ...cur, [planId]: refreshed }));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to complete action.");
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="Development Plan"
        description="Your growth actions and completion status."
      />

      {!employeeId ? (
        <EmptyState
          icon={TrendingUp}
          title="No employee record linked"
          description="Your account isn't linked to an employee record, so development plans can't be resolved."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load your development plan" description={error} />
      ) : !plans || plans.length === 0 ? (
        <EmptyState
          icon={TrendingUp}
          title="No development plan yet"
          description="No development plan has been created for you yet."
        />
      ) : (
        <div className="space-y-4">
          {plans.map((p) => {
            const actions = actionsByPlan[p.id] ?? [];
            const terminal = p.status === "COMPLETED" || p.status === "CANCELLED";
            return (
              <Card key={p.id}>
                <CardHeader className="flex-row items-center justify-between gap-2 pb-2">
                  <CardTitle className="text-sm font-semibold">{p.title}</CardTitle>
                  <StatusChip tone={STATUS_TONE[p.status]}>{p.status}</StatusChip>
                </CardHeader>
                <CardContent className="space-y-3">
                  {p.description && (
                    <p className="text-sm text-muted-foreground">{p.description}</p>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {p.startsOn ?? "—"} – {p.endsOn ?? "—"}
                  </div>
                  {actions.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No actions on this plan.</p>
                  ) : (
                    <ul className="divide-y divide-border rounded-md border border-border">
                      {actions.map((a) => (
                        <li
                          key={a.id}
                          className="flex items-center justify-between gap-2 px-3 py-2 text-sm"
                        >
                          <div className="flex items-center gap-2">
                            {a.completed ? (
                              <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground" />
                            )}
                            <span
                              className={a.completed ? "text-muted-foreground line-through" : ""}
                            >
                              {a.action}
                            </span>
                            {a.dueOn && (
                              <span className="text-xs text-muted-foreground">Due {a.dueOn}</span>
                            )}
                          </div>
                          {!a.completed && !terminal && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void completeAction(p.id, a.id)}
                              disabled={busyAction === a.id}
                            >
                              {busyAction === a.id && <Loader2 className="h-4 w-4 animate-spin" />}
                              Mark complete
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
