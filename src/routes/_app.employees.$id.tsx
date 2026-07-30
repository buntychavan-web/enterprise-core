import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  Building2,
  Clock,
  CreditCard,
  History,
  Mail,
  Phone,
  Users,
  Wallet,
} from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  attendanceApi,
  employeeName,
  employeesApi,
  initials,
  leaveApi,
  organizationApi,
  payrollApi,
  type EmployeeResponse,
  type ResourceRecord,
} from "@/lib/api-client";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatNumber,
  humanizeEnum,
  requestStatusTone,
} from "@/lib/format";

export const Route = createFileRoute("/_app/employees/$id")({
  head: () => ({
    meta: [{ title: "Employee profile — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: EmployeeProfilePage,
});

function employeeStatusTone(status?: string) {
  switch (status) {
    case "ACTIVE":
      return "success" as const;
    case "ON_LEAVE":
      return "warning" as const;
    case "SUSPENDED":
    case "TERMINATED":
      return "danger" as const;
    default:
      return "neutral" as const;
  }
}

/** Reads a value from a loosely typed backend record. */
function pick(record: ResourceRecord, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = (record as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function text(value: unknown): string {
  if (value === undefined || value === null || value === "") return "—";
  if (typeof value === "number") return value.toLocaleString();
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function EmployeeProfilePage() {
  const { id } = Route.useParams();

  const employee = useQuery({
    queryKey: ["employees", id],
    queryFn: ({ signal }) => employeesApi.get(id, signal),
  });

  const emp = employee.data;

  const manager = useQuery({
    queryKey: ["employees", emp?.managerEmployeeId],
    queryFn: ({ signal }) => employeesApi.get(emp!.managerEmployeeId!, signal),
    enabled: !!emp?.managerEmployeeId,
  });

  const unit = useQuery({
    queryKey: ["organization", "units", emp?.primaryOrgUnitId],
    queryFn: ({ signal }) => organizationApi.units.get(emp!.primaryOrgUnitId!, signal),
    enabled: !!emp?.primaryOrgUnitId,
  });

  const balances = useQuery({
    queryKey: ["leave", "balances", id],
    queryFn: ({ signal }) => leaveApi.employeeBalances(id, signal),
  });

  const timesheets = useQuery({
    queryKey: ["attendance", "timesheets", id],
    queryFn: ({ signal }) => attendanceApi.employeeTimesheets(id, { page: 0, size: 10 }, signal),
  });

  const payslips = useQuery({
    queryKey: ["payroll", "payslips", "employee", id],
    queryFn: ({ signal }) => payrollApi.payslipsForEmployee(id, { page: 0, size: 10 }, signal),
  });

  const compensation = useQuery({
    queryKey: ["payroll", "compensation", id],
    queryFn: ({ signal }) => payrollApi.compensationsForEmployee(id, signal),
  });

  const bankAccounts = useQuery({
    queryKey: ["payroll", "bank-accounts", id],
    queryFn: ({ signal }) => payrollApi.bankAccountsForEmployee(id, signal),
  });

  const identity = useQuery({
    queryKey: ["employees", id, "identity-history"],
    queryFn: ({ signal }) => employeesApi.identityHistory(id, signal),
  });

  const fullName = emp ? employeeName(emp) : "Employee";
  const contactRows = useMemo(
    () => [
      { label: "Work email", value: emp?.workEmail, icon: Mail },
      { label: "Personal email", value: emp?.personalEmail, icon: Mail },
      { label: "Phone", value: emp?.phone, icon: Phone },
    ],
    [emp],
  );

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

      <QueryState
        isLoading={employee.isLoading}
        error={employee.error}
        onRetry={() => void employee.refetch()}
        label="employee profile"
      >
        {!emp ? (
          <EmptyState
            icon={Users}
            title="Employee not found"
            description="This employee record is unavailable or you do not have access to it."
          />
        ) : (
          <>
            <Card>
              <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-4">
                  <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
                    {initials(fullName)}
                  </div>
                  <div className="min-w-0">
                    <h1 className="truncate text-xl font-semibold">{fullName}</h1>
                    <p className="truncate text-sm text-muted-foreground">
                      {emp.employeeNumber ? `#${emp.employeeNumber}` : "No employee number"}
                      {emp.employmentTypeCode ? ` · ${humanizeEnum(emp.employmentTypeCode)}` : ""}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <StatusChip tone={employeeStatusTone(emp.status)}>
                        {humanizeEnum(emp.status)}
                      </StatusChip>
                      {unit.data && <StatusChip tone="info">{unit.data.name}</StatusChip>}
                    </div>
                  </div>
                </div>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm sm:text-right">
                  <dt className="text-muted-foreground">Hire date</dt>
                  <dd className="font-medium">{formatDate(emp.hireDate)}</dd>
                  <dt className="text-muted-foreground">Manager</dt>
                  <dd className="font-medium">
                    {emp.managerEmployeeId
                      ? manager.isLoading
                        ? "Loading…"
                        : manager.data
                          ? employeeName(manager.data)
                          : emp.managerEmployeeId
                      : "—"}
                  </dd>
                </dl>
              </CardContent>
            </Card>

            <Tabs defaultValue="overview">
              <div className="overflow-x-auto">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="leave">Leave</TabsTrigger>
                  <TabsTrigger value="attendance">Attendance</TabsTrigger>
                  <TabsTrigger value="compensation">Compensation</TabsTrigger>
                  <TabsTrigger value="payslips">Payslips</TabsTrigger>
                  <TabsTrigger value="bank">Bank</TabsTrigger>
                  <TabsTrigger value="history">History</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="overview" className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Contact</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {contactRows.map((row) => (
                      <div key={row.label} className="flex items-center gap-3 text-sm">
                        <row.icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <span className="w-32 shrink-0 text-muted-foreground">{row.label}</span>
                        <span className="truncate font-medium">{text(row.value)}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Personal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Facts
                      items={[
                        { label: "Date of birth", value: formatDate(emp.dateOfBirth) },
                        { label: "Gender", value: humanizeEnum(emp.genderCode) },
                        { label: "Employee ID", value: emp.id },
                        { label: "Linked user", value: text(emp.userId) },
                      ]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="employment" className="mt-4 grid gap-4 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Briefcase className="h-4 w-4" /> Employment
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Facts
                      items={[
                        { label: "Status", value: humanizeEnum(emp.status) },
                        { label: "Type", value: humanizeEnum(emp.employmentTypeCode) },
                        { label: "Hire date", value: formatDate(emp.hireDate) },
                        { label: "Termination date", value: formatDate(emp.terminationDate) },
                      ]}
                    />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Building2 className="h-4 w-4" /> Organization
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Facts
                      loading={unit.isLoading}
                      items={[
                        { label: "Unit", value: unit.data?.name ?? text(emp.primaryOrgUnitCode) },
                        { label: "Unit type", value: humanizeEnum(unit.data?.unitTypeCode) },
                        { label: "Cost centre", value: text(unit.data?.costCenterCode) },
                        { label: "Country", value: text(unit.data?.countryCode) },
                      ]}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="leave" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Leave balances</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <QueryState
                      isLoading={balances.isLoading}
                      error={balances.error}
                      onRetry={() => void balances.refetch()}
                      label="leave balances"
                    >
                      {(balances.data ?? []).length === 0 ? (
                        <EmptyState
                          icon={Clock}
                          title="No balances"
                          description="No leave entitlements are configured for this employee."
                        />
                      ) : (
                        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                          {(balances.data ?? []).map((b, i) => (
                            <div
                              key={`${b.leaveTypeCode ?? i}`}
                              className="rounded-lg border border-border p-4"
                            >
                              <div className="text-sm font-medium">
                                {humanizeEnum(b.leaveTypeCode)}
                              </div>
                              <div className="mt-1 text-2xl font-semibold">
                                {formatNumber(b.availableDays)}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {formatNumber(b.usedDays)} used · {formatNumber(b.entitledDays)}{" "}
                                entitled
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="attendance" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Recent timesheets</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0 sm:p-0">
                    <QueryState
                      isLoading={timesheets.isLoading}
                      error={timesheets.error}
                      onRetry={() => void timesheets.refetch()}
                      label="timesheets"
                    >
                      {(timesheets.data?.content ?? []).length === 0 ? (
                        <EmptyState
                          icon={Clock}
                          title="No timesheets"
                          description="Nothing has been recorded for this employee yet."
                        />
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead className="text-right">Worked</TableHead>
                                <TableHead className="text-right">Overtime</TableHead>
                                <TableHead>Status</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(timesheets.data?.content ?? []).map((t) => (
                                <TableRow key={t.id}>
                                  <TableCell className="text-sm">
                                    {formatDate(t.periodStart)} – {formatDate(t.periodEnd)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatNumber(t.workedHours, " h")}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatNumber(t.overtimeHours, " h")}
                                  </TableCell>
                                  <TableCell>
                                    <StatusChip tone={requestStatusTone(t.status)}>
                                      {humanizeEnum(t.status)}
                                    </StatusChip>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compensation" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Wallet className="h-4 w-4" /> Compensation records
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <QueryState
                      isLoading={compensation.isLoading}
                      error={compensation.error}
                      onRetry={() => void compensation.refetch()}
                      label="compensation"
                    >
                      <RecordTable
                        rows={compensation.data ?? []}
                        emptyTitle="No compensation records"
                        columns={[
                          {
                            header: "Effective from",
                            render: (r) => formatDate(String(pick(r, "effectiveFrom", "startDate") ?? "")),
                          },
                          {
                            header: "Component",
                            render: (r) => text(pick(r, "componentName", "componentCode", "code")),
                          },
                          {
                            header: "Amount",
                            align: "right",
                            render: (r) => {
                              const amount = pick(r, "amount", "value", "monthlyAmount");
                              return typeof amount === "number"
                                ? formatMoney(amount, String(pick(r, "currency") ?? ""))
                                : text(amount);
                            },
                          },
                          { header: "Status", render: (r) => humanizeEnum(String(pick(r, "status") ?? "")) },
                        ]}
                      />
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="payslips" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Payslip history</CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <QueryState
                      isLoading={payslips.isLoading}
                      error={payslips.error}
                      onRetry={() => void payslips.refetch()}
                      label="payslips"
                    >
                      {(payslips.data?.content ?? []).length === 0 ? (
                        <EmptyState
                          icon={Wallet}
                          title="No payslips"
                          description="Payslips appear here once a payroll run is finalized."
                        />
                      ) : (
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Period</TableHead>
                                <TableHead>Pay date</TableHead>
                                <TableHead className="text-right">Gross</TableHead>
                                <TableHead className="text-right">Deductions</TableHead>
                                <TableHead className="text-right">Net</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {(payslips.data?.content ?? []).map((p) => (
                                <TableRow key={p.id}>
                                  <TableCell className="text-sm">
                                    {formatDate(p.periodStart)} – {formatDate(p.periodEnd)}
                                  </TableCell>
                                  <TableCell className="text-sm">{formatDate(p.payDate)}</TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatMoney(p.grossAmount, p.currency)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm">
                                    {formatMoney(p.deductionsAmount, p.currency)}
                                  </TableCell>
                                  <TableCell className="text-right text-sm font-semibold">
                                    {formatMoney(p.netAmount, p.currency)}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="bank" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <CreditCard className="h-4 w-4" /> Bank accounts
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <QueryState
                      isLoading={bankAccounts.isLoading}
                      error={bankAccounts.error}
                      onRetry={() => void bankAccounts.refetch()}
                      label="bank accounts"
                    >
                      <RecordTable
                        rows={bankAccounts.data ?? []}
                        emptyTitle="No bank accounts"
                        columns={[
                          { header: "Bank", render: (r) => text(pick(r, "bankName", "bank")) },
                          {
                            header: "Account",
                            render: (r) => text(pick(r, "accountNumberMasked", "accountNumber")),
                          },
                          { header: "IFSC / SWIFT", render: (r) => text(pick(r, "ifscCode", "swiftCode")) },
                          { header: "Primary", render: (r) => text(pick(r, "primary", "isPrimary")) },
                        ]}
                      />
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="history" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <History className="h-4 w-4" /> Identity history
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <QueryState
                      isLoading={identity.isLoading}
                      error={identity.error}
                      onRetry={() => void identity.refetch()}
                      label="identity history"
                    >
                      <RecordTable
                        rows={identity.data ?? []}
                        emptyTitle="No history"
                        columns={[
                          {
                            header: "Changed at",
                            render: (r) =>
                              formatDateTime(String(pick(r, "changedAt", "createdAt", "effectiveFrom") ?? "")),
                          },
                          { header: "Field", render: (r) => humanizeEnum(String(pick(r, "field", "attribute") ?? "")) },
                          { header: "From", render: (r) => text(pick(r, "oldValue", "previousValue")) },
                          { header: "To", render: (r) => text(pick(r, "newValue", "value")) },
                        ]}
                      />
                    </QueryState>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </QueryState>
    </div>
  );
}

function Facts({
  items,
  loading,
}: {
  items: Array<{ label: string; value: string }>;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {items.map((item) => (
          <Skeleton key={item.label} className="h-5 w-full" />
        ))}
      </div>
    );
  }
  return (
    <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
      {items.map((item) => (
        <div key={item.label} className="flex justify-between gap-3 sm:flex-col sm:justify-start">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="truncate font-medium">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function RecordTable({
  rows,
  columns,
  emptyTitle,
}: {
  rows: ResourceRecord[];
  columns: Array<{
    header: string;
    align?: "right";
    render: (row: ResourceRecord) => string;
  }>;
  emptyTitle: string;
}) {
  if (rows.length === 0) {
    return (
      <EmptyState
        icon={History}
        title={emptyTitle}
        description="Nothing has been recorded against this employee yet."
      />
    );
  }
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((c) => (
              <TableHead key={c.header} className={c.align === "right" ? "text-right" : undefined}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, i) => (
            <TableRow key={String(pick(row, "id") ?? i)}>
              {columns.map((c) => (
                <TableCell
                  key={c.header}
                  className={`text-sm${c.align === "right" ? " text-right" : ""}`}
                >
                  {c.render(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

export type { EmployeeResponse };
