import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, Mail, Phone } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, resourceApi, DEFAULT_TENANT_ID, type ResourceRecord } from "@/lib/api-client";

export const Route = createFileRoute("/_app/employees/$id")({
  head: ({ params }) => ({
    meta: [{ title: `Employee ${params.id} — EWOS` }, { name: "robots", content: "noindex" }],
  }),
  component: EmployeeProfilePage,
});

// Matches com.ewos.employee.api.dto.EmployeeResponse exactly (Sprint 13 fix — this
// screen previously always rendered a hardcoded SAMPLE_EMPLOYEE regardless of the
// id in the URL, including fields — education, family, bank, documents, assets —
// that don't exist anywhere in the backend's Employee model).
type EmployeeResponse = ResourceRecord & {
  id: string;
  employeeNumber?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  displayName?: string;
  workEmail?: string;
  personalEmail?: string;
  phone?: string;
  dateOfBirth?: string;
  genderCode?: string;
  primaryOrgUnitId?: string;
  primaryOrgUnitCode?: string;
  managerEmployeeId?: string;
  employmentTypeId?: string;
  employmentTypeCode?: string;
  hireDate?: string;
  terminationDate?: string;
  status?: "ACTIVE" | "ON_LEAVE" | "SUSPENDED" | "TERMINATED";
};

const employeesApi = resourceApi<EmployeeResponse>("/employees");

function EmployeeProfilePage() {
  const { id } = Route.useParams();
  const [employee, setEmployee] = useState<EmployeeResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setNotFound(false);
    employeesApi
      .get(id)
      .then((data) => {
        if (!cancelled) setEmployee(data);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          setNotFound(true);
        } else {
          setError(err instanceof Error ? err.message : "Failed to load employee.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link to="/employees">
            <ArrowLeft className="h-4 w-4" />
            Back to Employees
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : notFound ? (
        <EmptyState
          title="Employee not found"
          description={`No employee with id "${id}" under tenant ${DEFAULT_TENANT_ID}. Note: this screen queries the tenant placeholder documented in lib/api-client.ts — a real Tenant module doesn't exist yet.`}
        />
      ) : error ? (
        <div className="p-8 text-center">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      ) : employee ? (
        <EmployeeDetail employee={employee} />
      ) : null}
    </div>
  );
}

function EmployeeDetail({ employee }: { employee: EmployeeResponse }) {
  const fullName =
    employee.displayName ||
    [employee.firstName, employee.middleName, employee.lastName].filter(Boolean).join(" ") ||
    employee.employeeNumber ||
    String(employee.id);
  const initials = ((employee.firstName?.[0] ?? "") + (employee.lastName?.[0] ?? "")).toUpperCase();

  const statusTone =
    employee.status === "ACTIVE"
      ? "success"
      : employee.status === "ON_LEAVE"
        ? "warning"
        : employee.status === "SUSPENDED"
          ? "danger"
          : "neutral";

  return (
    <>
      <Card>
        <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 p-5 sm:flex sm:flex-wrap sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
              {initials || "?"}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold sm:text-2xl">{fullName}</h1>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
                <span>{employee.employmentTypeCode ?? "—"}</span>
                <span aria-hidden>•</span>
                <span>{employee.primaryOrgUnitCode ?? "—"}</span>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {employee.status && <StatusChip tone={statusTone}>{employee.status}</StatusChip>}
                {employee.employeeNumber && (
                  <StatusChip tone="neutral">{employee.employeeNumber}</StatusChip>
                )}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {employee.workEmail && (
              <Button variant="outline" size="sm" asChild>
                <a href={`mailto:${employee.workEmail}`}>
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              </Button>
            )}
            {employee.phone && (
              <Button variant="outline" size="sm" asChild>
                <a href={`tel:${employee.phone}`}>
                  <Phone className="h-4 w-4" />
                  Call
                </a>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <SectionCard title="Personal">
          <Field label="Date of birth" value={employee.dateOfBirth} />
          <Field label="Gender code" value={employee.genderCode} />
        </SectionCard>

        <SectionCard title="Contact">
          <Field
            label="Work email"
            value={employee.workEmail}
            icon={<Mail className="h-3.5 w-3.5" />}
          />
          <Field label="Personal email" value={employee.personalEmail} />
          <Field label="Phone" value={employee.phone} icon={<Phone className="h-3.5 w-3.5" />} />
        </SectionCard>

        <SectionCard title="Employment">
          <Field label="Employee number" value={employee.employeeNumber} />
          <Field label="Employment type" value={employee.employmentTypeCode} />
          <Field label="Org unit" value={employee.primaryOrgUnitCode} />
          <Field label="Manager (employee ID)" value={employee.managerEmployeeId} />
          <Field label="Hire date" value={employee.hireDate} />
          <Field label="Termination date" value={employee.terminationDate} />
        </SectionCard>
      </div>

      <p className="text-xs text-muted-foreground">
        This screen shows exactly the fields the backend's EmployeeResponse returns. Education,
        family, bank details, documents, assets, and a timeline are not part of the current Employee
        data model — there is no Person/biographic module to source them from (see
        SPRINT_13_COMPLETION_REPORT.md).
      </p>
    </>
  );
}

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold">{title}</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        {children}
      </CardContent>
    </Card>
  );
}

function Field({
  label,
  value,
  icon,
}: {
  label: string;
  value?: string | null;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-1.5 text-sm text-foreground">
        {icon}
        {value || "—"}
      </div>
    </div>
  );
}
