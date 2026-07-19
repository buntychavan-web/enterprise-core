import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";

const FIELDS: CrudField[] = [
  { name: "employeeCode", label: "Employee Code", required: true, placeholder: "e.g. EMP-0001" },
  { name: "firstName", label: "First name", required: true },
  { name: "lastName", label: "Last name", required: true },
  { name: "email", label: "Email", type: "email", required: true, placeholder: "name@company.com" },
  { name: "phone", label: "Phone", listColumn: false },
  { name: "designation", label: "Designation", placeholder: "Job title" },
  { name: "department", label: "Department" },
  { name: "location", label: "Location", listColumn: false },
  { name: "dateOfJoining", label: "Date of joining", listColumn: false, placeholder: "YYYY-MM-DD" },
  { name: "notes", label: "Notes", type: "textarea", listColumn: false },
];

export const Route = createFileRoute("/_app/employees")({
  head: () => ({
    meta: [{ title: "Employees — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: EmployeesPage,
});

function EmployeesPage() {
  return (
    <CrudScreen
      title="Employees"
      description="Employee records, positions, and reporting lines."
      resourcePath="/employees"
      singular="Employee"
      fields={FIELDS}
    />
  );
}
