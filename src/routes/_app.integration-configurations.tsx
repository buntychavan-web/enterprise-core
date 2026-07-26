import { createFileRoute } from "@tanstack/react-router";
import { CrudScreen } from "@/components/ewos/CrudScreen";
import { DEFAULT_COMPANY_ID, DEFAULT_TENANT_ID } from "@/lib/api-client";

// Sprint 14.4 — Integration Adapter Framework configuration. Reuses CrudScreen exactly as
// Sprint 14.3 established the convention (see _app.data-exchange.tsx / _app.client-approvals.tsx
// for the lifecycle-action screens that don't fit CrudScreen's generic create/edit/delete shape;
// this one is plain CRUD, so CrudScreen fits directly).

export const Route = createFileRoute("/_app/integration-configurations")({
  head: () => ({
    meta: [{ title: "Integration Configurations — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: IntegrationConfigurationsPage,
});

function IntegrationConfigurationsPage() {
  return (
    <CrudScreen
      title="Integration Configurations"
      description="Which adapter (REST / SFTP / CSV / EXCEL / FILE_UPLOAD) and connection settings a company uses per Data Exchange exchange type."
      resourcePath="/integration/configurations"
      singular="Configuration"
      apiOptions={{
        extraQuery: { companyId: DEFAULT_COMPANY_ID },
        extraBody: { tenantId: DEFAULT_TENANT_ID, companyId: DEFAULT_COMPANY_ID },
        updateMethod: "PATCH",
      }}
      fields={[
        {
          name: "exchangeType",
          label: "Exchange type",
          required: true,
          placeholder: "PAYROLL_RUN_EXPORT",
        },
        {
          name: "adapterType",
          label: "Adapter type",
          required: true,
          createOnly: true,
          placeholder: "REST | SFTP | CSV | EXCEL | FILE_UPLOAD",
        },
        {
          name: "configJson",
          label: "Config JSON",
          type: "textarea",
          required: true,
          placeholder: '{"outputDirectory": "/exports"}',
        },
        { name: "active", label: "Active", listColumn: true },
      ]}
    />
  );
}
