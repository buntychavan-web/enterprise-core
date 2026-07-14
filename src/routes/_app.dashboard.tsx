import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Building2,
  ShieldCheck,
  UserSquare2,
  Users as UsersIcon,
  ArrowUpRight,
} from "lucide-react";
import { usersApi } from "@/lib/api-client";

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

type CardState =
  | { status: "loading" }
  | { status: "ready"; value: number }
  | { status: "unavailable"; reason: string }
  | { status: "error"; message: string };

function DashboardPage() {
  const [users, setUsers] = useState<CardState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    usersApi
      .count()
      .then((value) => {
        if (!cancelled) setUsers({ status: "ready", value });
      })
      .catch((err: Error) => {
        if (!cancelled) setUsers({ status: "error", message: err.message });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <header>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Dashboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Overview of workforce entities in your organization.
        </p>
      </header>

      <section aria-labelledby="metrics-heading">
        <h3 id="metrics-heading" className="sr-only">
          Key metrics
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            label="Employees"
            icon={UserSquare2}
            state={{ status: "unavailable", reason: "Coming soon" }}
          />
          <MetricCard label="Users" icon={UsersIcon} state={users} />
          <MetricCard
            label="Departments"
            icon={Building2}
            state={{ status: "unavailable", reason: "Coming soon" }}
          />
          <MetricCard
            label="Roles"
            icon={ShieldCheck}
            state={{ status: "unavailable", reason: "Coming soon" }}
          />
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

function MetricCard({
  label,
  icon: Icon,
  state,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  state: CardState;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-2 min-h-[2rem] text-3xl font-semibold tracking-tight text-foreground">
            {state.status === "ready" && state.value.toLocaleString()}
            {state.status === "loading" && (
              <span className="inline-block h-6 w-16 rounded bg-muted align-middle" aria-label="Loading" />
            )}
            {(state.status === "unavailable" || state.status === "error") && (
              <span className="text-3xl text-muted-foreground">—</span>
            )}
          </div>
        </div>
        <span className="grid h-9 w-9 place-items-center rounded-md bg-muted text-muted-foreground">
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {state.status === "ready" && "Total records"}
        {state.status === "loading" && "Loading…"}
        {state.status === "unavailable" && state.reason}
        {state.status === "error" && state.message}
      </div>
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
    <Link
      to={to}
      className="group flex items-start justify-between gap-3 rounded-lg border border-border bg-card p-5 shadow-xs transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <div>
        <div className="text-sm font-semibold text-foreground">{title}</div>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary" />
    </Link>
  );
}
