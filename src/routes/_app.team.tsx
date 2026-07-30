import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Mail, Phone, UserSquare2, Users } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { employeeName, employeesApi, initials, type EmployeeResponse } from "@/lib/api-client";
import { formatDate, humanizeEnum } from "@/lib/format";

export const Route = createFileRoute("/_app/team")({
  head: () => ({
    meta: [
      { title: "My Team — EWOS" },
      { name: "description", content: "Your manager, direct reports and team." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const me = useQuery({
    queryKey: ["employees", "me"],
    queryFn: ({ signal }) => employeesApi.me(signal),
  });

  const reports = useQuery({
    queryKey: ["employees", "me", "reports"],
    queryFn: ({ signal }) => employeesApi.myReports(signal),
  });

  const managerId = me.data?.managerEmployeeId;
  const manager = useQuery({
    queryKey: ["employees", managerId],
    queryFn: ({ signal }) => employeesApi.get(managerId!, signal),
    enabled: !!managerId,
  });

  const team = reports.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="My Team"
        description="Your reporting line and direct reports."
      />

      <QueryState
        isLoading={me.isLoading}
        error={me.error}
        onRetry={() => void me.refetch()}
        label="your employee record"
      >
        {me.data && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">You</CardTitle>
            </CardHeader>
            <CardContent>
              <PersonRow person={me.data} />
            </CardContent>
          </Card>
        )}
      </QueryState>

      {managerId && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <QueryState
              isLoading={manager.isLoading}
              error={manager.error}
              onRetry={() => void manager.refetch()}
              label="your manager"
            >
              {manager.data && <PersonRow person={manager.data} />}
            </QueryState>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Direct reports ({team.length})</CardTitle>
          {team.length > 0 && <StatusChip tone="info">Reporting to you</StatusChip>}
        </CardHeader>
        <CardContent>
          <QueryState
            isLoading={reports.isLoading}
            error={reports.error}
            onRetry={() => void reports.refetch()}
            label="your direct reports"
          >
            {team.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No direct reports"
                description="Employees who report to you will appear here."
              />
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {team.map((p) => (
                  <PersonRow key={p.id} person={p} />
                ))}
              </div>
            )}
          </QueryState>
        </CardContent>
      </Card>
    </div>
  );
}

function PersonRow({ person }: { person: EmployeeResponse }) {
  const name = employeeName(person);
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">{initials(name)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link
          to="/employees/$id"
          params={{ id: person.id }}
          className="truncate text-sm font-semibold text-foreground hover:text-primary"
        >
          {name || "Unnamed employee"}
        </Link>
        <div className="truncate text-xs text-muted-foreground">
          {person.employeeNumber ?? "—"} · {person.primaryOrgUnitCode ?? "Unassigned"}
          {person.hireDate ? ` · Joined ${formatDate(person.hireDate)}` : ""}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {person.workEmail && (
            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
              <a href={`mailto:${person.workEmail}`}>
                <Mail className="mr-1 h-3 w-3" aria-hidden /> Email
              </a>
            </Button>
          )}
          {person.phone && (
            <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
              <a href={`tel:${person.phone.replace(/\s+/g, "")}`}>
                <Phone className="mr-1 h-3 w-3" aria-hidden /> Call
              </a>
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
            <Link to="/employees/$id" params={{ id: person.id }}>
              <UserSquare2 className="mr-1 h-3 w-3" aria-hidden /> Profile
            </Link>
          </Button>
          {person.status && person.status !== "ACTIVE" && (
            <StatusChip tone="warning">{humanizeEnum(person.status)}</StatusChip>
          )}
        </div>
      </div>
    </div>
  );
}
