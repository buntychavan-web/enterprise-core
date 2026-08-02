import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, Mail, Phone, Search } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { resourceApi, type ResourceRecord } from "@/lib/api-client";
import { useTenant } from "@/lib/tenant-context";

export const Route = createFileRoute("/_app/directory")({
  head: () => ({
    meta: [
      { title: "Company Directory — EWOS" },
      { name: "description", content: "Search employees across the company." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DirectoryPage,
});

// Sprint 24F — this screen used to render lib/mock/workspace.ts's DIRECTORY sample data with
// no backend behind it at all. It now reads real employees from GET /api/v1/employees
// (com.ewos.employee.api.EmployeeController.search), the same endpoint the Employees admin
// screen (_app.employees.tsx) uses. Employee has no "designation"/"location" fields, so this
// card shows what the backend actually has: display name, work email, phone, org unit, and
// employment status.
type EmployeeRecord = ResourceRecord & {
  displayName?: string;
  workEmail?: string;
  phone?: string;
  primaryOrgUnitCode?: string;
  status?: string;
};

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[parts.length - 1]?.[0] ?? "")).toUpperCase();
}

function DirectoryPage() {
  const { apiOptions } = useTenant();
  const [people, setPeople] = useState<EmployeeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    // A directory search screen wants "browse everyone", not one paginated slice — request a
    // large single page rather than building full server-side pagination UI here.
    const api = resourceApi<EmployeeRecord>("/employees", {
      ...apiOptions,
      extraQuery: { ...apiOptions.extraQuery, size: "1000" },
    });
    api.list().then((res) => {
      if (cancelled) return;
      setPeople(res.items);
      setUnavailable(res.unavailable);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [apiOptions]);

  const departments = useMemo(
    () =>
      Array.from(
        new Set(people.map((p) => p.primaryOrgUnitCode).filter((d): d is string => !!d)),
      ).sort(),
    [people],
  );

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return people.filter((p) => {
      if (dept !== "all" && p.primaryOrgUnitCode !== dept) return false;
      if (!needle) return true;
      return (
        (p.displayName ?? "").toLowerCase().includes(needle) ||
        (p.workEmail ?? "").toLowerCase().includes(needle) ||
        (p.primaryOrgUnitCode ?? "").toLowerCase().includes(needle)
      );
    });
  }, [people, q, dept]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Company Directory"
        description={
          loading
            ? "Loading employees…"
            : `${people.length} people across ${departments.length} departments.`
        }
      />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading directory…
        </div>
      ) : unavailable ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Search}
              title="Directory unavailable"
              description="The employee directory endpoint (GET /api/v1/employees) did not respond. Try again shortly."
            />
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative w-full sm:max-w-sm">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, email, department…"
                className="pl-8"
              />
            </div>
            <Select value={dept} onValueChange={setDept}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {departments.map((d) => (
                  <SelectItem key={d} value={d}>
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="text-xs text-muted-foreground sm:ml-auto">
              {filtered.length} of {people.length}
            </div>
          </div>

          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={Search}
                  title="No matches"
                  description="Try a different name, email or department."
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((p) => (
                <PersonCard key={String(p.id)} p={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function PersonCard({ p }: { p: EmployeeRecord }) {
  const name = p.displayName ?? "Unnamed employee";
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              to="/employees/$id"
              params={{ id: String(p.id) }}
              className="truncate text-sm font-semibold text-foreground hover:text-primary"
            >
              {name}
            </Link>
            {p.status ? (
              <div className="truncate text-xs text-muted-foreground">{p.status}</div>
            ) : null}
            {p.primaryOrgUnitCode ? (
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Building2 className="h-3 w-3" /> {p.primaryOrgUnitCode}
                </span>
              </div>
            ) : null}
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {p.workEmail ? (
                <a
                  href={`mailto:${p.workEmail}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" /> Email
                </a>
              ) : null}
              {p.phone ? (
                <a
                  href={`tel:${p.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" /> Call
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
