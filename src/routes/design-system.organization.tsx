import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  Building2,
  Layers,
  Network,
  BadgeCheck,
  BarChart3,
  Wallet,
  MapPin,
  CalendarDays,
  CalendarClock,
  Search,
  Plus,
  Upload,
  Download,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  Loader2,
  ChevronRight,
  Info,
  Copy,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";

export const Route = createFileRoute("/design-system/organization")({
  component: OrganizationDesignSpec,
  head: () => ({
    meta: [
      { title: "Organization Setup — EWOS Design Spec" },
      {
        name: "description",
        content:
          "High-fidelity design specification for the EWOS Organization Setup module: Company, Business Unit, Department, Designation, Grade, Cost Centre, Location, Holiday Calendar, Payroll Calendar.",
      },
    ],
  }),
});

type ModuleKey =
  | "company"
  | "business-unit"
  | "department"
  | "designation"
  | "grade"
  | "cost-centre"
  | "location"
  | "holiday-calendar"
  | "payroll-calendar";

type ModuleDef = {
  key: ModuleKey;
  label: string;
  singular: string;
  plural: string;
  icon: typeof Building2;
  description: string;
};

const MODULES: ModuleDef[] = [
  {
    key: "company",
    label: "Company",
    singular: "Company",
    plural: "Companies",
    icon: Building2,
    description: "Legal entities that own employees, payrolls and compliance filings.",
  },
  {
    key: "business-unit",
    label: "Business Unit",
    singular: "Business Unit",
    plural: "Business Units",
    icon: Network,
    description: "Operating divisions that roll up to a company for reporting.",
  },
  {
    key: "department",
    label: "Department",
    singular: "Department",
    plural: "Departments",
    icon: Layers,
    description: "Functional groups such as Engineering, Finance, or People Ops.",
  },
  {
    key: "designation",
    label: "Designation",
    singular: "Designation",
    plural: "Designations",
    icon: BadgeCheck,
    description: "Job titles used across offer letters, org charts and payslips.",
  },
  {
    key: "grade",
    label: "Grade",
    singular: "Grade",
    plural: "Grades",
    icon: BarChart3,
    description: "Compensation bands that drive salary structure and approvals.",
  },
  {
    key: "cost-centre",
    label: "Cost Centre",
    singular: "Cost Centre",
    plural: "Cost Centres",
    icon: Wallet,
    description: "Finance codes that receive payroll and expense postings.",
  },
  {
    key: "location",
    label: "Location",
    singular: "Location",
    plural: "Locations",
    icon: MapPin,
    description: "Physical offices, remote hubs and statutory work locations.",
  },
  {
    key: "holiday-calendar",
    label: "Holiday Calendar",
    singular: "Holiday Calendar",
    plural: "Holiday Calendars",
    icon: CalendarDays,
    description: "Location-aware public and company holiday schedules.",
  },
  {
    key: "payroll-calendar",
    label: "Payroll Calendar",
    singular: "Payroll Calendar",
    plural: "Payroll Calendars",
    icon: CalendarClock,
    description: "Pay periods, cut-off dates and disbursal windows per entity.",
  },
];

type SampleRow = {
  code: string;
  name: string;
  parent?: string;
  meta?: string;
  status: "Active" | "Inactive" | "Draft";
  updated: string;
};

