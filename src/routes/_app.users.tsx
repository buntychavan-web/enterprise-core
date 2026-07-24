import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";

// Field names match com.ewos.identity.api.dto.CreateUserRequest / UpdateUserRequest
// exactly (Sprint 13 fix — firstName/lastName/role/status were never real fields on
// either DTO; role assignment (roleIds: Set<UUID>) and enable/disable
// (PATCH /users/{id}/status) are separate backend operations this generic form
// doesn't cover — see SPRINT_13_COMPLETION_REPORT.md "Remaining mock / gaps").
const FIELDS: CrudField[] = [
  { name: "username", label: "Username", required: true, createOnly: true },
  { name: "email", label: "Email", type: "email", required: true },
  {
    name: "password",
    label: "Password",
    required: true,
    createOnly: true,
    placeholder: "Only required when creating a user",
  },
];

export const Route = createFileRoute("/_app/users")({
  head: () => ({
    meta: [{ title: "Users — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <CrudScreen
      title="Users"
      description="User accounts and access management. Role assignment and enable/disable are not covered by this screen — see the Sprint 13 report."
      resourcePath="/users"
      singular="User"
      fields={FIELDS}
      apiOptions={{ updateMethod: "PUT" }}
    />
  ),
});
