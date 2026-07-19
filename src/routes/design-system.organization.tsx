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
  FileSpreadsheet,
  ChevronRight,
  ChevronLeft,
  Bell,
  ChevronDown,
  LayoutDashboard,
  Users,
  Settings,
  LogOut,
  X,
  Check,
  Menu,
  Home,
  RefreshCw,
  Inbox,
  Star,
  Globe,
  Clock,
  FileText,
  ShieldCheck,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { EwosLogo } from "@/components/ewos/Logo";

export const Route = createFileRoute("/design-system/organization")({
  component: OrganizationMockups,
  head: () => ({
    meta: [
      { title: "Organization Setup — High-Fidelity Mockups | EWOS" },
      {
        name: "description",
        content: "Rendered, implementation-ready screens for the EWOS Organization Setup module.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
});

/* ------------------------------------------------------------------ */
/*  Mockup registry                                                    */
/* ------------------------------------------------------------------ */

type ScreenKey =
  | "dept-list"
  | "dept-form"
  | "company-grid"
  | "location-map"
  | "holiday-calendar"
  | "payroll-calendar"
  | "filter-drawer"
  | "import-wizard"
  | "delete-dialog"
  | "empty"
  | "error"
  | "loading"
  | "success-toast"
  | "mobile-list"
  | "mobile-form";

const SCREENS: { key: ScreenKey; label: string; group: string; device: "desktop" | "mobile" }[] = [
  { key: "dept-list", label: "Department — List", group: "Core CRUD", device: "desktop" },
  { key: "dept-form", label: "Department — Form", group: "Core CRUD", device: "desktop" },
  { key: "company-grid", label: "Company — Grid", group: "Core CRUD", device: "desktop" },
  { key: "location-map", label: "Location — Detail", group: "Core CRUD", device: "desktop" },
  { key: "holiday-calendar", label: "Holiday Calendar", group: "Calendar", device: "desktop" },
  { key: "payroll-calendar", label: "Payroll Calendar", group: "Calendar", device: "desktop" },
  { key: "filter-drawer", label: "Filter & Search", group: "Patterns", device: "desktop" },
  { key: "import-wizard", label: "Bulk Import Wizard", group: "Patterns", device: "desktop" },
  { key: "delete-dialog", label: "Delete Confirmation", group: "Patterns", device: "desktop" },
  { key: "empty", label: "Empty State", group: "States", device: "desktop" },
  { key: "error", label: "Error State", group: "States", device: "desktop" },
  { key: "loading", label: "Loading State", group: "States", device: "desktop" },
  { key: "success-toast", label: "Success Toast", group: "States", device: "desktop" },
  { key: "mobile-list", label: "Mobile — List", group: "Mobile", device: "mobile" },
  { key: "mobile-form", label: "Mobile — Form", group: "Mobile", device: "mobile" },
];

const NAV = [
  { icon: LayoutDashboard, label: "Dashboard" },
  { icon: Building2, label: "Organization", active: true },
  { icon: Users, label: "Employees" },
  { icon: ShieldCheck, label: "Users & Roles" },
  { icon: Settings, label: "Settings" },
];

const ORG_SUBNAV: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  key: ScreenKey | "any";
  count?: number;
}[] = [
  { icon: Building2, label: "Company", key: "company-grid", count: 4 },
  { icon: Layers, label: "Business Unit", key: "any", count: 12 },
  { icon: Network, label: "Department", key: "dept-list", count: 38 },
  { icon: BadgeCheck, label: "Designation", key: "any", count: 64 },
  { icon: BarChart3, label: "Grade", key: "any", count: 9 },
  { icon: Wallet, label: "Cost Centre", key: "any", count: 22 },
  { icon: MapPin, label: "Location", key: "location-map", count: 17 },
  { icon: CalendarDays, label: "Holiday Calendar", key: "holiday-calendar", count: 3 },
  { icon: CalendarClock, label: "Payroll Calendar", key: "payroll-calendar", count: 2 },
];

/* ------------------------------------------------------------------ */
/*  Root                                                               */
/* ------------------------------------------------------------------ */

function OrganizationMockups() {
  const [screen, setScreen] = useState<ScreenKey>("dept-list");
  const current = SCREENS.find((s) => s.key === screen)!;

  return (
    <div className="min-h-dvh bg-muted/40 text-foreground">
      {/* Presentation bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 py-2.5">
          <Link
            to="/design-system"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Design System
          </Link>
          <Separator orientation="vertical" className="h-4" />
          <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            WP-003D · Organization Setup
          </span>
          <Badge variant="secondary" className="ml-auto text-[10px] font-medium">
            High-fidelity mockups — not wired to backend
          </Badge>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1600px] grid-cols-1 gap-4 p-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        {/* Screen picker */}
        <aside className="rounded-lg border bg-background lg:sticky lg:top-14 lg:h-[calc(100dvh-5rem)] lg:self-start lg:overflow-y-auto">
          <div className="border-b px-3 py-2.5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Screens
            </p>
          </div>
          <nav className="p-2">
            {Array.from(new Set(SCREENS.map((s) => s.group))).map((group) => (
              <div key={group} className="mb-3">
                <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                  {group}
                </p>
                <ul className="space-y-0.5">
                  {SCREENS.filter((s) => s.group === group).map((s) => {
                    const active = screen === s.key;
                    return (
                      <li key={s.key}>
                        <button
                          type="button"
                          onClick={() => setScreen(s.key)}
                          className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
                            active
                              ? "bg-primary/10 font-medium text-primary"
                              : "text-foreground hover:bg-muted"
                          }`}
                        >
                          <span className="flex-1 truncate">{s.label}</span>
                          {active && <ChevronRight className="h-3.5 w-3.5" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        {/* Frame */}
        <section>
          <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{current.label}</span>
            <span>·</span>
            <span>
              {current.device === "mobile" ? "Mobile · 390 × 844" : "Desktop · 1440 × 900"}
            </span>
          </div>

          {current.device === "desktop" ? (
            <DesktopFrame>{renderScreen(screen)}</DesktopFrame>
          ) : (
            <MobileFrame>{renderScreen(screen)}</MobileFrame>
          )}
        </section>
      </div>
    </div>
  );
}

function renderScreen(k: ScreenKey) {
  switch (k) {
    case "dept-list":
      return <DepartmentList />;
    case "dept-form":
      return <DepartmentForm />;
    case "company-grid":
      return <CompanyGrid />;
    case "location-map":
      return <LocationDetail />;
    case "holiday-calendar":
      return <HolidayCalendar />;
    case "payroll-calendar":
      return <PayrollCalendar />;
    case "filter-drawer":
      return <FilterDrawer />;
    case "import-wizard":
      return <ImportWizard />;
    case "delete-dialog":
      return <DeleteDialog />;
    case "empty":
      return <EmptyScreen />;
    case "error":
      return <ErrorScreen />;
    case "loading":
      return <LoadingScreen />;
    case "success-toast":
      return <SuccessToast />;
    case "mobile-list":
      return <MobileList />;
    case "mobile-form":
      return <MobileForm />;
  }
}

/* ------------------------------------------------------------------ */
/*  Chrome                                                             */
/* ------------------------------------------------------------------ */

function DesktopFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl border bg-background shadow-lg">
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b bg-muted/50 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
        <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
        <div className="ml-4 flex-1 truncate rounded-md bg-background px-3 py-1 text-[11px] text-muted-foreground">
          app.ewos.com/organization
        </div>
      </div>
      {/* App shell */}
      <div className="grid grid-cols-[220px_minmax(0,1fr)]">
        <AppSidebar />
        <div className="flex min-h-[720px] flex-col">
          <AppTopbar />
          <main className="flex-1 bg-muted/30">{children}</main>
        </div>
      </div>
    </div>
  );
}

function MobileFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[400px]">
      <div className="overflow-hidden rounded-[2.25rem] border-8 border-foreground/90 bg-background shadow-2xl">
        <div className="flex items-center justify-between bg-background px-6 py-1.5 text-[11px] font-medium">
          <span>9:41</span>
          <span className="h-4 w-16 rounded-full bg-foreground/90" />
          <span>100%</span>
        </div>
        <div className="min-h-[720px] bg-muted/30">{children}</div>
      </div>
    </div>
  );
}

function AppSidebar() {
  return (
    <aside className="flex flex-col border-r bg-background">
      <div className="border-b px-4 py-3">
        <EwosLogo />
      </div>
      <div className="border-b px-3 py-3">
        <button className="flex w-full items-center gap-2 rounded-md border bg-muted/40 px-2 py-2 text-left text-xs hover:bg-muted">
          <div className="grid h-7 w-7 shrink-0 place-items-center rounded bg-primary/10 text-primary">
            <Building2 className="h-3.5 w-3.5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[11px] text-muted-foreground">Company</p>
            <p className="truncate text-xs font-medium">Acme Holdings Ltd.</p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {NAV.map((n) => (
          <div key={n.label}>
            <button
              className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] ${
                n.active
                  ? "bg-primary/10 font-medium text-primary"
                  : "text-foreground/80 hover:bg-muted"
              }`}
            >
              <n.icon className="h-4 w-4" />
              {n.label}
            </button>
            {n.active && (
              <ul className="ml-6 mt-1 space-y-0.5 border-l pl-2">
                {ORG_SUBNAV.map((s) => (
                  <li key={s.label}>
                    <button className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12px] text-muted-foreground hover:bg-muted hover:text-foreground">
                      <s.icon className="h-3.5 w-3.5" />
                      <span className="flex-1 truncate">{s.label}</span>
                      {s.count !== undefined && (
                        <span className="text-[10px] tabular-nums text-muted-foreground/70">
                          {s.count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </nav>
      <div className="border-t p-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            SR
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">Sana Raza</p>
            <p className="truncate text-[10px] text-muted-foreground">HR Admin</p>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}

function AppTopbar() {
  return (
    <div className="flex h-14 items-center gap-3 border-b bg-background px-5">
      <Breadcrumb>
        <BreadcrumbList className="text-[12px]">
          <BreadcrumbItem>
            <BreadcrumbLink className="flex items-center gap-1">
              <Home className="h-3 w-3" /> Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink>Organization</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage className="font-medium">Department</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search organization…" className="h-8 w-64 pl-8 text-xs" readOnly />
          <kbd className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 rounded border bg-muted px-1 text-[10px] text-muted-foreground">
            ⌘K
          </kbd>
        </div>
        <button className="relative rounded-md p-2 hover:bg-muted">
          <Bell className="h-4 w-4" />
          <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-destructive" />
        </button>
        <Separator orientation="vertical" className="h-6" />
        <div className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
          SR
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Reusable page bits                                                 */
/* ------------------------------------------------------------------ */

function PageTitle({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b bg-background px-6 py-5 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

function Toolbar({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b bg-background px-6 py-3">
      {children}
    </div>
  );
}

function StatusPill({
  tone,
  label,
}: {
  tone: "success" | "warn" | "muted" | "info";
  label: string;
}) {
  const map: Record<string, string> = {
    success:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-500/10 dark:text-emerald-300",
    warn: "bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-500/10 dark:text-amber-300",
    muted: "bg-muted text-muted-foreground ring-border",
    info: "bg-sky-50 text-sky-700 ring-sky-600/20 dark:bg-sky-500/10 dark:text-sky-300",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset ${map[tone]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {label}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Department List                                            */
/* ------------------------------------------------------------------ */

const DEPARTMENTS = [
  {
    code: "ENG",
    name: "Engineering",
    parent: "Technology",
    head: "Aarav Mehta",
    bu: "Product",
    loc: "Bengaluru",
    headcount: 128,
    status: "Active" as const,
  },
  {
    code: "PLT",
    name: "Platform Engineering",
    parent: "Engineering",
    head: "Ishaan Kapoor",
    bu: "Product",
    loc: "Bengaluru",
    headcount: 42,
    status: "Active" as const,
  },
  {
    code: "DES",
    name: "Design",
    parent: "Technology",
    head: "Meera Iyer",
    bu: "Product",
    loc: "Bengaluru",
    headcount: 18,
    status: "Active" as const,
  },
  {
    code: "FIN",
    name: "Finance",
    parent: "Corporate",
    head: "Rohit Sharma",
    bu: "Corporate",
    loc: "Mumbai",
    headcount: 24,
    status: "Active" as const,
  },
  {
    code: "HRD",
    name: "People & Culture",
    parent: "Corporate",
    head: "Sana Raza",
    bu: "Corporate",
    loc: "Mumbai",
    headcount: 12,
    status: "Active" as const,
  },
  {
    code: "SAL",
    name: "Sales — EMEA",
    parent: "Revenue",
    head: "David Okafor",
    bu: "GTM",
    loc: "London",
    headcount: 34,
    status: "Active" as const,
  },
  {
    code: "SAL2",
    name: "Sales — APAC",
    parent: "Revenue",
    head: "Wei Chen",
    bu: "GTM",
    loc: "Singapore",
    headcount: 29,
    status: "Active" as const,
  },
  {
    code: "OPS",
    name: "Operations",
    parent: "Corporate",
    head: "Priya Nair",
    bu: "Corporate",
    loc: "Mumbai",
    headcount: 41,
    status: "Draft" as const,
  },
  {
    code: "LEG",
    name: "Legal & Compliance",
    parent: "Corporate",
    head: "Anita Desai",
    bu: "Corporate",
    loc: "Mumbai",
    headcount: 8,
    status: "Archived" as const,
  },
];

function DepartmentList() {
  return (
    <>
      <PageTitle
        eyebrow="Organization"
        title="Departments"
        description="Group employees for reporting, cost allocation, and access control."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Department
            </Button>
          </>
        }
      />

      <Toolbar>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by name, code, or head…" className="h-8 w-72 pl-8 text-xs" />
        </div>
        <Select defaultValue="all">
          <SelectTrigger className="h-8 w-[160px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Business Unit: All</SelectItem>
            <SelectItem value="prod">Product</SelectItem>
            <SelectItem value="gtm">GTM</SelectItem>
          </SelectContent>
        </Select>
        <Select defaultValue="all">
          <SelectTrigger className="h-8 w-[140px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Location: All</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs">
          <Filter className="h-3.5 w-3.5" /> More filters
          <Badge variant="secondary" className="h-4 px-1 text-[10px]">
            2
          </Badge>
        </Button>
        <Separator orientation="vertical" className="h-6" />
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-muted-foreground">Active filters:</span>
          <Badge variant="secondary" className="gap-1">
            Status: Active <X className="h-3 w-3 cursor-pointer" />
          </Badge>
          <Badge variant="secondary" className="gap-1">
            Region: India <X className="h-3 w-3 cursor-pointer" />
          </Badge>
          <button className="text-xs text-primary hover:underline">Clear all</button>
        </div>
        <div className="ml-auto text-xs text-muted-foreground">
          Showing <span className="font-medium text-foreground">9</span> of 38
        </div>
      </Toolbar>

      <div className="border-b bg-primary/5 px-6 py-2 text-xs">
        <div className="flex items-center gap-3">
          <Checkbox checked className="h-3.5 w-3.5" />
          <span className="font-medium">3 selected</span>
          <Separator orientation="vertical" className="h-4" />
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Pencil className="h-3 w-3" /> Bulk edit
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
            <Download className="h-3 w-3" /> Export selected
          </Button>
          <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs text-destructive">
            <Trash2 className="h-3 w-3" /> Archive
          </Button>
        </div>
      </div>

      <div className="p-6">
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40">
                <TableHead className="w-10">
                  <Checkbox className="h-3.5 w-3.5" />
                </TableHead>
                <TableHead className="text-xs">Code</TableHead>
                <TableHead className="text-xs">Name</TableHead>
                <TableHead className="text-xs">Parent</TableHead>
                <TableHead className="text-xs">Business Unit</TableHead>
                <TableHead className="text-xs">Head</TableHead>
                <TableHead className="text-xs">Location</TableHead>
                <TableHead className="text-right text-xs">Headcount</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEPARTMENTS.map((d, i) => (
                <TableRow key={d.code} className={i < 3 ? "bg-primary/[0.03]" : ""}>
                  <TableCell>
                    <Checkbox checked={i < 3} className="h-3.5 w-3.5" />
                  </TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {d.code}
                  </TableCell>
                  <TableCell className="text-sm font-medium">{d.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{d.parent}</TableCell>
                  <TableCell className="text-xs">{d.bu}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[10px] font-semibold">
                        {d.head
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </div>
                      <span className="text-xs">{d.head}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-xs">{d.loc}</TableCell>
                  <TableCell className="text-right text-xs font-medium tabular-nums">
                    {d.headcount}
                  </TableCell>
                  <TableCell>
                    <StatusPill
                      tone={
                        d.status === "Active" ? "success" : d.status === "Draft" ? "warn" : "muted"
                      }
                      label={d.status}
                    />
                  </TableCell>
                  <TableCell>
                    <button className="rounded p-1 hover:bg-muted">
                      <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              Rows per page
              <Select defaultValue="25">
                <SelectTrigger className="h-7 w-[70px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                1
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                2
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Department Form                                            */
/* ------------------------------------------------------------------ */

function DepartmentForm() {
  return (
    <>
      <PageTitle
        eyebrow="Departments / New"
        title="Create Department"
        description="Departments roll up to a Business Unit and inherit its cost centre defaults."
        actions={
          <>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button variant="outline" size="sm">
              Save as Draft
            </Button>
            <Button size="sm" className="gap-1.5">
              <Check className="h-3.5 w-3.5" /> Save & Publish
            </Button>
          </>
        }
      />

      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Basic details</h3>
              <p className="text-xs text-muted-foreground">
                Required for reporting and directory listings.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field
                label="Department code"
                required
                hint="Uppercase, 3–8 characters. Immutable after publish."
              >
                <Input defaultValue="PLT" className="h-9 font-mono uppercase" />
              </Field>
              <Field label="Display name" required>
                <Input defaultValue="Platform Engineering" className="h-9" />
              </Field>
              <Field label="Parent department">
                <Select defaultValue="eng">
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eng">Engineering</SelectItem>
                    <SelectItem value="none">— None (top level)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Business Unit" required>
                <Select defaultValue="prod">
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="prod">Product</SelectItem>
                    <SelectItem value="gtm">GTM</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Effective from" required>
                <Input type="date" defaultValue="2026-08-01" className="h-9" />
              </Field>
              <Field label="Status">
                <Select defaultValue="active">
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="arch">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <div className="md:col-span-2">
                <Field label="Description">
                  <Textarea
                    rows={3}
                    defaultValue="Owns core platform services, developer tooling, and infrastructure reliability across product engineering."
                  />
                </Field>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4">
              <h3 className="text-sm font-semibold">Assignments</h3>
              <p className="text-xs text-muted-foreground">
                Head and cost allocation for this department.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Department Head">
                <div className="flex h-9 items-center gap-2 rounded-md border bg-background px-2">
                  <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                    IK
                  </div>
                  <span className="text-sm">Ishaan Kapoor</span>
                  <span className="text-xs text-muted-foreground">· ishaan.k@acme.com</span>
                  <X className="ml-auto h-3.5 w-3.5 cursor-pointer text-muted-foreground" />
                </div>
              </Field>
              <Field label="Default Cost Centre">
                <Select defaultValue="cc-100">
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cc-100">CC-100 · Engineering OpEx</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Primary Location">
                <Select defaultValue="blr">
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="blr">Bengaluru — HQ Campus</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Approval workflow">
                <Select defaultValue="std">
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="std">Standard (Head → HRBP)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
          </Card>

          <Card className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold">Access & visibility</h3>
                <p className="text-xs text-muted-foreground">
                  Controls who can view or edit records in this department.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <Toggle label="Visible in company directory" defaultChecked />
              <Toggle label="Restrict payroll visibility to department head" defaultChecked />
              <Toggle label="Allow employees to request transfer into this department" />
            </div>
          </Card>
        </div>

        <aside className="space-y-4">
          <Card className="p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold">
              <Info className="h-3.5 w-3.5 text-primary" /> Preview
            </div>
            <div className="rounded-md border bg-muted/30 p-3">
              <p className="font-mono text-[11px] text-muted-foreground">PLT</p>
              <p className="mt-0.5 text-sm font-semibold">Platform Engineering</p>
              <p className="text-xs text-muted-foreground">Engineering · Product · Bengaluru</p>
              <div className="mt-2 flex items-center gap-1.5">
                <StatusPill tone="success" label="Active" />
                <StatusPill tone="info" label="Effective 01 Aug 2026" />
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-xs font-semibold">Validation</div>
            <ul className="space-y-1.5 text-xs">
              <li className="flex items-center gap-2 text-emerald-600">
                <Check className="h-3 w-3" /> Code is unique
              </li>
              <li className="flex items-center gap-2 text-emerald-600">
                <Check className="h-3 w-3" /> Parent is valid
              </li>
              <li className="flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-3 w-3" /> No secondary approver set
              </li>
            </ul>
          </Card>
          <Card className="p-4">
            <div className="mb-2 text-xs font-semibold">Changes</div>
            <ol className="space-y-2 text-xs">
              <li>
                <p className="font-medium">Draft created</p>
                <p className="text-muted-foreground">just now · Sana Raza</p>
              </li>
              <li>
                <p className="font-medium text-muted-foreground">— No prior history</p>
              </li>
            </ol>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({ label, defaultChecked }: { label: string; defaultChecked?: boolean }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-background px-3 py-2">
      <span className="text-sm">{label}</span>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Company Grid                                               */
/* ------------------------------------------------------------------ */

const COMPANIES = [
  {
    code: "ACM-IN",
    name: "Acme Holdings Ltd.",
    country: "India",
    ccy: "INR",
    emp: 428,
    primary: true,
  },
  { code: "ACM-UK", name: "Acme UK Ltd.", country: "United Kingdom", ccy: "GBP", emp: 62 },
  { code: "ACM-SG", name: "Acme Asia Pte. Ltd.", country: "Singapore", ccy: "SGD", emp: 41 },
  { code: "ACM-AE", name: "Acme MEA FZ-LLC", country: "United Arab Emirates", ccy: "AED", emp: 18 },
];

function CompanyGrid() {
  return (
    <>
      <PageTitle
        eyebrow="Organization"
        title="Companies"
        description="Legal entities that employ people and run payroll independently."
        actions={
          <>
            <div className="hidden overflow-hidden rounded-md border md:flex">
              <button className="bg-muted px-2.5 py-1.5">
                <LayoutDashboard className="h-3.5 w-3.5" />
              </button>
              <button className="border-l px-2.5 py-1.5">
                <Menu className="h-3.5 w-3.5" />
              </button>
            </div>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Company
            </Button>
          </>
        }
      />
      <div className="grid gap-4 p-6 md:grid-cols-2 xl:grid-cols-3">
        {COMPANIES.map((c) => (
          <Card
            key={c.code}
            className="group relative flex flex-col p-5 transition-shadow hover:shadow-md"
          >
            {c.primary && (
              <span className="absolute right-4 top-4 inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                <Star className="h-3 w-3" /> Primary
              </span>
            )}
            <div className="flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-md bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">{c.name}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{c.code}</p>
              </div>
            </div>

            <dl className="mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-xs">
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Country
                </dt>
                <dd className="mt-0.5 flex items-center gap-1 font-medium">
                  <Globe className="h-3 w-3 text-muted-foreground" />
                  {c.country}
                </dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Currency
                </dt>
                <dd className="mt-0.5 font-mono font-medium">{c.ccy}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  Employees
                </dt>
                <dd className="mt-0.5 font-medium tabular-nums">{c.emp}</dd>
              </div>
            </dl>

            <div className="mt-4 flex items-center gap-2 border-t pt-3">
              <StatusPill tone="success" label="Active" />
              <StatusPill tone="info" label="Payroll: Monthly" />
              <button className="ml-auto rounded p-1 hover:bg-muted">
                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
          </Card>
        ))}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Location detail                                            */
/* ------------------------------------------------------------------ */

function LocationDetail() {
  return (
    <>
      <PageTitle
        eyebrow="Locations / BLR-HQ"
        title="Bengaluru — HQ Campus"
        description="Prestige Tech Park, Marathahalli · Karnataka, India"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Pencil className="h-3.5 w-3.5" /> Edit
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5 text-destructive">
              <Trash2 className="h-3.5 w-3.5" /> Archive
            </Button>
          </>
        }
      />
      <div className="grid gap-6 p-6 lg:grid-cols-3">
        <Card className="col-span-2 overflow-hidden">
          <div className="relative h-64 bg-gradient-to-br from-sky-100 to-indigo-100 dark:from-sky-950 dark:to-indigo-950">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 30% 40%, rgba(59,130,246,0.15) 0, transparent 40%), radial-gradient(circle at 70% 60%, rgba(99,102,241,0.15) 0, transparent 40%)",
              }}
            />
            <div
              className="absolute inset-0 opacity-40"
              style={{
                backgroundImage:
                  "linear-gradient(to right, rgba(0,0,0,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.05) 1px, transparent 1px)",
                backgroundSize: "24px 24px",
              }}
            />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="relative">
                <div className="absolute inset-0 animate-none rounded-full bg-primary/30 blur-xl" />
                <div className="relative grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
                  <MapPin className="h-5 w-5" />
                </div>
              </div>
            </div>
            <span className="absolute bottom-3 left-3 rounded bg-background/90 px-2 py-1 text-[10px] text-muted-foreground">
              12.9584° N, 77.7010° E
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t p-5 md:grid-cols-4">
            <Stat label="Employees" value="128" />
            <Stat label="Departments" value="6" />
            <Stat label="Timezone" value="Asia/Kolkata" />
            <Stat label="Capacity" value="220 seats" />
          </div>
        </Card>
        <div className="space-y-4">
          <Card className="p-4">
            <p className="text-xs font-semibold">Address</p>
            <p className="mt-2 text-sm">
              Tower B, Level 6<br />
              Prestige Tech Park
              <br />
              Marathahalli — 560103
              <br />
              Karnataka, India
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold">Holiday Calendar</p>
            <div className="mt-2 flex items-center gap-2 text-sm">
              <CalendarDays className="h-4 w-4 text-primary" />
              India — 2026 (14 days)
            </div>
            <button className="mt-2 text-xs text-primary hover:underline">Change calendar →</button>
          </Card>
          <Card className="p-4">
            <p className="text-xs font-semibold">Contacts</p>
            <div className="mt-2 space-y-2 text-sm">
              <p>
                Site Admin · <span className="text-muted-foreground">Priya Nair</span>
              </p>
              <p>
                Facilities · <span className="text-muted-foreground">Ravi Kumar</span>
              </p>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Holiday Calendar                                           */
/* ------------------------------------------------------------------ */

const HOLIDAYS_JAN = [
  { date: 1, name: "New Year's Day", type: "Public" },
  { date: 14, name: "Makar Sankranti", type: "Optional" },
  { date: 26, name: "Republic Day", type: "Public" },
];

function HolidayCalendar() {
  const weeks = Array.from({ length: 5 }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const day = w * 7 + d - 3; // Jan 1 2026 falls on Thursday
      return day > 0 && day <= 31 ? day : null;
    }),
  );
  return (
    <>
      <PageTitle
        eyebrow="Holiday Calendar"
        title="India — 2026"
        description="Applies to 3 locations · 428 employees · 14 holidays"
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export ICS
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Duplicate
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> Add Holiday
            </Button>
          </>
        }
      />
      <div className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <h3 className="text-sm font-semibold">January 2026</h3>
            <Button variant="outline" size="icon" className="h-7 w-7">
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <div className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-primary" /> Public
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-500" /> Optional
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-muted-foreground/40" /> Weekend
              </span>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-muted-foreground">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
              <div key={d} className="py-1">
                {d}
              </div>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {weeks.flat().map((day, i) => {
              const isWeekend = i % 7 === 0 || i % 7 === 6;
              const hol = day ? HOLIDAYS_JAN.find((h) => h.date === day) : null;
              return (
                <div
                  key={i}
                  className={`aspect-square rounded-md border p-1.5 text-left text-xs ${
                    !day
                      ? "border-dashed bg-transparent"
                      : hol?.type === "Public"
                        ? "border-primary/40 bg-primary/5"
                        : hol?.type === "Optional"
                          ? "border-amber-400/40 bg-amber-500/5"
                          : isWeekend
                            ? "bg-muted/40"
                            : "bg-background"
                  }`}
                >
                  {day && (
                    <>
                      <div className="text-[11px] font-medium">{day}</div>
                      {hol && (
                        <div
                          className={`mt-0.5 truncate text-[10px] font-medium ${hol.type === "Public" ? "text-primary" : "text-amber-700 dark:text-amber-400"}`}
                        >
                          {hol.name}
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-wide">Upcoming</p>
            <Badge variant="secondary" className="text-[10px]">
              14 total
            </Badge>
          </div>
          <ul className="divide-y">
            {[
              { d: "Jan 1", n: "New Year's Day", w: "Thu", t: "Public" },
              { d: "Jan 14", n: "Makar Sankranti", w: "Wed", t: "Optional" },
              { d: "Jan 26", n: "Republic Day", w: "Mon", t: "Public" },
              { d: "Mar 6", n: "Holi", w: "Fri", t: "Public" },
              { d: "Apr 10", n: "Good Friday", w: "Fri", t: "Optional" },
              { d: "Aug 15", n: "Independence Day", w: "Sat", t: "Public" },
            ].map((h) => (
              <li key={h.d} className="flex items-center gap-3 py-2.5">
                <div className="grid h-10 w-10 place-items-center rounded-md bg-muted text-center">
                  <div className="text-[9px] uppercase text-muted-foreground">
                    {h.d.split(" ")[0]}
                  </div>
                  <div className="-mt-0.5 text-sm font-semibold leading-none">
                    {h.d.split(" ")[1]}
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{h.n}</p>
                  <p className="text-[11px] text-muted-foreground">{h.w}</p>
                </div>
                <StatusPill tone={h.t === "Public" ? "info" : "warn"} label={h.t} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Payroll Calendar                                           */
/* ------------------------------------------------------------------ */

function PayrollCalendar() {
  const cycles = [
    {
      m: "Aug 2026",
      period: "1 – 31 Aug",
      cutoff: "22 Aug",
      pay: "28 Aug",
      status: "Open",
      tone: "info" as const,
    },
    {
      m: "Jul 2026",
      period: "1 – 31 Jul",
      cutoff: "22 Jul",
      pay: "28 Jul",
      status: "Processing",
      tone: "warn" as const,
    },
    {
      m: "Jun 2026",
      period: "1 – 30 Jun",
      cutoff: "22 Jun",
      pay: "28 Jun",
      status: "Paid",
      tone: "success" as const,
    },
    {
      m: "May 2026",
      period: "1 – 31 May",
      cutoff: "22 May",
      pay: "28 May",
      status: "Paid",
      tone: "success" as const,
    },
  ];
  return (
    <>
      <PageTitle
        eyebrow="Payroll Calendar"
        title="Monthly — India Payroll"
        description="Runs on the 28th, cut-off on the 22nd. 428 employees."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Export
            </Button>
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Cycle
            </Button>
          </>
        }
      />
      <div className="p-6">
        <Card className="p-5">
          <ol className="relative space-y-6 border-l pl-6">
            {cycles.map((c, i) => (
              <li key={c.m} className="relative">
                <span
                  className={`absolute -left-[29px] grid h-5 w-5 place-items-center rounded-full ring-4 ring-background ${
                    c.tone === "success"
                      ? "bg-emerald-500"
                      : c.tone === "warn"
                        ? "bg-amber-500"
                        : "bg-primary"
                  }`}
                >
                  {c.tone === "success" ? (
                    <Check className="h-3 w-3 text-white" />
                  ) : (
                    <Clock className="h-3 w-3 text-white" />
                  )}
                </span>
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold">{c.m}</h4>
                      <StatusPill tone={c.tone} label={c.status} />
                      {i === 0 && (
                        <Badge variant="secondary" className="text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">Period {c.period}</p>
                  </div>
                  <div className="flex items-center gap-6 text-xs">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Cut-off
                      </p>
                      <p className="font-medium">{c.cutoff}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        Pay date
                      </p>
                      <p className="font-medium">{c.pay}</p>
                    </div>
                    <Button variant="outline" size="sm" className="h-7 text-xs">
                      Open
                    </Button>
                  </div>
                </div>
                {i === 1 && (
                  <div className="mt-3 rounded-md border bg-muted/40 p-3 text-xs">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="font-medium">Processing progress</span>
                      <span className="text-muted-foreground">312 / 428 employees</span>
                    </div>
                    <Progress value={73} className="h-1.5" />
                  </div>
                )}
              </li>
            ))}
          </ol>
        </Card>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Filter Drawer overlay                                      */
/* ------------------------------------------------------------------ */

function FilterDrawer() {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-90">
        <DepartmentList />
      </div>
      <div className="absolute inset-0 bg-foreground/30 backdrop-blur-[1px]" />
      <div className="absolute inset-y-0 right-0 flex w-[400px] flex-col border-l bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b px-5 py-4">
          <div>
            <h3 className="text-sm font-semibold">Filters</h3>
            <p className="text-[11px] text-muted-foreground">Refine the department list</p>
          </div>
          <button className="rounded p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          <FilterGroup title="Status">
            <div className="flex flex-wrap gap-1.5">
              {["Active", "Draft", "Archived"].map((s, i) => (
                <button
                  key={s}
                  className={`rounded-full border px-2.5 py-1 text-xs ${i === 0 ? "border-primary bg-primary/10 text-primary" : "hover:bg-muted"}`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Business Unit">
            <div className="space-y-1.5">
              {["Product", "GTM", "Corporate", "Operations"].map((bu, i) => (
                <label key={bu} className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked={i < 2} className="h-3.5 w-3.5" />
                  <span className="flex-1">{bu}</span>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {[12, 8, 14, 4][i]}
                  </span>
                </label>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Location">
            <Input placeholder="Search locations…" className="h-8 text-xs" />
            <div className="mt-2 space-y-1.5">
              {["Bengaluru", "Mumbai", "London", "Singapore"].map((l, i) => (
                <label key={l} className="flex items-center gap-2 text-sm">
                  <Checkbox defaultChecked={i < 1} className="h-3.5 w-3.5" />
                  {l}
                </label>
              ))}
            </div>
          </FilterGroup>
          <FilterGroup title="Headcount range">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="Min" defaultValue="10" className="h-8 text-xs" />
              <Input placeholder="Max" defaultValue="200" className="h-8 text-xs" />
            </div>
          </FilterGroup>
          <FilterGroup title="Created">
            <Select defaultValue="90">
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>
          </FilterGroup>
        </div>
        <div className="flex items-center gap-2 border-t px-5 py-3">
          <Button variant="ghost" size="sm" className="text-xs">
            Reset
          </Button>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm">
              Cancel
            </Button>
            <Button size="sm">Apply · 9 results</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold">{title}</p>
        <button className="text-[10px] text-primary hover:underline">Clear</button>
      </div>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Import Wizard                                              */
/* ------------------------------------------------------------------ */

function ImportWizard() {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-50">
        <DepartmentList />
      </div>
      <div className="absolute inset-0 grid place-items-center bg-foreground/40 p-6 backdrop-blur-[1px]">
        <Card className="w-full max-w-4xl overflow-hidden shadow-2xl">
          <div className="border-b bg-muted/40 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Bulk import
                </p>
                <h3 className="text-base font-semibold">Import Departments</h3>
              </div>
              <button className="rounded p-1 hover:bg-muted">
                <X className="h-4 w-4" />
              </button>
            </div>
            <ol className="mt-4 grid grid-cols-4 gap-2 text-xs">
              {[
                { n: 1, l: "Upload", done: true },
                { n: 2, l: "Map columns", done: true },
                { n: 3, l: "Validate", active: true },
                { n: 4, l: "Import" },
              ].map((s) => (
                <li key={s.n} className="flex items-center gap-2">
                  <span
                    className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${
                      s.done
                        ? "bg-emerald-500 text-white"
                        : s.active
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {s.done ? <Check className="h-3 w-3" /> : s.n}
                  </span>
                  <span className={s.active ? "font-medium" : "text-muted-foreground"}>{s.l}</span>
                </li>
              ))}
            </ol>
          </div>
          <div className="grid gap-4 p-6 md:grid-cols-3">
            <div className="rounded-md border bg-emerald-50 p-4 dark:bg-emerald-500/10">
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-xs font-medium">Valid</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-emerald-700 dark:text-emerald-300 tabular-nums">
                124
              </p>
            </div>
            <div className="rounded-md border bg-amber-50 p-4 dark:bg-amber-500/10">
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-xs font-medium">Warnings</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-amber-700 dark:text-amber-300 tabular-nums">
                6
              </p>
            </div>
            <div className="rounded-md border bg-red-50 p-4 dark:bg-red-500/10">
              <div className="flex items-center gap-2 text-red-700 dark:text-red-300">
                <X className="h-4 w-4" />
                <span className="text-xs font-medium">Errors</span>
              </div>
              <p className="mt-1 text-2xl font-semibold text-red-700 dark:text-red-300 tabular-nums">
                2
              </p>
            </div>
          </div>
          <div className="border-t">
            <div className="flex items-center gap-2 border-b px-6 py-2 text-xs">
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="font-mono">departments_q3.xlsx</span>
              <span className="text-muted-foreground">· 132 rows</span>
              <div className="ml-auto flex gap-1.5">
                <Button variant="ghost" size="sm" className="h-7 text-xs">
                  All (132)
                </Button>
                <Button variant="outline" size="sm" className="h-7 text-xs">
                  Issues (8)
                </Button>
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead className="w-10 text-xs">Row</TableHead>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Name</TableHead>
                  <TableHead className="text-xs">Business Unit</TableHead>
                  <TableHead className="text-xs">Issue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="bg-red-50/50 dark:bg-red-500/5">
                  <TableCell className="font-mono text-xs">14</TableCell>
                  <TableCell className="font-mono text-xs">ENG</TableCell>
                  <TableCell className="text-xs">Engineering</TableCell>
                  <TableCell className="text-xs">Product</TableCell>
                  <TableCell className="text-xs text-red-600">
                    Duplicate code "ENG" already exists
                  </TableCell>
                </TableRow>
                <TableRow className="bg-red-50/50 dark:bg-red-500/5">
                  <TableCell className="font-mono text-xs">37</TableCell>
                  <TableCell className="font-mono text-xs">—</TableCell>
                  <TableCell className="text-xs">Growth Marketing</TableCell>
                  <TableCell className="text-xs">GTM</TableCell>
                  <TableCell className="text-xs text-red-600">
                    Missing required field: Code
                  </TableCell>
                </TableRow>
                <TableRow className="bg-amber-50/50 dark:bg-amber-500/5">
                  <TableCell className="font-mono text-xs">52</TableCell>
                  <TableCell className="font-mono text-xs">R&D-2</TableCell>
                  <TableCell className="text-xs">Research & Development</TableCell>
                  <TableCell className="text-xs">—</TableCell>
                  <TableCell className="text-xs text-amber-700">
                    Business Unit blank — will default to "Unassigned"
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
          <div className="flex items-center gap-2 border-t bg-muted/40 px-6 py-3">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Download className="h-3.5 w-3.5" /> Download error report
            </Button>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </Button>
              <Button size="sm" className="gap-1.5">
                Import 124 valid rows <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screen: Delete confirmation                                        */
/* ------------------------------------------------------------------ */

function DeleteDialog() {
  return (
    <div className="relative">
      <div className="pointer-events-none opacity-40">
        <DepartmentList />
      </div>
      <div className="absolute inset-0 grid place-items-center bg-foreground/50 p-6">
        <Card className="w-full max-w-lg overflow-hidden shadow-2xl">
          <div className="flex items-start gap-3 border-b bg-red-50 p-5 dark:bg-red-500/10">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">Delete "Sales — EMEA"?</h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                This department has 34 active employees and is referenced by 2 payroll cycles.
              </p>
            </div>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-md border bg-muted/40 p-3 text-xs">
              <p className="font-semibold">What will happen</p>
              <ul className="mt-2 space-y-1 text-muted-foreground">
                <li className="flex gap-2">
                  <span className="text-emerald-600">•</span> Employees will keep their history and
                  be reassigned to "Sales" (parent).
                </li>
                <li className="flex gap-2">
                  <span className="text-emerald-600">•</span> Historical payroll references remain
                  intact.
                </li>
                <li className="flex gap-2">
                  <span className="text-red-600">•</span> The code{" "}
                  <code className="rounded bg-background px-1 font-mono">SAL</code> becomes
                  available again after 30 days.
                </li>
              </ul>
            </div>
            <div>
              <Label className="text-xs font-medium">
                Type{" "}
                <span className="rounded bg-muted px-1 font-mono text-[11px]">Sales — EMEA</span> to
                confirm
              </Label>
              <Input className="mt-1.5 h-9 font-mono text-sm" defaultValue="Sales — EMEA" />
            </div>
            <label className="flex items-start gap-2 text-xs">
              <Checkbox defaultChecked className="mt-0.5 h-3.5 w-3.5" />
              <span>
                I understand this action requires HR Admin approval and will be logged in the audit
                trail.
              </span>
            </label>
          </div>
          <div className="flex items-center justify-end gap-2 border-t bg-muted/30 px-5 py-3">
            <Button variant="ghost" size="sm">
              Cancel
            </Button>
            <Button variant="outline" size="sm">
              Archive instead
            </Button>
            <Button size="sm" variant="destructive" className="gap-1.5">
              <Trash2 className="h-3.5 w-3.5" /> Delete department
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Screens: State variants                                            */
/* ------------------------------------------------------------------ */

function EmptyScreen() {
  return (
    <>
      <PageTitle
        eyebrow="Organization"
        title="Cost Centres"
        actions={
          <Button size="sm" className="gap-1.5">
            <Plus className="h-3.5 w-3.5" /> New Cost Centre
          </Button>
        }
      />
      <div className="p-6">
        <Card className="grid place-items-center px-6 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <Inbox className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No cost centres yet</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            Cost centres let you attribute payroll and expenses to a budget owner. Start by creating
            one, or bulk import from a spreadsheet.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Button size="sm" className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Cost Centre
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Import from Excel
            </Button>
            <Button variant="ghost" size="sm" className="gap-1.5">
              <FileText className="h-3.5 w-3.5" /> Read the guide
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}

function ErrorScreen() {
  return (
    <>
      <PageTitle eyebrow="Organization" title="Departments" />
      <div className="p-6">
        <Card className="grid place-items-center px-6 py-16 text-center">
          <div className="grid h-16 w-16 place-items-center rounded-full bg-red-100 text-red-600 dark:bg-red-500/20">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <h3 className="mt-4 text-base font-semibold">We couldn't load departments</h3>
          <p className="mt-1 max-w-md text-sm text-muted-foreground">
            The server responded with an error. Your changes are safe — nothing was lost.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button size="sm" className="gap-1.5">
              <RefreshCw className="h-3.5 w-3.5" /> Try again
            </Button>
            <Button variant="outline" size="sm">
              Contact support
            </Button>
          </div>
          <p className="mt-4 font-mono text-[11px] text-muted-foreground">
            Request ID · req_7bh2q9x · 502 Bad Gateway
          </p>
        </Card>
      </div>
    </>
  );
}

function LoadingScreen() {
  return (
    <>
      <div className="flex flex-col gap-3 border-b bg-background px-6 py-5 md:flex-row md:items-end md:justify-between">
        <div className="space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-80" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-8 w-32" />
        </div>
      </div>
      <div className="flex gap-2 border-b bg-background px-6 py-3">
        <Skeleton className="h-8 w-72" />
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="p-6">
        <Card className="overflow-hidden">
          <div className="border-b bg-muted/40 p-3">
            <Skeleton className="h-4 w-full" />
          </div>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b p-4 last:border-b-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

function SuccessToast() {
  return (
    <>
      <DepartmentList />
      <div className="pointer-events-none fixed inset-x-0 bottom-8 flex justify-center">
        <div className="pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-lg border bg-background p-4 shadow-2xl">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-500/20">
            <CheckCircle2 className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">Department created</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              "Platform Engineering" is live. 42 employees have been notified.
            </p>
            <div className="mt-2 flex gap-3 text-xs">
              <button className="font-medium text-primary hover:underline">View</button>
              <button className="font-medium text-muted-foreground hover:text-foreground">
                Undo
              </button>
            </div>
          </div>
          <button className="text-muted-foreground hover:text-foreground">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Screens                                                     */
/* ------------------------------------------------------------------ */

function MobileList() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b bg-background px-3 py-3">
        <button className="rounded p-1.5 hover:bg-muted">
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">Organization</p>
          <p className="truncate text-sm font-semibold">Departments</p>
        </div>
        <button className="rounded p-1.5 hover:bg-muted">
          <Search className="h-4 w-4" />
        </button>
        <button className="rounded p-1.5 hover:bg-muted">
          <Filter className="h-4 w-4" />
        </button>
      </header>
      <div className="flex gap-1.5 overflow-x-auto border-b bg-background px-3 py-2 text-xs">
        <Badge variant="secondary" className="shrink-0">
          All · 38
        </Badge>
        <Badge variant="outline" className="shrink-0">
          Product
        </Badge>
        <Badge variant="outline" className="shrink-0">
          GTM
        </Badge>
        <Badge variant="outline" className="shrink-0">
          Corporate
        </Badge>
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {DEPARTMENTS.slice(0, 6).map((d) => (
          <Card key={d.code} className="p-3">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                <Network className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold">{d.name}</p>
                </div>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {d.code} · {d.bu}
                </p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" /> {d.headcount}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {d.loc}
                  </span>
                </div>
              </div>
              <StatusPill
                tone={d.status === "Active" ? "success" : d.status === "Draft" ? "warn" : "muted"}
                label={d.status}
              />
            </div>
          </Card>
        ))}
      </div>
      <button className="absolute bottom-20 right-4 grid h-12 w-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg">
        <Plus className="h-5 w-5" />
      </button>
      <nav className="grid grid-cols-4 border-t bg-background">
        {[
          { i: Home, l: "Home" },
          { i: Building2, l: "Org", a: true },
          { i: Users, l: "People" },
          { i: Settings, l: "More" },
        ].map((n) => (
          <button
            key={n.l}
            className={`flex flex-col items-center gap-1 py-2.5 text-[10px] ${n.a ? "text-primary" : "text-muted-foreground"}`}
          >
            <n.i className="h-4 w-4" />
            {n.l}
          </button>
        ))}
      </nav>
    </div>
  );
}

function MobileForm() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b bg-background px-3 py-3">
        <button className="rounded p-1.5 hover:bg-muted">
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-muted-foreground">New</p>
          <p className="truncate text-sm font-semibold">Department</p>
        </div>
      </header>
      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/30 p-3">
        <Card className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Basic
          </p>
          <div className="space-y-3">
            <Field label="Department code" required>
              <Input className="h-10 font-mono uppercase" defaultValue="PLT" />
            </Field>
            <Field label="Display name" required>
              <Input className="h-10" defaultValue="Platform Engineering" />
            </Field>
            <Field label="Business Unit" required>
              <Select defaultValue="prod">
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="prod">Product</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>
        <Card className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Assignments
          </p>
          <div className="space-y-3">
            <Field label="Department Head">
              <div className="flex h-10 items-center gap-2 rounded-md border bg-background px-2">
                <div className="grid h-6 w-6 place-items-center rounded-full bg-primary/10 text-[10px] font-semibold text-primary">
                  IK
                </div>
                <span className="text-sm">Ishaan Kapoor</span>
              </div>
            </Field>
            <Field label="Location">
              <Select defaultValue="blr">
                <SelectTrigger className="h-10">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blr">Bengaluru — HQ Campus</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
        </Card>
        <Card className="p-4">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Options
          </p>
          <Toggle label="List in directory" defaultChecked />
        </Card>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t bg-background p-3">
        <Button variant="outline">Save Draft</Button>
        <Button className="gap-1.5">
          <Check className="h-4 w-4" /> Publish
        </Button>
      </div>
    </div>
  );
}

/* Icon alias for copy used in Holiday screen */
function Copy(props: React.ComponentProps<"svg">) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