const SAMPLE_ROWS: Record<ModuleKey, SampleRow[]> = {
  company: [
    { code: "ACME-IN", name: "Acme India Pvt Ltd", meta: "CIN U72200KA2014PTC073456", status: "Active", updated: "12 Jul 2026" },
    { code: "ACME-AE", name: "Acme Middle East FZ-LLC", meta: "TRN 100234567800003", status: "Active", updated: "04 Jul 2026" },
    { code: "ACME-SG", name: "Acme Singapore Pte Ltd", meta: "UEN 202112345K", status: "Active", updated: "28 Jun 2026" },
    { code: "ACME-UK", name: "Acme UK Ltd", meta: "CRN 13456789", status: "Draft", updated: "22 Jun 2026" },
  ],
  "business-unit": [
    { code: "BU-PROD", name: "Product & Engineering", parent: "Acme India", status: "Active", updated: "10 Jul 2026" },
    { code: "BU-GTM", name: "Go-to-Market", parent: "Acme India", status: "Active", updated: "09 Jul 2026" },
    { code: "BU-OPS", name: "Global Operations", parent: "Acme Singapore", status: "Active", updated: "05 Jul 2026" },
    { code: "BU-INC", name: "Incubation Lab", parent: "Acme UK", status: "Inactive", updated: "01 Jun 2026" },
  ],
  department: [
    { code: "ENG", name: "Engineering", parent: "Product & Engineering", meta: "184 people", status: "Active", updated: "14 Jul 2026" },
    { code: "DSN", name: "Design", parent: "Product & Engineering", meta: "22 people", status: "Active", updated: "14 Jul 2026" },
    { code: "FIN", name: "Finance", parent: "Global Operations", meta: "31 people", status: "Active", updated: "12 Jul 2026" },
    { code: "PPL", name: "People Ops", parent: "Global Operations", meta: "17 people", status: "Active", updated: "12 Jul 2026" },
  ],
  designation: [
    { code: "SE2", name: "Software Engineer II", parent: "Engineering", status: "Active", updated: "11 Jul 2026" },
    { code: "SE3", name: "Senior Software Engineer", parent: "Engineering", status: "Active", updated: "11 Jul 2026" },
    { code: "EM1", name: "Engineering Manager", parent: "Engineering", status: "Active", updated: "11 Jul 2026" },
    { code: "PD2", name: "Product Designer II", parent: "Design", status: "Active", updated: "09 Jul 2026" },
  ],
  grade: [
    { code: "G05", name: "Grade 5 — Individual Contributor", meta: "Band 12L – 18L", status: "Active", updated: "08 Jul 2026" },
    { code: "G06", name: "Grade 6 — Senior IC", meta: "Band 18L – 28L", status: "Active", updated: "08 Jul 2026" },
    { code: "M01", name: "Manager I", meta: "Band 28L – 42L", status: "Active", updated: "08 Jul 2026" },
    { code: "M02", name: "Manager II", meta: "Band 42L – 60L", status: "Draft", updated: "02 Jul 2026" },
  ],
  "cost-centre": [
    { code: "CC-1001", name: "Platform Engineering", parent: "Engineering", status: "Active", updated: "13 Jul 2026" },
    { code: "CC-1002", name: "Growth Marketing", parent: "Go-to-Market", status: "Active", updated: "13 Jul 2026" },
    { code: "CC-2001", name: "Corporate Finance", parent: "Finance", status: "Active", updated: "10 Jul 2026" },
    { code: "CC-3001", name: "Bengaluru Office Admin", parent: "People Ops", status: "Inactive", updated: "01 May 2026" },
  ],
  location: [
    { code: "BLR-HQ", name: "Bengaluru HQ", meta: "Prestige Tech Park, KA, India", status: "Active", updated: "15 Jul 2026" },
    { code: "DXB-01", name: "Dubai Internet City", meta: "Building 3, Dubai, UAE", status: "Active", updated: "07 Jul 2026" },
    { code: "SG-01", name: "Singapore CBD", meta: "1 Raffles Place, SG", status: "Active", updated: "06 Jul 2026" },
    { code: "REMOTE", name: "Remote — Global", meta: "Distributed workforce", status: "Active", updated: "01 Jul 2026" },
  ],
  "holiday-calendar": [
    { code: "IN-2026", name: "India 2026", meta: "14 holidays · Bengaluru HQ", status: "Active", updated: "12 Jul 2026" },
    { code: "AE-2026", name: "UAE 2026", meta: "12 holidays · Dubai", status: "Active", updated: "06 Jul 2026" },
    { code: "SG-2026", name: "Singapore 2026", meta: "11 holidays · SG CBD", status: "Active", updated: "05 Jul 2026" },
    { code: "UK-2026", name: "United Kingdom 2026", meta: "8 holidays · Remote", status: "Draft", updated: "20 Jun 2026" },
  ],
  "payroll-calendar": [
    { code: "PC-IN-M", name: "India Monthly", meta: "Cut-off 25th · Pay 1st", status: "Active", updated: "10 Jul 2026" },
    { code: "PC-AE-M", name: "UAE Monthly (WPS)", meta: "Cut-off 25th · Pay last working day", status: "Active", updated: "04 Jul 2026" },
    { code: "PC-SG-M", name: "Singapore Monthly", meta: "Cut-off 22nd · Pay 28th", status: "Active", updated: "04 Jul 2026" },
    { code: "PC-UK-M", name: "UK Monthly PAYE", meta: "Cut-off 20th · Pay 28th", status: "Draft", updated: "18 Jun 2026" },
  ],
};

