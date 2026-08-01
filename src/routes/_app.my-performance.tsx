import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowUpRight, Award, CheckCircle2, ClipboardList, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatCard } from "@/components/ewos/StatCard";
import { AppraisalStatusChip } from "@/components/ewos/PerformanceStatusChips";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, performanceSelfServiceApi, type AppraisalDto } from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-performance")({
  head: () => ({
    meta: [{ title: "Performance Dashboard — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyPerformancePage,
});

const QUICK_LINKS = [
  {
    to: "/my-goals",
    title: "Goals & KPI",
    description: "Track and update your goals.",
    icon: Sparkles,
  },
  {
    to: "/my-competencies",
    title: "Competencies",
    description: "Your current competency levels.",
    icon: Award,
  },
  {
    to: "/my-development-plan",
    title: "Development Plan",
    description: "Growth actions and progress.",
    icon: ClipboardList,
  },
  {
    to: "/my-appraisal-history",
    title: "Appraisal History",
    description: "Every past appraisal.",
    icon: ClipboardList,
  },
  {
    to: "/my-performance-timeline",
    title: "Performance Timeline",
    description: "Chronological review activity.",
    icon: ClipboardList,
  },
] as const;

function MyPerformancePage() {
  const [appraisals, setAppraisals] = useState<AppraisalDto[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    performanceSelfServiceApi
      .myAppraisals()
      .then((data) => !cancelled && setAppraisals(data))
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load your performance data.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, []);

  const needsMyAction = appraisals?.filter((a) => a.status === "PENDING_SELF").length ?? 0;
  const withOthers =
    appraisals?.filter(
      (a) =>
        a.status === "PENDING_MANAGER" ||
        a.status === "PENDING_REVIEWER" ||
        a.status === "CALIBRATION" ||
        a.status === "PENDING_APPROVAL",
    ).length ?? 0;
  const finalised = appraisals?.filter((a) => a.status === "FINALISED").length ?? 0;
  const recent = (appraisals ?? []).slice(0, 5);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="Performance Dashboard"
        description="Your appraisal, goals, competencies, and development at a glance."
      />

      {error ? (
        <EmptyState title="Couldn't load your performance data" description={error} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Needs your action"
              icon={<Award className="h-5 w-5" />}
              value={needsMyAction}
              loading={loading}
              hint="Self review pending"
            />
            <StatCard
              label="With others"
              icon={<ClipboardList className="h-5 w-5" />}
              value={withOthers}
              loading={loading}
              hint="Manager, reviewer, or calibration"
            />
            <StatCard
              label="Finalised"
              icon={<CheckCircle2 className="h-5 w-5" />}
              value={finalised}
              loading={loading}
            />
            <StatCard
              label="Total appraisals"
              icon={<ClipboardList className="h-5 w-5" />}
              value={appraisals?.length}
              loading={loading}
            />
          </div>

          <Card>
            <CardHeader className="flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-semibold">Recent appraisals</CardTitle>
              <Link to="/my-appraisal-history" className="text-xs text-primary hover:underline">
                View all
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-5 text-sm text-muted-foreground">Loading…</div>
              ) : recent.length === 0 ? (
                <div className="p-5 text-sm text-muted-foreground">No appraisals yet.</div>
              ) : (
                <ul className="divide-y divide-border">
                  {recent.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-5 py-3 text-sm">
                      <Link
                        to="/my-appraisal"
                        className="font-medium text-foreground hover:underline"
                      >
                        Appraisal {a.id.slice(0, 8)}
                      </Link>
                      <AppraisalStatusChip status={a.status} />
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
              {QUICK_LINKS.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  className="group flex items-start gap-3 rounded-md border border-border p-3 transition-colors hover:border-primary/40 hover:bg-primary/5"
                >
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                    <l.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between text-sm font-medium text-foreground">
                      {l.title}
                      <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary" />
                    </span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {l.description}
                    </span>
                  </span>
                </Link>
              ))}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
