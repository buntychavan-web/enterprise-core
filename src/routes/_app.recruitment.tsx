import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Briefcase } from "lucide-react";

import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { useRecruitmentAccess } from "@/hooks/use-recruitment-access";

export const Route = createFileRoute("/_app/recruitment")({
  component: RecruitmentLayout,
});

const TABS = [
  { to: "/recruitment", label: "Dashboard", exact: true },
  { to: "/recruitment/requisitions", label: "Requisitions", exact: false },
  { to: "/recruitment/pipeline", label: "Pipeline", exact: false },
  { to: "/recruitment/positions", label: "Positions", exact: false },
] as const;

function RecruitmentLayout() {
  const { canRead } = useRecruitmentAccess();

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Talent"
        title="Recruitment"
        description="Job positions, requisitions and the hiring pipeline."
      />

      <nav
        aria-label="Recruitment sections"
        className="-mx-1 flex gap-1 overflow-x-auto rounded-lg border border-border bg-card p-1"
      >
        {TABS.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            activeOptions={{ exact: t.exact }}
            className="min-h-10 shrink-0 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {canRead ? (
        <Outlet />
      ) : (
        <EmptyState
          icon={Briefcase}
          title="Recruitment access required"
          description="Your role does not include the RECRUITMENT_READ permission. Ask an administrator for access."
        />
      )}
    </div>
  );
}
