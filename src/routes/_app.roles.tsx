import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { RoleImpactButton, impactSummary } from "@/components/ewos/RoleImpactPanel";
import { roleImpactApi, type ResourceRecord } from "@/lib/api-client";

// systemRole isn't a CrudField (it's read-only, driven by rowActionsDisabled
// below, not user-editable) — CreateRoleRequest/UpdateRoleRequest don't
// accept it either.
const FIELDS: CrudField[] = [
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea", listColumn: false },
  {
    name: "permissions",
    label: "Permissions",
    type: "permission-multiselect",
    listColumn: false,
  },
];

export const Route = createFileRoute("/_app/roles")({
  head: () => ({
    meta: [{ title: "Roles — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: () => (
    <CrudScreen
      title="Roles"
      description="System roles (read-only) and your tenant's custom roles, with permission assignment and usage-impact-gated delete."
      resourcePath="/roles"
      singular="Role"
      fields={FIELDS}
      rowActionsDisabled={(row: ResourceRecord) => row.systemRole === true}
      rowActionsDisabledLabel="System"
      extraRowActions={(row: ResourceRecord) => (
        <RoleImpactButton roleId={String(row.id)} roleName={String(row.name ?? "")} />
      )}
      deleteImpact={async (row: ResourceRecord) => {
        const impact = await roleImpactApi.of(String(row.id));
        return { canDelete: impact.canDelete, summary: impactSummary(impact) };
      }}
    />
  ),
});
