import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { Switch } from "@/components/ui/switch";
import { ApiError, usersApi, type ResourceRecord } from "@/lib/api-client";
import { toast } from "sonner";

// Field names match com.ewos.identity.api.dto.CreateUserRequest / UpdateUserRequest
// exactly (Sprint 13 fix — firstName/lastName/role/status were never real fields on
// either DTO). Sprint 2.3 closes the two gaps this comment used to name: role
// assignment ("roles" reads UserResponse.roles, writes roleIds — see CrudScreen's
// role-multiselect field type) and enable/disable (inline Switch below, calling
// PATCH /users/{id}/status directly, bypassing the edit dialog).
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
  { name: "roles", label: "Roles", type: "role-multiselect", listColumn: false },
];

function StatusToggle({ row }: { row: ResourceRecord }) {
  const [enabled, setEnabled] = useState(row.enabled === true);
  const [saving, setSaving] = useState(false);

  const toggle = async (next: boolean) => {
    setSaving(true);
    try {
      await usersApi.setStatus(String(row.id), next);
      setEnabled(next);
      toast.success(next ? "User enabled" : "User disabled");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to update status.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span className="mr-1 inline-flex items-center gap-1.5 align-middle">
      {saving && <Loader2 className="h-3 w-3 animate-spin" />}
      <Switch checked={enabled} onCheckedChange={toggle} disabled={saving} aria-label="Enabled" />
    </span>
  );
}

export const Route = createFileRoute("/_app/users")({
  head: () => ({
    meta: [{ title: "Users — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <CrudScreen
      title="Users"
      description="User accounts, role assignment, and enable/disable access."
      resourcePath="/users"
      singular="User"
      fields={FIELDS}
      apiOptions={{ updateMethod: "PUT" }}
      extraRowActions={(row) => <StatusToggle key={String(row.id)} row={row} />}
    />
  ),
});
