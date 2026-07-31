import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowUpRight,
  Briefcase,
  CalendarClock,
  ClipboardList,
  FileText,
  GitBranch,
  Handshake,
  UserSearch,
} from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  candidateApi,
  interviewRoundApi,
  jobApplicationApi,
  jobRequisitionApi,
  offerApi,
  preboardingApi,
  type InterviewRoundDto,
  type JobRequisitionDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/recruitment")({
  head: () => ({
    meta: [
      { title: "Recruitment Dashboard — EWOS" },
      { name: "description", content: "Live recruitment pipeline metrics." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: RecruitmentDashboardPage,
});

type Metrics = {
  openRequisitions: number | null;
  pendingApprovalRequisitions: number | null;
  activeCandidates: number | null;
  applicationsInterviewing: number | null;
  interviewsScheduled: number | null;
  offersExtended: number | null;
  offersPendingApproval: number | null;
  preboardingInProgress: number | null;
};

const emptyMetrics: Metrics = {
  openRequisitions: null,
  pendingApprovalRequisitions: null,
  activeCandidates: null,
  applicationsInterviewing: null,
  interviewsScheduled: null,
  offersExtended: null,
  offersPendingApproval: null,
  preboardingInProgress: null,
};

function RecruitmentDashboardPage() {
  const { activeCompanyId } = useTenant();
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics);
  const [openReqs, setOpenReqs] = useState<JobRequisitionDto[]>([]);
  const [upcomingInterviews, setUpcomingInterviews] = useState<InterviewRoundDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    if (!activeCompanyId) return;
    let cancelled = false;
    setLoading(true);
    setUnavailable(false);

    Promise.all([
      jobRequisitionApi.byStatus(activeCompanyId, "OPEN"),
      jobRequisitionApi.byStatus(activeCompanyId, "PENDING_APPROVAL"),
      candidateApi.list(activeCompanyId, "ACTIVE", 0, 1),
      jobApplicationApi.byStatus(activeCompanyId, "INTERVIEWING", 0, 1),
      interviewRoundApi.byStatus(activeCompanyId, "SCHEDULED"),
      offerApi.byStatus(activeCompanyId, "EXTENDED"),
      offerApi.byStatus(activeCompanyId, "PENDING_APPROVAL"),
      preboardingApi.byStatus(activeCompanyId, "IN_PROGRESS"),
    ])
      .then(
        ([
          openRequisitions,
          pendingReqs,
          activeCandidates,
          interviewingApps,
          scheduled,
          extended,
          offersPending,
          preboarding,
        ]) => {
          if (cancelled) return;
          setMetrics({
            openRequisitions: openRequisitions.length,
            pendingApprovalRequisitions: pendingReqs.length,
            activeCandidates: activeCandidates.totalElements,
            applicationsInterviewing: interviewingApps.totalElements,
            interviewsScheduled: scheduled.length,
            offersExtended: extended.length,
            offersPendingApproval: offersPending.length,
            preboardingInProgress: preboarding.length,
          });
          setOpenReqs(openRequisitions.slice(0, 5));
          setUpcomingInterviews(
            [...scheduled]
              .filter((r) => r.scheduledStart)
              .sort((a, b) => (a.scheduledStart! < b.scheduledStart! ? -1 : 1))
              .slice(0, 5),
          );
        },
      )
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

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Recruitment"
        title="Dashboard"
        description="Live counts across requisitions, candidates, interviews, offers, and preboarding."
      />

      {!activeCompanyId ? (
        <EmptyState
          icon={Briefcase}
          title="Select a company"
          description="Choose a company from the switcher above to view recruitment metrics."
        />
      ) : unavailable ? (
        <EmptyState
          title="Recruitment APIs unavailable"
          description="Could not reach the recruitment backend."
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open requisitions"
              icon={<FileText className="h-5 w-5" />}
              value={metrics.openRequisitions}
              loading={loading}
              hint="Currently open headcount"
            />
            <StatCard
              label="Pending approval"
              icon={<ClipboardList className="h-5 w-5" />}
              value={metrics.pendingApprovalRequisitions}
              loading={loading}
              hint="Requisitions awaiting decision"
            />
            <StatCard
              label="Active candidates"
              icon={<UserSearch className="h-5 w-5" />}
              value={metrics.activeCandidates}
              loading={loading}
              hint="In the active candidate pool"
            />
            <StatCard
              label="Applications interviewing"
              icon={<GitBranch className="h-5 w-5" />}
              value={metrics.applicationsInterviewing}
              loading={loading}
              hint="In the interviewing stage"
            />
            <StatCard
              label="Interviews scheduled"
              icon={<CalendarClock className="h-5 w-5" />}
              value={metrics.interviewsScheduled}
              loading={loading}
              hint="Upcoming interview rounds"
            />
            <StatCard
              label="Offers extended"
              icon={<Handshake className="h-5 w-5" />}
              value={metrics.offersExtended}
              loading={loading}
              hint="Awaiting candidate decision"
            />
            <StatCard
              label="Offers pending approval"
              icon={<Handshake className="h-5 w-5" />}
              value={metrics.offersPendingApproval}
              loading={loading}
              hint="Awaiting internal approval"
            />
            <StatCard
              label="Preboarding in progress"
              icon={<ClipboardList className="h-5 w-5" />}
              value={metrics.preboardingInProgress}
              loading={loading}
              hint="Between acceptance and joining"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">Open requisitions</CardTitle>
                <Link
                  to="/recruitment-requisitions"
                  className="text-xs text-primary hover:underline"
                >
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-5 text-sm text-muted-foreground">Loading…</div>
                ) : openReqs.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground">No open requisitions.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {openReqs.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between px-5 py-3 text-sm"
                      >
                        <div>
                          <div className="font-medium text-foreground">{r.title}</div>
                          <div className="text-xs text-muted-foreground">{r.requisitionNumber}</div>
                        </div>
                        <StatusChip tone="success">
                          {r.filledCount}/{r.headcount} filled
                        </StatusChip>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">Upcoming interviews</CardTitle>
                <Link to="/recruitment-interviews" className="text-xs text-primary hover:underline">
                  View all
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="p-5 text-sm text-muted-foreground">Loading…</div>
                ) : upcomingInterviews.length === 0 ? (
                  <div className="p-5 text-sm text-muted-foreground">No interviews scheduled.</div>
                ) : (
                  <ul className="divide-y divide-border">
                    {upcomingInterviews.map((r) => (
                      <li
                        key={r.id}
                        className="flex items-center justify-between px-5 py-3 text-sm"
                      >
                        <div>
                          <div className="font-medium text-foreground">{r.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {r.interviewType.replace(/_/g, " ")}
                          </div>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {r.scheduledStart?.slice(0, 16).replace("T", " ")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>

          <QuickLinks />
        </>
      )}
    </div>
  );
}

function QuickLinks() {
  const links: Array<{
    to:
      | "/recruitment-requisitions"
      | "/recruitment-positions"
      | "/recruitment-pipeline"
      | "/recruitment-candidates"
      | "/recruitment-interviews"
      | "/recruitment-offers"
      | "/recruitment-preboarding";
    title: string;
    description: string;
    icon: typeof Briefcase;
  }> = [
    {
      to: "/recruitment-requisitions",
      title: "Job Requisitions",
      description: "Request and approve headcount.",
      icon: FileText,
    },
    {
      to: "/recruitment-positions",
      title: "Positions",
      description: "Manage the position catalogue.",
      icon: Briefcase,
    },
    {
      to: "/recruitment-pipeline",
      title: "Pipeline",
      description: "Move applications forward.",
      icon: GitBranch,
    },
    {
      to: "/recruitment-candidates",
      title: "Candidates",
      description: "Browse the candidate pool.",
      icon: UserSearch,
    },
    {
      to: "/recruitment-interviews",
      title: "Interviews",
      description: "Schedule and score rounds.",
      icon: CalendarClock,
    },
    {
      to: "/recruitment-offers",
      title: "Offers",
      description: "Draft and extend offers.",
      icon: Handshake,
    },
    {
      to: "/recruitment-preboarding",
      title: "Preboarding",
      description: "Track joining readiness.",
      icon: ClipboardList,
    },
  ];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">Quick links</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {links.map((l) => (
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
              <span className="mt-0.5 block text-xs text-muted-foreground">{l.description}</span>
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
