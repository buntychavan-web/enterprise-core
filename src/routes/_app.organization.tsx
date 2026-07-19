import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Briefcase,
  Users,
  BadgeCheck,
  TrendingUp,
  Wallet,
  MapPin,
  CalendarDays,
  CalendarClock,
} from "lucide-react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
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
};

const NAME_CODE: CrudField[] = [
  { name: "code", label: "Code", required: true, placeholder: "e.g. HR-01" },
  { name: "name", label: "Name", required: true },
  { name: "description", label: "Description", type: "textarea", listColumn: false },
];

const MODULES: ModuleDef[] = [
  {
    key: "company",
    title: "Companies",
    singular: "Company",
    description: "Legal entities operating under this workforce.",
    icon: Building2,
    resourcePath: "/companies",
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Legal name", required: true },
      { name: "taxId", label: "Tax ID" },
      { name: "country", label: "Country" },
      { name: "description", label: "Notes", type: "textarea", listColumn: false },
    ],
  },
  {
    key: "business-unit",
    title: "Business Units",
    singular: "Business Unit",
    description: "Divisions, product lines, or business verticals.",
    icon: Briefcase,
    resourcePath: "/business-units",
    fields: NAME_CODE,
  },
  {
    key: "department",
    title: "Departments",
    singular: "Department",
    description: "Functional departments within the organization.",
    icon: Users,
    resourcePath: "/departments",
    fields: NAME_CODE,
  },
  {
    key: "designation",
    title: "Designations",
    singular: "Designation",
    description: "Job titles and roles.",
    icon: BadgeCheck,
    resourcePath: "/designations",
    fields: NAME_CODE,
  },
  {
    key: "grade",
    title: "Grades",
    singular: "Grade",
    description: "Compensation grades and levels.",
    icon: TrendingUp,
    resourcePath: "/grades",
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Name", required: true },
      { name: "level", label: "Level", type: "number" },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
    ],
  },
  {
    key: "cost-centre",
    title: "Cost Centres",
    singular: "Cost Centre",
    description: "Financial cost allocation buckets.",
    icon: Wallet,
    resourcePath: "/cost-centres",
    fields: NAME_CODE,
  },
  {
    key: "location",
    title: "Locations",
    singular: "Location",
    description: "Offices, sites, and remote hubs.",
    icon: MapPin,
    resourcePath: "/locations",
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Name", required: true },
      { name: "city", label: "City" },
      { name: "country", label: "Country" },
      { name: "description", label: "Address", type: "textarea", listColumn: false },
    ],
  },
  {
    key: "holiday-calendar",
    title: "Holiday Calendars",
    singular: "Holiday Calendar",
    description: "Regional holiday schedules.",
    icon: CalendarDays,
    resourcePath: "/holiday-calendars",
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Name", required: true },
      { name: "year", label: "Year", type: "number" },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
    ],
  },
  {
    key: "payroll-calendar",
    title: "Payroll Calendars",
    singular: "Payroll Calendar",
    description: "Pay periods and cycle definitions.",
    icon: CalendarClock,
    resourcePath: "/payroll-calendars",
    fields: [
      { name: "code", label: "Code", required: true },
      { name: "name", label: "Name", required: true },
      { name: "frequency", label: "Frequency", placeholder: "Monthly / Bi-weekly" },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
    ],
  },
];

function OrganizationPage() {
  const [active, setActive] = useState(MODULES[2].key); // Departments default
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
      />
    </div>
  );
}
