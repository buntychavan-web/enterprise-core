import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { Building2, Contact2, Download, Mail, Phone, Search } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { DataPagination } from "@/components/ewos/DataPagination";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import {
  employeeName,
  employeesApi,
  initials,
  organizationApi,
  type EmployeeResponse,
} from "@/lib/api-client";
import { downloadCsv, timestampedName } from "@/lib/export";
import { humanizeEnum } from "@/lib/format";

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

const PAGE_SIZE = 24;
const ALL = "all";

function DirectoryPage() {
  const [q, setQ] = useState("");
  const [unitId, setUnitId] = useState(ALL);
  const [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebouncedValue(q, 300);

  const units = useQuery({
    queryKey: ["organization", "units", "DEPARTMENT"],
    queryFn: ({ signal }) =>
      organizationApi.units.list({ page: 0, size: 200, unitTypeCode: "DEPARTMENT" }, signal),
  });

  const people = useQuery({
    queryKey: ["directory", debouncedQ, unitId, status, page],
    queryFn: ({ signal }) =>
      employeesApi.search(
        {
          page: page - 1,
          size: PAGE_SIZE,
          sort: "firstName,asc",
          q: debouncedQ || undefined,
          orgUnitId: unitId === ALL ? undefined : unitId,
          status: status === ALL ? undefined : status,
        },
        signal,
      ),
    placeholderData: keepPreviousData,
  });

  const rows = useMemo(() => {
    const all = people.data?.content ?? [];
    const needle = debouncedQ.trim().toLowerCase();
    if (!needle) return all;
    // The backend may ignore `q`; this keeps filtering correct either way.
    return all.filter((p) =>
      [employeeName(p), p.workEmail, p.employeeNumber, p.primaryOrgUnitCode]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle)),
    );
  }, [people.data, debouncedQ]);

  const total = people.data?.totalElements ?? 0;

  const exportCsv = () => {
    downloadCsv(timestampedName("directory"), rows, [
      { key: "employeeNumber", header: "Employee #", value: (r) => r.employeeNumber },
      { key: "name", header: "Name", value: (r) => employeeName(r) },
      { key: "email", header: "Work email", value: (r) => r.workEmail },
      { key: "phone", header: "Phone", value: (r) => r.phone },
      { key: "unit", header: "Org unit", value: (r) => r.primaryOrgUnitCode },
      { key: "status", header: "Status", value: (r) => r.status },
    ]);
  };

  const reset = () => {
    setQ("");
    setUnitId(ALL);
    setStatus("ACTIVE");
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Company Directory"
        description="Search colleagues by name, org unit or employment status."
        actions={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search
            className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search name, email, employee number…"
            aria-label="Search the directory"
            className="pl-8"
          />
        </div>

        <Select
          value={unitId}
          onValueChange={(v) => {
            setUnitId(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-52" aria-label="Filter by department">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All departments</SelectItem>
            {(units.data?.content ?? []).map((u) => (
              <SelectItem key={u.id} value={String(u.id)}>
                {u.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Filter by status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>Any status</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="ON_LEAVE">On leave</SelectItem>
            <SelectItem value="SUSPENDED">Suspended</SelectItem>
            <SelectItem value="TERMINATED">Terminated</SelectItem>
            <SelectItem value="PRE_HIRE">Pre-hire</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="sm" onClick={reset} className="sm:ml-auto">
          Reset
        </Button>
      </div>

      <QueryState
        isLoading={people.isLoading}
        error={people.error}
        onRetry={() => void people.refetch()}
        label="the directory"
      >
        {rows.length === 0 ? (
          <Card>
            <CardContent className="p-6">
              <EmptyState
                icon={Contact2}
                title="No people found"
                description="Try a different name, department or status filter."
                action={
                  <Button size="sm" variant="outline" onClick={reset}>
                    Clear filters
                  </Button>
                }
              />
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((p) => (
                <PersonCard key={p.id} person={p} />
              ))}
            </div>
            <div className="rounded-lg border border-border bg-card">
              <DataPagination
                page={page}
                pageSize={PAGE_SIZE}
                total={total}
                onPageChange={setPage}
              />
            </div>
          </>
        )}
      </QueryState>
    </div>
  );
}

function PersonCard({ person }: { person: EmployeeResponse }) {
  const name = employeeName(person);
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                to="/employees/$id"
                params={{ id: person.id }}
                className="truncate text-sm font-semibold text-foreground hover:text-primary"
              >
                {name || "Unnamed employee"}
              </Link>
              {person.status && person.status !== "ACTIVE" && (
                <StatusChip tone={person.status === "TERMINATED" ? "danger" : "warning"}>
                  {humanizeEnum(person.status)}
                </StatusChip>
              )}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {person.employeeNumber ?? "—"}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" aria-hidden />
                {person.primaryOrgUnitCode ?? "Unassigned"}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              {person.workEmail && (
                <a
                  href={`mailto:${person.workEmail}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Mail className="h-3 w-3" aria-hidden /> Email
                </a>
              )}
              {person.phone && (
                <a
                  href={`tel:${person.phone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1 text-primary hover:underline"
                >
                  <Phone className="h-3 w-3" aria-hidden /> Call
                </a>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
