import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, CheckCircle2, ClipboardList, Sparkles, Users } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/tenant-context";
import { ApiError, onboardingDashboardApi, type OnboardingDashboardDto } from "@/lib/api-client";

export const Route = createFileRoute("/_app/onboarding")({
  head: () => ({
    meta: [
      { title: "Onboarding Dashboard — EWOS" },
      { name: "description", content: "Live onboarding plan metrics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingDashboardPage,
});

function OnboardingDashboardPage() {
  const { activeCompanyId } = useTenant();
  const [dashboard, setDashboard] = useState<OnboardingDashboardDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);

    onboardingDashboardApi
      .dashboard(activeCompanyId)
      .then((d) => {
        if (!cancelled) setDashboard(d);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) setUnavailable(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [activeCompanyId]);

  const totalPlans = dashboard
    ? dashboard.plansPlanned +
      dashboard.plansInProgress +
      dashboard.plansCompleted +
      dashboard.plansCancelled
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Onboarding"
        title="Dashboard"
        description="Live counts across new-hire onboarding plans, by status."
      />

      {!activeCompanyId ? (
        <EmptyState
          icon={Sparkles}
          title="Select a company"
          description="Choose a company from the switcher above to view onboarding metrics."
        />
      ) : unavailable ? (
        <EmptyState
          title="Onboarding APIs unavailable"
          description="Could not reach the onboarding backend."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Total plans"
              icon={<Users className="h-5 w-5" />}
              value={totalPlans}
              loading={loading}
              hint="All onboarding plans on record"
            />
            <StatCard
              label="Planned"
              icon={<ClipboardList className="h-5 w-5" />}
              value={dashboard?.plansPlanned}
              loading={loading}
              hint="Not yet started"
            />
            <StatCard
              label="In progress"
              icon={<Sparkles className="h-5 w-5" />}
              value={dashboard?.plansInProgress}
              loading={loading}
              hint="Active new hires"
            />
            <StatCard
              label="Completed"
              icon={<CheckCircle2 className="h-5 w-5" />}
              value={dashboard?.plansCompleted}
              loading={loading}
              hint="Fully onboarded"
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Plans by status</CardTitle>
              <Link to="/onboarding-plans" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 text-sm text-muted-foreground">Loading…</div>
              ) : !dashboard || dashboard.byStatus.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No onboarding plans yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {dashboard.byStatus.map((b) => (
                    <li
                      key={b.status}
                      className="flex items-center justify-between px-5 py-3 text-sm"
                    >
                      <span className="font-medium text-foreground">
                        {b.status.replace(/_/g, " ")}
                      </span>
                      <span className="tabular-nums text-muted-foreground">{b.count}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Quick links</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Link
                to="/onboarding-plans"
                className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <ClipboardList className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between text-sm font-medium text-foreground">
                    Plans &amp; Tasks
                    <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Manage plans, tasks, and reassignment.
                  </span>
                </span>
              </Link>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
