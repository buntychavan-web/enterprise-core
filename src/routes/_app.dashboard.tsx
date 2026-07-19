import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  UserSquare2,
  Users as UsersIcon,
  ArrowUpRight,
} from "lucide-react";
import { dashboardApi, type DashboardSummary } from "@/lib/api-client";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatCard } from "@/components/ewos/StatCard";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — EWOS" },
      { name: "description", content: "Overview of your workforce operations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardPage,
});

type Status = "loading" | "ready";

function DashboardPage() {
  const [status, setStatus] = useState<Status>("loading");
  const [summary, setSummary] = useState<DashboardSummary>({
    employees: null,
    users: null,
    departments: null,
    roles: null,
  });

  useEffect(() => {
    let cancelled = false;
    dashboardApi.summary().then((data) => {
      if (cancelled) return;
      setSummary(data);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = status === "loading";
  const cards = [
    { label: "Employees", value: summary.employees, icon: <UserSquare2 className="h-5 w-5" /> },
    { label: "Users", value: summary.users, icon: <UsersIcon className="h-5 w-5" /> },
    { label: "Departments", value: summary.departments, icon: <Building2 className="h-5 w-5" /> },
    { label: "Roles", value: summary.roles, icon: <ShieldCheck className="h-5 w-5" /> },
  ];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Overview of workforce entities in your organization."
      />

      <section aria-labelledby="metrics-heading">
        <h3 id="metrics-heading" className="sr-only">
          Key metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
            <StatCard
              key={c.label}
              label={c.label}
              icon={c.icon}
              value={c.value}
              loading={loading}
              unavailable={!loading && c.value === null}
            />
          ))}
        </div>
      </section>

      <section aria-labelledby="actions-heading">
        <h3
          id="actions-heading"
          className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
        >
          Quick actions
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ActionCard
            to="/users"
            title="User Management"
            description="Create, disable, and manage user accounts and access."
          />
          <ActionCard
            to="/employees"
            title="Employee Management"
            description="Maintain employee records, positions, and reporting lines."
          />
          <ActionCard
            to="/organization"
            title="Organization"
            description="Configure departments, locations, and organizational structure."
          />
        </div>
      </section>
    </div>
  );
}

function ActionCard({
  to,
  title,
  description,
}: {
  to: "/users" | "/employees" | "/organization";
  title: string;
  description: string;
}) {
  return (
    <Link to={to} className="group block">
      <Card className="transition-colors hover:border-primary/40 hover:bg-primary/5">
        <CardContent className="flex items-start justify-between gap-3 p-5">
          <div>
            <div className="text-sm font-semibold text-foreground">{title}</div>
            <p className="mt-1 text-sm text-muted-foreground">{description}</p>
          </div>
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
        </CardContent>
      </Card>
    </Link>
  );
}
