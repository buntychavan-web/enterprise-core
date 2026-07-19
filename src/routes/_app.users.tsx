import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";

const FIELDS: CrudField[] = [
  { name: "username", label: "Username", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  { name: "firstName", label: "First name" },
  { name: "lastName", label: "Last name" },
  { name: "role", label: "Role", placeholder: "e.g. ADMIN, HR, EMPLOYEE" },
  { name: "status", label: "Status", placeholder: "ACTIVE / INACTIVE" },
];

export const Route = createFileRoute("/_app/users")({
  head: () => ({
    meta: [{ title: "Users — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <CrudScreen
      title="Users"
      description="User accounts, roles, and access management."
      resourcePath="/users"
      singular="User"
      fields={FIELDS}
    />
  ),
});
