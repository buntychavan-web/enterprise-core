import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { useAuth } from "@/lib/auth-context";

/** Mirrors UserRequest on the backend (UserController). */
const FIELDS: CrudField[] = [
  { name: "username", label: "Username", required: true },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "enabled",
    label: "Enabled",
    type: "select",
    options: [
      { value: "true", label: "Enabled" },
      { value: "false", label: "Disabled" },
    ],
  },
  { name: "lastLoginAt", label: "Last sign-in", readOnly: true },
];

export const Route = createFileRoute("/_app/users")({
  head: () => ({
    meta: [
      { title: "Users — EWOS" },
      { name: "description", content: "User accounts, roles and access management." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: UsersPage,
});

function UsersPage() {
  const { hasRole, hasPermission } = useAuth();
  const isAdmin = hasRole("ADMIN") || hasRole("ROLE_ADMIN") || hasPermission("USER_WRITE");

  return (
    <CrudScreen
      title="Users"
      description="User accounts, roles, and access management."
      resourcePath="/users"
      singular="User"
      fields={FIELDS}
      canCreate={isAdmin}
      canEdit={isAdmin}
      canDelete={isAdmin}
    />
  );
}
