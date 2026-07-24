import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Building2, Network } from "lucide-react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { DEFAULT_COMPANY_ID, DEFAULT_TENANT_ID, type ResourceApiOptions } from "@/lib/api-client";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/organization")({
  head: () => ({
    meta: [{ title: "Organization — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: OrganizationPage,
});

type ModuleDef = {
  key: string;
  title: string;
  singular: string;
  description: string;
  icon: typeof Building2;
  resourcePath: string;
  fields: CrudField[];
  apiOptions: ResourceApiOptions;
};

// Sprint 13 fix — the previous 9 tabs (Companies, Business Units, Departments,
// Designations, Grades, Cost Centres, Locations, Holiday Calendars, Payroll
// Calendars) pointed at endpoints that do not exist on the backend at all: the
// Company Configuration sprint that would have modeled them was rejected during
// the mid-2026 architecture reset and never rebuilt. Rather than leave 7 dead
// "Coming soon" tabs, this screen now shows only the two resources the backend
// actually implements (com.ewos.organization): Unit Types (a per-tenant metadata
// dictionary — Department / Business Unit / Cost Centre / etc. are *data* here,
// not separate tables) and Units (the hierarchical tree, each unit pointing at a
// type by ID). See SPRINT_13_COMPLETION_REPORT.md for the full mismatch report.
const MODULES: ModuleDef[] = [
  {
    key: "unit-type",
    title: "Unit Types",
    singular: "Unit Type",
    description:
      "Per-tenant dictionary of organizational unit kinds (Department, Business Unit, Cost Centre, ...). Create the types you need here, then reference their ID when creating Units.",
    icon: Building2,
    resourcePath: "/organization/unit-types",
    fields: [
      { name: "code", label: "Code", required: true, placeholder: "e.g. DEPARTMENT" },
      { name: "name", label: "Name", required: true },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
      { name: "sortOrder", label: "Sort order", type: "number", listColumn: false },
    ],
    apiOptions: {
      extraBody: { tenantId: DEFAULT_TENANT_ID },
      updateMethod: "PATCH",
    },
  },
  {
    key: "unit",
    title: "Units",
    singular: "Unit",
    description:
      "The hierarchical organization tree. Each unit references a Unit Type by ID (create the type first).",
    icon: Network,
    resourcePath: "/organization/units",
    fields: [
      { name: "code", label: "Code", required: true, placeholder: "e.g. HR-01" },
      { name: "name", label: "Name", required: true },
      {
        name: "unitTypeId",
        label: "Unit Type ID",
        required: true,
        placeholder: "UUID from the Unit Types tab",
      },
      {
        name: "parentId",
        label: "Parent Unit ID",
        listColumn: false,
        placeholder: "UUID, optional",
      },
      {
        name: "effectiveFrom",
        label: "Effective from",
        required: true,
        placeholder: "YYYY-MM-DD",
      },
      { name: "countryCode", label: "Country code", listColumn: false, placeholder: "e.g. IN" },
      { name: "costCenterCode", label: "Cost centre code", listColumn: false },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
    ],
    apiOptions: {
      extraQuery: { tenantId: DEFAULT_TENANT_ID },
      extraBody: { tenantId: DEFAULT_TENANT_ID, companyId: DEFAULT_COMPANY_ID },
      updateMethod: "PATCH",
    },
  },
];

function OrganizationPage() {
  const [active, setActive] = useState(MODULES[0].key);
  const current = MODULES.find((m) => m.key === active)!;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Organization Setup
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Organization</h1>
        <p className="text-sm text-muted-foreground">
          Configure your company's structural building blocks.
        </p>
      </div>

      <nav aria-label="Organization modules" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
        {MODULES.map((m) => {
          const Icon = m.icon;
          const isActive = m.key === active;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => setActive(m.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border bg-card text-muted-foreground hover:text-foreground",
              )}
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
