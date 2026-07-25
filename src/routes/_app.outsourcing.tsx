import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Landmark, LayoutList, Network } from "lucide-react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { DEFAULT_TENANT_ID, type ResourceApiOptions } from "@/lib/api-client";

// Sprint 14.1 — Outsourced Payroll Foundation. Tenants / Clients / Companies / Service
// Catalogue, using the exact CrudScreen recipe already proven for Organization in
// Sprint 13. Client Assignment management (the Chinese Wall grant/revoke UI) is
// intentionally not included here — its list endpoint requires a clientId or providerId
// filter, which the generic CrudScreen (built for unconditional lists) doesn't support;
// extending it for one screen's dynamic required filter would be exactly the kind of
// unnecessary abstraction Sprint 14.1 was scoped to avoid. The API is complete and
// tested (see ClientAssignmentController) — a dedicated screen with client/provider
// pickers is a natural follow-up.

export const Route = createFileRoute("/_app/outsourcing")({
  head: () => ({
    meta: [{ title: "Outsourcing — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: OutsourcingPage,
});

type ModuleDef = {
  key: string;
  title: string;
  singular: string;
  description: string;
  icon: typeof Building2;
  resourcePath: string;
  fields: CrudField[];
  apiOptions?: ResourceApiOptions;
};

const MODULES: ModuleDef[] = [
  {
    key: "tenant",
    title: "Tenants",
    singular: "Tenant",
    description: "Platform isolation / licensing boundary — one EWOS operating instance.",
    icon: Landmark,
    resourcePath: "/tenants",
    fields: [
      { name: "code", label: "Code", required: true, placeholder: "e.g. ACME" },
      { name: "name", label: "Name", required: true },
    ],
  },
  {
    key: "client",
    title: "Clients",
    singular: "Client",
    description:
      "Commercial customer relationships within the tenant. One Client can own multiple Companies.",
    icon: Network,
    resourcePath: "/clients",
    fields: [
      { name: "code", label: "Code", required: true, placeholder: "e.g. CL-01" },
      { name: "legalName", label: "Legal name", required: true },
      { name: "onboardedAt", label: "Onboarded", listColumn: false, placeholder: "YYYY-MM-DD" },
    ],
    apiOptions: { extraBody: { tenantId: DEFAULT_TENANT_ID } },
  },
  {
    key: "company",
    title: "Companies",
    singular: "Company",
    description:
      "Legal entities under a Client — one Client, multiple Companies, multiple countries. Also what the Company Switcher lists.",
    icon: Building2,
    resourcePath: "/companies",
    fields: [
      { name: "code", label: "Code", required: true, placeholder: "e.g. CO-IN" },
      { name: "name", label: "Name", required: true },
      {
        name: "clientId",
        label: "Client ID",
        required: true,
        placeholder: "UUID from the Clients tab",
      },
      { name: "countryCode", label: "Country code", listColumn: false, placeholder: "e.g. IN" },
    ],
    apiOptions: { extraBody: { tenantId: DEFAULT_TENANT_ID } },
  },
  {
    key: "service",
    title: "Service Catalogue",
    singular: "Service",
    description:
      "Master list of outsourcing services (Payroll Processing, HR Helpdesk, ...). Zero hardcoded vocabulary.",
    icon: LayoutList,
    resourcePath: "/services",
    fields: [
      { name: "code", label: "Code", required: true, placeholder: "e.g. PAYROLL_PROCESSING" },
      { name: "name", label: "Name", required: true },
      { name: "category", label: "Category", placeholder: "e.g. PAYROLL" },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
      { name: "sortOrder", label: "Sort order", type: "number", listColumn: false },
    ],
    apiOptions: { extraBody: { tenantId: DEFAULT_TENANT_ID } },
  },
];

function OutsourcingPage() {
  const [active, setActive] = useState(MODULES[1].key); // Clients default
  const current = MODULES.find((m) => m.key === active)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Payroll Outsourcing Foundation
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Outsourcing</h1>
        <p className="text-sm text-muted-foreground">
          Tenant, Client, Company, and Service Catalogue configuration (Sprint 14.1).
        </p>
      </div>

      <nav aria-label="Outsourcing modules" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = m.key === active;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className={`flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground"
              }`}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {m.title}
            </button>
          );
        })}
      </nav>

      <CrudScreen
        key={current.key}
        title={current.title}
        description={current.description}
        resourcePath={current.resourcePath}
        singular={current.singular}
        fields={current.fields}
        apiOptions={current.apiOptions}
      />
    </div>
  );
}
