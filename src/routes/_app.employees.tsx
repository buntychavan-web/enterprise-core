import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { useTenant } from "@/lib/tenant-context";

// Field names match com.ewos.employee.api.dto.HireEmployeeRequest / EmployeeResponse
// exactly (Sprint 13 fix — the previous field set (employeeCode/email/designation/
// department/location/notes) didn't correspond to any backend request field).
const FIELDS: CrudField[] = [
  {
    name: "employeeNumber",
    label: "Employee Number",
    required: true,
    placeholder: "e.g. EMP-0001",
  },
  { name: "firstName", label: "First name", required: true },
  { name: "lastName", label: "Last name", required: true },
  { name: "middleName", label: "Middle name", listColumn: false },
  {
    name: "workEmail",
    label: "Work email",
    type: "email",
    required: true,
    placeholder: "name@company.com",
  },
  { name: "personalEmail", label: "Personal email", type: "email", listColumn: false },
  { name: "phone", label: "Phone", listColumn: false },
  { name: "genderCode", label: "Gender code", listColumn: false },
  {
    name: "hireDate",
    label: "Hire date",
    required: true,
    placeholder: "YYYY-MM-DD",
  },
];

export const Route = createFileRoute("/_app/employees")({
  head: () => ({
    meta: [{ title: "Employees — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { apiOptions } = useTenant();
  const employeesApiOptions = useMemo(
    () => ({ ...apiOptions, updateMethod: "PATCH" as const }),
    [apiOptions],
  );

  return (
    <CrudScreen
      title="Employees"
      description="Employee records, positions, and reporting lines."
      resourcePath="/employees"
      singular="Employee"
      fields={FIELDS}
      apiOptions={employeesApiOptions}
    />
  );
}
