import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { useAuth } from "@/lib/auth-context";

/** Mirrors EmployeeRequest on the backend (EmployeeController). */
const FIELDS: CrudField[] = [
  { name: "employeeNumber", label: "Employee no.", required: true, placeholder: "e.g. EMP-0001" },
  { name: "firstName", label: "First name", required: true },
  { name: "middleName", label: "Middle name", listColumn: false },
  { name: "lastName", label: "Last name", required: true },
  {
    name: "workEmail",
    label: "Work email",
    type: "email",
    required: true,
    placeholder: "name@company.com",
  },
  { name: "personalEmail", label: "Personal email", type: "email", listColumn: false },
  { name: "phone", label: "Phone", listColumn: false },
  { name: "dateOfBirth", label: "Date of birth", type: "date", listColumn: false },
  { name: "hireDate", label: "Hire date", type: "date" },
  { name: "primaryOrgUnitCode", label: "Org unit" },
  { name: "employmentTypeCode", label: "Employment type", listColumn: false },
  {
    name: "status",
    label: "Status",
    type: "select",
    options: [
      { value: "ACTIVE", label: "Active" },
      { value: "ON_LEAVE", label: "On leave" },
      { value: "SUSPENDED", label: "Suspended" },
      { value: "TERMINATED", label: "Terminated" },
      { value: "PRE_HIRE", label: "Pre-hire" },
    ],
  },
];

export const Route = createFileRoute("/_app/employees")({
  head: () => ({
    meta: [
      { title: "Employees — EWOS" },
      { name: "description", content: "Employee master records, positions and reporting lines." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  const { hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole("ADMIN") || hasRole("ROLE_ADMIN");
  const canWrite = isAdmin || hasRole("HR") || hasPermission("EMPLOYEE_WRITE");

  return (
    <CrudScreen
      title="Employees"
      description="Employee master — records, positions, and reporting lines."
      resourcePath="/employees"
      singular="Employee"
      fields={FIELDS}
      canCreate={canWrite}
      canEdit={canWrite}
      canDelete={isAdmin}
    />
  );
}