function statusBadge(status: SampleRow["status"]) {
  const map: Record<SampleRow["status"], string> = {
    Active: "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 dark:text-emerald-400",
    Inactive: "bg-muted text-muted-foreground border border-border",
    Draft: "bg-amber-500/10 text-amber-700 border border-amber-500/20 dark:text-amber-400",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ${map[status]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

function SpecFrame({
  label,
  device,
  children,
}: {
  label: string;
  device: "desktop" | "mobile";
  children: React.ReactNode;
}) {
  return (
    <figure className="space-y-3">
      <figcaption className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <span className="rounded-md border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px]">
          {device === "desktop" ? "DESKTOP · 1440" : "MOBILE · 390"}
        </span>
        <span>{label}</span>
      </figcaption>
      <div
        className={`overflow-hidden rounded-xl border border-border bg-background shadow-sm ${
          device === "mobile" ? "mx-auto w-full max-w-[390px]" : ""
        }`}
      >
        {children}
      </div>
    </figure>
  );
}

function SectionHeading({
  index,
  title,
  description,
}: {
  index: string;
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
        <span className="rounded bg-primary/10 px-1.5 py-0.5 text-primary">{index}</span>
        <span>Deliverable</span>
      </div>
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="max-w-3xl text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Mock chrome (a fake app shell used inside the spec previews)              */
/* -------------------------------------------------------------------------- */

function MockChrome({
  active,
  children,
  breadcrumbs,
  mobile,
}: {
  active: ModuleKey;
  children: React.ReactNode;
  breadcrumbs: string[];
  mobile?: boolean;
}) {
  return (
    <div className="flex min-h-[560px] bg-muted/30">
      {!mobile && (
        <aside className="w-56 shrink-0 border-r border-border bg-background">
          <div className="flex items-center gap-2 px-4 py-4">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-primary text-primary-foreground text-xs font-bold">
              E
            </div>
            <div>
              <div className="text-sm font-semibold leading-none">EWOS</div>
              <div className="text-[10px] text-muted-foreground">Organization</div>
            </div>
          </div>
          <Separator />
          <nav className="p-2">
            <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Setup
            </div>
            {MODULES.map((m) => {
              const Icon = m.icon;
              const isActive = m.key === active;
              return (
                <div
                  key={m.key}
                  className={`flex items-center gap-2 rounded-md px-2 py-1.5 text-xs ${
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="truncate">{m.label}</span>
                </div>
              );
            })}
          </nav>
        </aside>
      )}
      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
          <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
            {breadcrumbs.map((b, i) => (
              <span key={i} className="flex items-center gap-2">
                {i > 0 && <ChevronRight className="h-3 w-3" />}
                <span className={i === breadcrumbs.length - 1 ? "text-foreground" : ""}>{b}</span>
              </span>
            ))}
          </div>
          <div className="hidden items-center gap-2 sm:flex">
            <div className="h-7 w-7 rounded-full bg-muted" />
          </div>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Preview building blocks                                                   */
/* -------------------------------------------------------------------------- */

function ListToolbar({ label }: { label: string }) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-1 items-center gap-2">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder={`Search ${label.toLowerCase()}…`} className="pl-8" />
        </div>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Filter className="h-3.5 w-3.5" />
          Filters
          <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
            2
          </Badge>
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <Upload className="h-3.5 w-3.5" /> Import
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Download className="h-3.5 w-3.5" /> Export
        </Button>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-3.5 w-3.5" /> New
        </Button>
      </div>
    </div>
  );
}

function FilterChips() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted-foreground">Filtered by:</span>
      <Badge variant="secondary" className="gap-1">
        Status: Active
        <button className="ml-0.5 text-muted-foreground hover:text-foreground">×</button>
      </Badge>
      <Badge variant="secondary" className="gap-1">
        Company: Acme India
        <button className="ml-0.5 text-muted-foreground hover:text-foreground">×</button>
      </Badge>
      <button className="text-xs text-primary hover:underline">Clear all</button>
    </div>
  );
}

function DataTable({ module }: { module: ModuleDef }) {
  const rows = SAMPLE_ROWS[module.key];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/40 hover:bg-muted/40">
            <TableHead className="w-10">
              <Checkbox />
            </TableHead>
            <TableHead className="w-32">Code</TableHead>
            <TableHead>{module.singular}</TableHead>
            <TableHead className="hidden md:table-cell">
              {module.key === "grade" || module.key === "location" || module.key === "company"
                ? "Details"
                : "Parent"}
            </TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            <TableHead className="hidden lg:table-cell">Updated</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <TableRow key={r.code}>
              <TableCell>
                <Checkbox />
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">{r.code}</TableCell>
              <TableCell className="font-medium">{r.name}</TableCell>
              <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                {r.parent ?? r.meta ?? "—"}
              </TableCell>
              <TableCell className="hidden lg:table-cell">{statusBadge(r.status)}</TableCell>
              <TableCell className="hidden text-sm text-muted-foreground lg:table-cell">
                {r.updated}
              </TableCell>
              <TableCell>
                <Button size="icon" variant="ghost" className="h-7 w-7">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
        <span>4 of 4 records</span>
        <div className="flex items-center gap-2">
          <span>Rows: 25</span>
          <span>·</span>
          <span>Page 1 of 1</span>
        </div>
      </div>
    </div>
  );
}

function MobileCardList({ module }: { module: ModuleDef }) {
  const rows = SAMPLE_ROWS[module.key];
  return (
    <div className="space-y-2">
      {rows.map((r) => (
        <div
          key={r.code}
          className="rounded-lg border border-border bg-background p-3 shadow-sm"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="truncate text-sm font-medium">{r.name}</div>
              <div className="mt-0.5 font-mono text-[10px] text-muted-foreground">{r.code}</div>
            </div>
            {statusBadge(r.status)}
          </div>
          {(r.parent || r.meta) && (
            <div className="mt-2 truncate text-xs text-muted-foreground">
              {r.parent ?? r.meta}
            </div>
          )}
          <div className="mt-2 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Updated {r.updated}</span>
            <button className="text-primary">Edit</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form spec — adapts per module                                             */
/* -------------------------------------------------------------------------- */

function FormSpec({ module }: { module: ModuleDef }) {
  const isCalendar =
    module.key === "holiday-calendar" || module.key === "payroll-calendar";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">General</CardTitle>
            <CardDescription>Identifying information used across the platform.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>
                {module.singular} code <span className="text-destructive">*</span>
              </Label>
              <Input placeholder="e.g. ENG" className="font-mono" />
              <p className="text-[11px] text-muted-foreground">Uppercase, 3–12 chars, unique.</p>
            </div>
            <div className="space-y-1.5">
              <Label>
                {module.singular} name <span className="text-destructive">*</span>
              </Label>
              <Input placeholder={`e.g. ${SAMPLE_ROWS[module.key][0].name}`} />
            </div>
            {!isCalendar && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>
                  {module.key === "grade" || module.key === "location" || module.key === "company"
                    ? "Short description"
                    : "Parent"}
                </Label>
                {module.key === "grade" || module.key === "location" || module.key === "company" ? (
                  <Textarea rows={2} placeholder="Optional context shown in listings." />
                ) : (
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select parent…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="acme-in">Acme India</SelectItem>
                      <SelectItem value="acme-ae">Acme Middle East</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {module.key === "company" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Statutory</CardTitle>
              <CardDescription>Registration numbers used on payslips and filings.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Registration number</Label>
                <Input placeholder="CIN / CRN / UEN" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Tax ID</Label>
                <Input placeholder="PAN / TRN / GSTIN" className="font-mono" />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Registered address</Label>
                <Textarea rows={3} />
              </div>
            </CardContent>
          </Card>
        )}

        {module.key === "grade" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Salary band</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Currency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="INR" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="inr">INR ₹</SelectItem>
                    <SelectItem value="aed">AED د.إ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Min CTC</Label>
                <Input placeholder="1,200,000" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Max CTC</Label>
                <Input placeholder="1,800,000" className="font-mono" />
              </div>
            </CardContent>
          </Card>
        )}

        {module.key === "holiday-calendar" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Holidays</CardTitle>
              <CardDescription>Add public and company holidays for this calendar year.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { d: "26 Jan 2026", n: "Republic Day", t: "Public" },
                { d: "14 Mar 2026", n: "Holi", t: "Public" },
                { d: "15 Aug 2026", n: "Independence Day", t: "Public" },
                { d: "24 Dec 2026", n: "Company Shutdown", t: "Company" },
              ].map((h) => (
                <div
                  key={h.d}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" />
                    <span className="font-mono text-xs text-muted-foreground">{h.d}</span>
                    <span>{h.n}</span>
                  </div>
                  <Badge variant="secondary">{h.t}</Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" /> Add holiday
              </Button>
            </CardContent>
          </Card>
        )}

        {module.key === "payroll-calendar" && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pay cycle</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Monthly" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="m">Monthly</SelectItem>
                    <SelectItem value="sm">Semi-monthly</SelectItem>
                    <SelectItem value="w">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Period start day</Label>
                <Input placeholder="1" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Cut-off day</Label>
                <Input placeholder="25" className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label>Pay day</Label>
                <Input placeholder="Last working day" />
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">Active</div>
                <div className="text-xs text-muted-foreground">
                  Available to assign to employees.
                </div>
              </div>
              <Switch defaultChecked />
            </div>
            <Separator />
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Created</span>
                <span>—</span>
              </div>
              <div className="mt-1 flex justify-between">
                <span>Last updated</span>
                <span>—</span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle className="text-sm">Design note</AlertTitle>
          <AlertDescription className="text-xs">
            Two-column layout on ≥1024px collapses to a single stacked column below `lg`.
            Sidebar sticks to top of viewport on scroll.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Bulk import flow                                                           */
/* -------------------------------------------------------------------------- */

function BulkImportFlow() {
  return (
    <div className="grid gap-4 lg:grid-cols-4">
      {[
        {
          n: "1",
          t: "Download template",
          d: "CSV/XLSX with required columns pre-populated and validation rules commented.",
          icon: <FileSpreadsheet className="h-4 w-4" />,
        },
        {
          n: "2",
          t: "Upload file",
          d: "Drag & drop or browse. Max 10 MB, up to 10,000 rows per file.",
          icon: <Upload className="h-4 w-4" />,
        },
        {
          n: "3",
          t: "Map & validate",
          d: "Auto-detected columns, per-row error list with jump-to-row.",
          icon: <AlertTriangle className="h-4 w-4" />,
        },
        {
          n: "4",
          t: "Commit",
          d: "Streaming progress bar, downloadable success/error report.",
          icon: <CheckCircle2 className="h-4 w-4" />,
        },
      ].map((s) => (
        <Card key={s.n}>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center gap-2">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground text-xs font-semibold">
                {s.n}
              </span>
              <span className="flex items-center gap-1.5 text-sm font-medium">
                {s.icon}
                {s.t}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{s.d}</p>
          </CardContent>
        </Card>
      ))}
      <Card className="lg:col-span-4">
        <CardHeader>
          <CardTitle className="text-base">Step 3 · Validation panel</CardTitle>
          <CardDescription>
            Inline preview of the mapping + errors screen inside the import wizard.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
              <div className="text-xs text-muted-foreground">Valid rows</div>
              <div className="text-2xl font-semibold text-emerald-600">1,248</div>
            </div>
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <div className="text-xs text-muted-foreground">Warnings</div>
              <div className="text-2xl font-semibold text-amber-600">37</div>
            </div>
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
              <div className="text-xs text-muted-foreground">Errors</div>
              <div className="text-2xl font-semibold text-destructive">12</div>
            </div>
          </div>
          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="w-16">Row</TableHead>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="font-mono text-xs">R-24</TableCell>
                  <TableCell className="font-mono text-xs">ENG</TableCell>
                  <TableCell>Engineering</TableCell>
                  <TableCell>Product</TableCell>
                  <TableCell>
                    <span className="text-destructive">Duplicate code — already exists</span>
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-mono text-xs">R-58</TableCell>
                  <TableCell className="font-mono text-xs">FIN-EU</TableCell>
                  <TableCell>Finance EU</TableCell>
                  <TableCell className="text-muted-foreground italic">missing</TableCell>
                  <TableCell>
                    <span className="text-amber-600">Parent not found — will be created</span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center justify-between">
            <Progress value={62} className="w-64" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                Download error report
              </Button>
              <Button size="sm">Import 1,248 valid rows</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Main page                                                                  */
/* -------------------------------------------------------------------------- */

function OrganizationDesignSpec() {
  const [active, setActive] = useState<ModuleKey>("department");
  const module = MODULES.find((m) => m.key === active)!;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky spec header */}
      <div className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              to="/design-system"
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Design System
            </Link>
            <Separator orientation="vertical" className="h-4" />
            <h1 className="truncate text-sm font-semibold">
              WP-003D · Organization Setup — Design Spec
            </h1>
          </div>
          <Badge variant="outline" className="hidden sm:inline-flex">
            Implementation-ready
          </Badge>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-16 px-6 py-10">
        {/* Intro */}
        <section className="space-y-4">
          <PageHeader
            title="Organization Setup"
            description="High-fidelity design spec for the nine foundational entities that anchor every downstream HRMS, payroll and compliance workflow."
          />
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-3">
            {MODULES.map((m) => {
              const Icon = m.icon;
              const isActive = m.key === active;
              return (
                <button
                  key={m.key}
                  onClick={() => setActive(m.key)}
                  className={`group flex items-start gap-3 rounded-lg border p-3 text-left ${
                    isActive
                      ? "border-primary bg-primary/5"
                      : "border-border bg-background hover:border-primary/40"
                  }`}
                >
                  <div
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-md ${
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium">{m.label}</span>
                      {isActive && (
                        <Badge variant="secondary" className="h-4 px-1 text-[10px]">
                          Previewing
                        </Badge>
                      )}
                    </div>
                    <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {m.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground">
            Select any module above to re-render the specs below with that entity's fields,
            sample data and copy. All nine share the same interaction model — one component set,
            nine schemas.
          </p>
        </section>

        {/* 1. Desktop UI */}
        <section className="space-y-6">
          <SectionHeading
            index="01"
            title={`Desktop — ${module.plural} list`}
            description="Primary workspace: persistent left nav, module-scoped toolbar, dense data table with column visibility, saved filters, and row actions in an overflow menu."
          />
          <SpecFrame label="List view · default state" device="desktop">
            <MockChrome
              active={active}
              breadcrumbs={["Organization", module.plural]}
            >
              <div className="space-y-4">
                <PageHeader
                  title={module.plural}
                  description={module.description}
                />
                <ListToolbar label={module.plural} />
                <FilterChips />
                <DataTable module={module} />
              </div>
            </MockChrome>
          </SpecFrame>
        </section>

        {/* 2. Mobile responsive */}
        <section className="space-y-6">
          <SectionHeading
            index="02"
            title={`Mobile — ${module.plural} list & detail`}
            description="Below 640px the data table collapses to a card list; the toolbar's secondary actions move into an overflow sheet; primary CTA is a floating action button."
          />
          <div className="grid gap-8 lg:grid-cols-2">
            <SpecFrame label="Mobile · list" device="mobile">
              <MockChrome active={active} breadcrumbs={[module.plural]} mobile>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">{module.plural}</h2>
                    <Button size="icon" variant="outline" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input placeholder="Search…" className="pl-8" />
                  </div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <Badge variant="secondary" className="shrink-0">
                      Active
                    </Badge>
                    <Badge variant="outline" className="shrink-0">
                      Draft
                    </Badge>
                    <Badge variant="outline" className="shrink-0">
                      Inactive
                    </Badge>
                  </div>
                  <MobileCardList module={module} />
                </div>
                <button className="fixed bottom-6 right-6 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <Plus className="h-5 w-5" />
                </button>
              </MockChrome>
            </SpecFrame>
            <SpecFrame label="Mobile · form" device="mobile">
              <MockChrome active={active} breadcrumbs={[module.plural, "New"]} mobile>
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Button size="icon" variant="ghost" className="h-7 w-7">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                      <div className="text-xs text-muted-foreground">
                        {module.plural} / New
                      </div>
                      <div className="text-base font-semibold">
                        Create {module.singular.toLowerCase()}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Code *</Label>
                      <Input placeholder="e.g. ENG" className="font-mono" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Name *</Label>
                      <Input placeholder={SAMPLE_ROWS[module.key][0].name} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
                        <span className="text-sm">Active</span>
                        <Switch defaultChecked />
                      </div>
                    </div>
                  </div>
                  <div className="sticky bottom-0 -mx-4 flex gap-2 border-t border-border bg-background px-4 py-3">
                    <Button variant="outline" className="flex-1">
                      Cancel
                    </Button>
                    <Button className="flex-1">Save</Button>
                  </div>
                </div>
              </MockChrome>
            </SpecFrame>
          </div>
        </section>

        {/* 3. Form layouts */}
        <section className="space-y-6">
          <SectionHeading
            index="03"
            title="Form layout"
            description="Two-column create/edit form: primary content on the left, meta panel (status, audit) on the right. Module-specific sections render conditionally."
          />
          <SpecFrame label={`Create ${module.singular} · desktop`} device="desktop">
            <MockChrome
              active={active}
              breadcrumbs={["Organization", module.plural, "New"]}
            >
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs text-muted-foreground">
                      {module.plural} / New
                    </div>
                    <h2 className="text-xl font-semibold">
                      Create {module.singular.toLowerCase()}
                    </h2>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline">Cancel</Button>
                    <Button>Save {module.singular.toLowerCase()}</Button>
                  </div>
                </div>
                <FormSpec module={module} />
              </div>
            </MockChrome>
          </SpecFrame>
        </section>

        {/* 4. List/Grid variants */}
        <section className="space-y-6">
          <SectionHeading
            index="04"
            title="List & grid variants"
            description="Table is the default. Grid view is offered for Location and Company where visual identity matters."
          />
          <SpecFrame label="Grid view · Locations / Companies" device="desktop">
            <div className="p-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {SAMPLE_ROWS.location.map((r) => (
                  <Card key={r.code} className="overflow-hidden">
                    <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/5 to-transparent" />
                    <CardContent className="space-y-2 p-4">
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{r.name}</div>
                        {statusBadge(r.status)}
                      </div>
                      <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                      <div className="text-xs text-muted-foreground">{r.meta}</div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </SpecFrame>
        </section>

        {/* 5. Filters & search */}
        <section className="space-y-6">
          <SectionHeading
            index="05"
            title="Filter & search"
            description="Global search stays inline. Advanced filters open in a right-hand drawer with chip summaries above the table."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <SpecFrame label="Toolbar + chip summary" device="desktop">
              <div className="space-y-3 p-4">
                <ListToolbar label={module.plural} />
                <FilterChips />
              </div>
            </SpecFrame>
            <SpecFrame label="Filter drawer" device="desktop">
              <div className="p-4">
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div className="font-medium">Filters</div>
                    <button className="text-xs text-muted-foreground hover:text-foreground">
                      Reset
                    </button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <div className="space-y-1.5">
                        {["Active", "Draft", "Inactive"].map((s) => (
                          <label key={s} className="flex items-center gap-2 text-sm">
                            <Checkbox defaultChecked={s === "Active"} /> {s}
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Company</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="All companies" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="a">Acme India</SelectItem>
                          <SelectItem value="b">Acme UAE</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Updated between</Label>
                      <div className="grid grid-cols-2 gap-2">
                        <Input placeholder="From" />
                        <Input placeholder="To" />
                      </div>
                    </div>
                    <Button className="w-full">Apply filters</Button>
                  </div>
                </div>
              </div>
            </SpecFrame>
          </div>
        </section>

        {/* 6-9. States */}
        <section className="space-y-6">
          <SectionHeading
            index="06–09"
            title="Empty · Error · Loading · Success states"
            description="One canonical treatment per state, applied consistently across all nine modules."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <SpecFrame label="Empty state" device="desktop">
              <div className="p-6">
                <EmptyState
                  icon={module.icon}
                  title={`No ${module.plural.toLowerCase()} yet`}
                  description={`Create the first ${module.singular.toLowerCase()} to start organising your workforce. You can also bulk-import from CSV.`}
                  action={
                    <div className="flex gap-2">
                      <Button variant="outline" className="gap-1.5">
                        <Upload className="h-4 w-4" /> Import CSV
                      </Button>
                      <Button className="gap-1.5">
                        <Plus className="h-4 w-4" /> New {module.singular.toLowerCase()}
                      </Button>
                    </div>
                  }
                />
              </div>
            </SpecFrame>

            <SpecFrame label="Error state" device="desktop">
              <div className="space-y-4 p-6">
                <Alert variant="destructive">
                  <XCircle className="h-4 w-4" />
                  <AlertTitle>We couldn't load {module.plural.toLowerCase()}</AlertTitle>
                  <AlertDescription>
                    The server returned <code className="font-mono">503 Service Unavailable</code>.
                    Retry, or contact your admin if this keeps happening.
                  </AlertDescription>
                </Alert>
                <div className="flex gap-2">
                  <Button variant="outline">Retry</Button>
                  <Button variant="ghost">Copy error ID</Button>
                </div>
                <div className="rounded-md bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                  request-id: 01J9K…M2QF · trace: ewos.org.{active}.list
                </div>
              </div>
            </SpecFrame>

            <SpecFrame label="Loading state (skeleton)" device="desktop">
              <div className="space-y-3 p-6">
                <Skeleton className="h-8 w-48" />
                <div className="flex gap-2">
                  <Skeleton className="h-9 w-64" />
                  <Skeleton className="h-9 w-24" />
                  <div className="flex-1" />
                  <Skeleton className="h-9 w-24" />
                </div>
                <div className="rounded-lg border border-border">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0"
                    >
                      <Skeleton className="h-4 w-4" />
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 flex-1" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </SpecFrame>

            <SpecFrame label="Success notification (toast)" device="desktop">
              <div className="space-y-4 p-6">
                <div className="flex items-start gap-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {module.singular} created
                    </div>
                    <div className="text-xs text-muted-foreground">
                      "{SAMPLE_ROWS[module.key][0].name}" is now available across EWOS.
                    </div>
                  </div>
                  <button className="text-xs font-medium text-emerald-700 hover:underline">
                    View
                  </button>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    toast.success(`${module.singular} created`, {
                      description: `"${SAMPLE_ROWS[module.key][0].name}" is now available.`,
                    })
                  }
                >
                  Trigger live toast
                </Button>
              </div>
            </SpecFrame>
          </div>
        </section>

        {/* 10. Bulk import */}
        <section className="space-y-6">
          <SectionHeading
            index="10"
            title="Bulk Import / Export"
            description="Four-step wizard applied uniformly to all nine modules. Export mirrors the import template for round-trip editing."
          />
          <BulkImportFlow />
        </section>

        {/* 11. Delete confirmation */}
        <section className="space-y-6">
          <SectionHeading
            index="11"
            title="Delete confirmation"
            description="Destructive dialog with typed confirmation for records that have downstream impact (employees, payroll postings)."
          />
          <div className="grid gap-6 lg:grid-cols-2">
            <SpecFrame label="Soft delete · single record" device="desktop">
              <div className="p-8">
                <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">Archive {module.singular.toLowerCase()}?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    "{SAMPLE_ROWS[module.key][0].name}" will be hidden from new assignments.
                    Historical records will keep the reference.
                  </p>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm">
                      Archive
                    </Button>
                  </div>
                </div>
              </div>
            </SpecFrame>

            <SpecFrame label="Hard delete · with dependencies" device="desktop">
              <div className="p-8">
                <div className="mx-auto max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
                  <div className="mb-3 flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-full bg-destructive/10 text-destructive">
                      <AlertTriangle className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold">Delete permanently?</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    This will remove <b>{SAMPLE_ROWS[module.key][0].name}</b> and unassign
                    <b> 184 employees</b>. This cannot be undone.
                  </p>
                  <div className="mt-4 space-y-1.5">
                    <Label className="text-xs">
                      Type <span className="font-mono">DELETE</span> to confirm
                    </Label>
                    <Input placeholder="DELETE" className="font-mono" />
                  </div>
                  <div className="mt-4 flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button variant="destructive" size="sm" disabled>
                      Delete permanently
                    </Button>
                  </div>
                </div>
              </div>
            </SpecFrame>
          </div>

          <div className="mt-4">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm">
                  Open live dialog
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Archive {module.singular.toLowerCase()}?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will hide the record from new assignments but preserve history.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction>Archive</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </section>

        {/* 12. Tokens & components */}
        <section className="space-y-6">
          <SectionHeading
            index="12"
            title="New tokens & components required"
            description="Everything else reuses the WP-001 EWOS Design System. Only these additions are new."
          />
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Status pill</CardTitle>
                <CardDescription>Semantic pill for Active / Draft / Inactive.</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {(["Active", "Draft", "Inactive"] as const).map((s) => (
                  <span key={s}>{statusBadge(s)}</span>
                ))}
                <div className="mt-2 w-full rounded-md bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                  &lt;StatusPill status="Active|Draft|Inactive" /&gt;
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Data table shell</CardTitle>
                <CardDescription>
                  Table + sticky header + zebra rows + footer pager, used by all nine modules.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                  &lt;DataTable columns=&#123;…&#125; rows=&#123;…&#125; onRowAction=&#123;…&#125; /&gt;
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">List toolbar</CardTitle>
                <CardDescription>
                  Search + filter + import/export + primary CTA, used above every list.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                  &lt;ListToolbar entity="Departments" onCreate=&#123;…&#125; /&gt;
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import wizard</CardTitle>
                <CardDescription>
                  4-step stepper with template download, upload, validate, commit.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-3 font-mono text-[11px] text-muted-foreground">
                  &lt;ImportWizard entity="Departments" template="/templates/departments.csv" /&gt;
                </div>
              </CardContent>
            </Card>
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Tokens (additions)</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                {[
                  { name: "--status-active", val: "oklch emerald / 500" },
                  { name: "--status-draft", val: "oklch amber / 500" },
                  { name: "--status-inactive", val: "muted-foreground" },
                  { name: "table.row.height", val: "44px" },
                  { name: "toolbar.gap", val: "8px" },
                  { name: "dialog.destructive.icon.bg", val: "destructive / 10%" },
                ].map((t) => (
                  <div key={t.name} className="rounded-md border border-border bg-muted/40 p-2">
                    <div className="font-mono text-[11px] text-muted-foreground">{t.name}</div>
                    <div className="text-xs">{t.val}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Handoff summary */}
        <section className="space-y-4">
          <SectionHeading
            index="Σ"
            title="Handoff summary"
            description="Everything engineering needs to start building WP-003D against the existing EWOS Design System."
          />
          <Card>
            <CardContent className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { k: "Modules", v: "9 entities, 1 shared shell" },
                { k: "New components", v: "4 (StatusPill, DataTable, ListToolbar, ImportWizard)" },
                { k: "New tokens", v: "6 additions" },
                { k: "Breakpoints", v: "sm 640 · md 768 · lg 1024" },
                { k: "Density", v: "44px row · 32px control" },
                { k: "Empty / Error / Loading", v: "Standardised, 1 treatment each" },
                { k: "Import limit", v: "10 MB · 10k rows" },
                { k: "Destructive UX", v: "Archive default · typed confirm for hard delete" },
              ].map((i) => (
                <div key={i.k}>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">
                    {i.k}
                  </div>
                  <div className="mt-1 text-sm font-medium">{i.v}</div>
                </div>
              ))}
            </CardContent>
          </Card>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                toast.success("Spec URL copied");
              }}
            >
              <Copy className="h-3.5 w-3.5" /> Copy spec URL
            </Button>
            <Link to="/design-system">
              <Button variant="ghost" size="sm">
                ← Back to Design System
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
