import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Landmark, ShieldCheck, Users2 } from "lucide-react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { TenantAccessGrantScreen } from "@/components/ewos/TenantAccessGrantScreen";
import { useTenant } from "@/lib/tenant-context";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/tenant-management")({
  head: () => ({
    meta: [{ title: "Tenant Management — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: TenantManagementPage,
});

const STATUS_PLACEHOLDER = "ACTIVE | SUSPENDED | CLOSED";

const TENANT_FIELDS: CrudField[] = [
  { name: "code", label: "Code", required: true, placeholder: "e.g. ACME" },
  { name: "name", label: "Name", required: true },
  { name: "status", label: "Status", listColumn: false, placeholder: STATUS_PLACEHOLDER },
];

const COMPANY_FIELDS: CrudField[] = [
  { name: "clientId", label: "Client ID", required: true, placeholder: "UUID from Clients tab" },
  { name: "code", label: "Code", required: true, placeholder: "e.g. ACME-US" },
  { name: "name", label: "Name", required: true },
  { name: "countryCode", label: "Country code", listColumn: false, placeholder: "e.g. US" },
  { name: "status", label: "Status", listColumn: false, placeholder: STATUS_PLACEHOLDER },
];

const CLIENT_FIELDS: CrudField[] = [
  { name: "code", label: "Code", required: true, placeholder: "e.g. ACME" },
  { name: "legalName", label: "Legal name", required: true },
  { name: "onboardedAt", label: "Onboarded at", listColumn: false, placeholder: "YYYY-MM-DD" },
  { name: "status", label: "Status", listColumn: false, placeholder: STATUS_PLACEHOLDER },
];

const TABS = [
  { key: "tenants", title: "Tenants", icon: Landmark },
  { key: "companies", title: "Companies", icon: Building2 },
  { key: "clients", title: "Clients", icon: Users2 },
  { key: "grants", title: "Access Grants", icon: ShieldCheck },
] as const;

function TenantManagementPage() {
  const [active, setActive] = useState<(typeof TABS)[number]["key"]>("tenants");
  const { apiOptions } = useTenant();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Platform Administration
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Tenant Management</h1>
        <p className="text-sm text-muted-foreground">
          Tenants, companies, clients, and cross-tenant access grants.
        </p>
      </div>

      <nav
        aria-label="Tenant management sections"
        className="-mx-1 flex gap-1 overflow-x-auto pb-1"
      >
        {TABS.map((t) => {
          const Icon = t.icon;
          const isActive = t.key === active;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {t.title}
            </button>
          );
        })}
      </nav>

      {active === "tenants" && (
        <CrudScreen
          key="tenants"
          title="Tenants"
          description="Platform isolation / licensing boundary — one EWOS operating instance per tenant."
          resourcePath="/tenants"
          singular="Tenant"
          fields={TENANT_FIELDS}
        />
      )}
      {active === "companies" && (
        <CrudScreen
          key="companies"
          title="Companies"
          description="Legal entities under a client, scoped to your tenant."
          resourcePath="/companies"
          singular="Company"
          fields={COMPANY_FIELDS}
          apiOptions={apiOptions}
        />
      )}
      {active === "clients" && (
        <CrudScreen
          key="clients"
          title="Clients"
          description="Commercial customer relationships within your tenant."
          resourcePath="/clients"
          singular="Client"
          fields={CLIENT_FIELDS}
          apiOptions={apiOptions}
        />
      )}
      {active === "grants" && <TenantAccessGrantScreen />}
    </div>
  );
}
