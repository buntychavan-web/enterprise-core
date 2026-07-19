import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Calendar as CalendarIcon,
  Check,
  CheckCircle2,
  Info,
  Loader2,
  Plus,
  Search,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { LoadingState, TableSkeleton } from "@/components/ewos/LoadingState";
import { StatCard } from "@/components/ewos/StatCard";
import { CompanySwitcher } from "@/components/ewos/CompanySwitcher";
import { NotificationPanel } from "@/components/ewos/NotificationPanel";
import { UserMenu } from "@/components/ewos/UserMenu";
import { EwosLogo } from "@/components/ewos/Logo";

export const Route = createFileRoute("/design-system")({
  head: () => ({
    meta: [
      { title: "Design System — EWOS" },
      {
        name: "description",
        content: "The EWOS design system: tokens, components, and layout primitives.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DesignSystemPage,
});

const SECTIONS = [
  { id: "tokens", label: "Design Tokens" },
  { id: "typography", label: "Typography" },
  { id: "buttons", label: "Buttons" },
  { id: "forms", label: "Forms" },
  { id: "feedback", label: "Feedback" },
  { id: "data", label: "Data Display" },
  { id: "navigation", label: "Navigation" },
  { id: "overlays", label: "Overlays" },
  { id: "layout", label: "Layout Primitives" },
  { id: "states", label: "State Patterns" },
];

function DesignSystemPage() {
  return (
    <div className="min-h-screen bg-muted/30">
      <header className="sticky top-0 z-30 border-b border-border bg-card">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <EwosLogo />
          <span className="text-xs text-muted-foreground">Design System · WP-001</span>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground">
              Login
            </Link>
            <Link to="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[220px_1fr]">
        <nav aria-label="Sections" className="hidden lg:block">
          <div className="sticky top-20 space-y-1">
            {SECTIONS.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="block rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {s.label}
              </a>
            ))}
          </div>
        </nav>

        <main className="min-w-0 space-y-16">
          <PageHeader
            eyebrow="WP-001 · UI Foundation"
            title="EWOS Design System"
            description="Living reference for tokens, components, and layout primitives used across EWOS."
            actions={<Badge variant="secondary">v1.0</Badge>}
          />

          <TokensSection />
          <TypographySection />
          <ButtonsSection />
          <FormsSection />
          <FeedbackSection />
          <DataSection />
          <NavigationSection />
          <OverlaysSection />
          <LayoutSection />
          <StatesSection />
        </main>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Reusable showcase wrappers                                          */
/* ------------------------------------------------------------------ */

function Section({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-20 space-y-4">
      <div>
        <h2 id={`${id}-title`} className="text-xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Example({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div
        className={cn(
          "flex flex-wrap items-start gap-3 rounded-lg border border-border bg-card p-4",
          className,
        )}
      >
        {children}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tokens                                                              */
/* ------------------------------------------------------------------ */

const COLOR_TOKENS = [
  "background",
  "foreground",
  "card",
  "primary",
  "secondary",
  "muted",
  "accent",
  "destructive",
  "border",
  "input",
  "ring",
];

const RADII = [
  { name: "sm", cls: "rounded-sm" },
  { name: "md", cls: "rounded-md" },
  { name: "lg", cls: "rounded-lg" },
  { name: "xl", cls: "rounded-xl" },
  { name: "full", cls: "rounded-full" },
];

const SHADOWS = [
  { name: "xs", cls: "shadow-xs" },
  { name: "sm", cls: "shadow-sm" },
  { name: "md", cls: "shadow-md" },
  { name: "lg", cls: "shadow-lg" },
  { name: "xl", cls: "shadow-xl" },
];

const SPACING = [1, 2, 3, 4, 6, 8, 12, 16];

function TokensSection() {
  return (
    <Section
      id="tokens"
      title="Design Tokens"
      description="Semantic tokens defined in src/styles.css. Always reference these via Tailwind utilities — never hardcode hex values."
    >
      <Example title="Colors">
        <div className="grid w-full grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_TOKENS.map((t) => (
            <div key={t} className="rounded-md border border-border overflow-hidden">
              <div className="h-14 w-full" style={{ backgroundColor: `var(--${t})` }} aria-hidden />
              <div className="px-2 py-1.5 text-xs">
                <div className="font-medium text-foreground">{t}</div>
                <div className="text-muted-foreground">--{t}</div>
              </div>
            </div>
          ))}
        </div>
      </Example>

      <Example title="Border radius">
        {RADII.map((r) => (
          <div key={r.name} className="flex flex-col items-center gap-1">
            <div className={cn("h-14 w-14 border border-border bg-muted", r.cls)} />
            <div className="text-xs text-muted-foreground">{r.name}</div>
          </div>
        ))}
      </Example>

      <Example title="Shadows / Elevation">
        {SHADOWS.map((s) => (
          <div key={s.name} className="flex flex-col items-center gap-1">
            <div className={cn("h-14 w-20 rounded-md bg-card", s.cls)} />
            <div className="text-xs text-muted-foreground">{s.name}</div>
          </div>
        ))}
      </Example>

      <Example title="Spacing scale (Tailwind units)">
        <div className="flex w-full flex-col gap-1.5">
          {SPACING.map((n) => (
            <div key={n} className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="w-8 font-mono">{n}</span>
              <span className="block h-3 rounded bg-primary" style={{ width: `${n * 4}px` }} />
              <span>{n * 4}px</span>
            </div>
          ))}
        </div>
      </Example>

      <Example title="Focus ring">
        <Button variant="outline">Tab to focus me</Button>
        <Input placeholder="Tab to focus me" className="max-w-xs" />
      </Example>

      <Example title="Icons — Lucide (24px @ stroke 2)">
        {[Users, Bell, Check, XCircle, Plus, Trash2, Search, Info].map((I, i) => (
          <div
            key={i}
            className="grid h-10 w-10 place-items-center rounded-md border border-border text-muted-foreground"
          >
            <I className="h-5 w-5" />
          </div>
        ))}
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Typography                                                          */
/* ------------------------------------------------------------------ */

function TypographySection() {
  return (
    <Section
      id="typography"
      title="Typography"
      description="Inter across the product. Use tracking-tight on headings, and text-muted-foreground for secondary copy."
    >
      <Example title="Scale" className="flex-col items-start gap-2">
        <div className="text-4xl font-semibold tracking-tight">Display · 4xl / 600</div>
        <div className="text-2xl font-semibold tracking-tight">Heading 1 · 2xl / 600</div>
        <div className="text-xl font-semibold tracking-tight">Heading 2 · xl / 600</div>
        <div className="text-base font-medium">Body strong · base / 500</div>
        <div className="text-sm">Body · sm / 400</div>
        <div className="text-xs text-muted-foreground">Caption · xs / muted</div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Eyebrow · uppercase tracking-wide
        </div>
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Buttons                                                             */
/* ------------------------------------------------------------------ */

function ButtonsSection() {
  return (
    <Section id="buttons" title="Buttons">
      <Example title="Variants">
        <Button>Default</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="outline">Outline</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="link">Link</Button>
        <Button variant="destructive">Destructive</Button>
      </Example>
      <Example title="Sizes">
        <Button size="sm">Small</Button>
        <Button>Default</Button>
        <Button size="lg">Large</Button>
        <Button size="icon" aria-label="Add">
          <Plus />
        </Button>
      </Example>
      <Example title="States">
        <Button disabled>Disabled</Button>
        <Button>
          <Loader2 className="animate-spin" /> Loading
        </Button>
        <Button>
          <Plus /> With icon
        </Button>
        <Button variant="outline">
          <Trash2 /> Delete
        </Button>
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Forms                                                               */
/* ------------------------------------------------------------------ */

function FormsSection() {
  const [date, setDate] = useState<Date | undefined>();
  return (
    <Section id="forms" title="Forms">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Example title="Input" className="flex-col items-stretch">
          <div className="space-y-1.5">
            <Label htmlFor="ds-input">Label</Label>
            <Input id="ds-input" placeholder="Placeholder" />
            <p className="text-xs text-muted-foreground">Helper text.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-input-err">With error</Label>
            <Input id="ds-input-err" aria-invalid defaultValue="invalid@" />
            <p className="text-xs text-destructive">Must be a valid email.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ds-input-dis">Disabled</Label>
            <Input id="ds-input-dis" disabled defaultValue="Read only" />
          </div>
        </Example>

        <Example title="Textarea" className="flex-col items-stretch">
          <Label htmlFor="ds-ta">Notes</Label>
          <Textarea id="ds-ta" placeholder="Add notes…" rows={4} />
        </Example>

        <Example title="Select" className="flex-col items-stretch">
          <Label>Department</Label>
          <Select>
            <SelectTrigger>
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="eng">Engineering</SelectItem>
              <SelectItem value="hr">Human Resources</SelectItem>
              <SelectItem value="fin">Finance</SelectItem>
            </SelectContent>
          </Select>
        </Example>

        <Example title="Date picker" className="flex-col items-stretch">
          <Label>Effective date</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                initialFocus
                className="pointer-events-auto p-3"
              />
            </PopoverContent>
          </Popover>
        </Example>

        <Example title="Checkbox / Radio / Switch" className="flex-col items-start">
          <label className="flex items-center gap-2 text-sm">
            <Checkbox defaultChecked /> Send welcome email
          </label>
          <RadioGroup defaultValue="active" className="flex gap-4">
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="active" /> Active
            </label>
            <label className="flex items-center gap-2 text-sm">
              <RadioGroupItem value="inactive" /> Inactive
            </label>
          </RadioGroup>
          <label className="flex items-center gap-2 text-sm">
            <Switch defaultChecked /> Enabled
          </label>
        </Example>
      </div>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback                                                            */
/* ------------------------------------------------------------------ */

function FeedbackSection() {
  return (
    <Section id="feedback" title="Feedback">
      <Example title="Badges">
        <Badge>Default</Badge>
        <Badge variant="secondary">Secondary</Badge>
        <Badge variant="outline">Outline</Badge>
        <Badge variant="destructive">Destructive</Badge>
        <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Active</Badge>
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Pending</Badge>
      </Example>

      <Example title="Alerts" className="flex-col items-stretch">
        <Alert>
          <Info />
          <AlertTitle>Heads up</AlertTitle>
          <AlertDescription>System maintenance scheduled tonight.</AlertDescription>
        </Alert>
        <Alert>
          <CheckCircle2 />
          <AlertTitle>Success</AlertTitle>
          <AlertDescription>Employee record was updated.</AlertDescription>
        </Alert>
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>We couldn't reach the server.</AlertDescription>
        </Alert>
      </Example>

      <Example title="Toasts (sonner)">
        <Button variant="outline" onClick={() => toast("Saved changes")}>
          Default
        </Button>
        <Button variant="outline" onClick={() => toast.success("Employee created")}>
          Success
        </Button>
        <Button variant="outline" onClick={() => toast.error("Something went wrong")}>
          Error
        </Button>
        <Button
          variant="outline"
          onClick={() => toast("Payroll run started", { description: "Cycle: October 2026" })}
        >
          With description
        </Button>
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Data display                                                        */
/* ------------------------------------------------------------------ */

function DataSection() {
  return (
    <Section id="data" title="Data Display">
      <Example title="Cards" className="flex-col items-stretch">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Basic card</CardTitle>
              <CardDescription>With header, content, and description.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">Any content goes here.</p>
            </CardContent>
          </Card>
          <StatCard
            label="Employees"
            value={1284}
            icon={<Users className="h-5 w-5" />}
            hint="Total records"
          />
        </div>
      </Example>

      <Example title="Table" className="block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Employee</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Salary</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[
              { n: "Ana Rivera", d: "Engineering", s: "Active", sal: "$92,000" },
              { n: "Marco Silva", d: "Finance", s: "Active", sal: "$78,500" },
              { n: "Priya Shah", d: "HR", s: "On leave", sal: "$64,000" },
            ].map((r) => (
              <TableRow key={r.n}>
                <TableCell className="font-medium">{r.n}</TableCell>
                <TableCell>{r.d}</TableCell>
                <TableCell>
                  <Badge variant={r.s === "Active" ? "secondary" : "outline"}>{r.s}</Badge>
                </TableCell>
                <TableCell className="text-right">{r.sal}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Example>

      <Example title="Skeleton loaders" className="flex-col items-stretch">
        <div className="space-y-2">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <TableSkeleton rows={3} cols={4} />
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Navigation                                                          */
/* ------------------------------------------------------------------ */

function NavigationSection() {
  return (
    <Section id="navigation" title="Navigation">
      <Example title="Breadcrumb">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Home</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="#">Employees</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Ana Rivera</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </Example>

      <Example title="Tabs" className="block">
        <Tabs defaultValue="profile">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="compensation">Compensation</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>
          <TabsContent value="profile" className="pt-3 text-sm text-muted-foreground">
            Profile content.
          </TabsContent>
          <TabsContent value="compensation" className="pt-3 text-sm text-muted-foreground">
            Compensation content.
          </TabsContent>
          <TabsContent value="documents" className="pt-3 text-sm text-muted-foreground">
            Documents content.
          </TabsContent>
        </Tabs>
      </Example>

      <Example title="Page header">
        <div className="w-full">
          <PageHeader
            eyebrow="Human Resources"
            title="Employees"
            description="Manage employee records, positions, and reporting lines."
            actions={
              <>
                <Button variant="outline">
                  <Search /> Search
                </Button>
                <Button>
                  <Plus /> Add employee
                </Button>
              </>
            }
          />
        </div>
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Overlays                                                            */
/* ------------------------------------------------------------------ */

function OverlaysSection() {
  return (
    <Section id="overlays" title="Overlays">
      <Example title="Modal (Dialog)">
        <Dialog>
          <DialogTrigger asChild>
            <Button variant="outline">Open modal</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm deletion</DialogTitle>
              <DialogDescription>
                This will permanently remove the record. This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline">Cancel</Button>
              <Button variant="destructive">Delete</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </Example>

      <Example title="Drawer (Sheet)">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline">Open drawer</Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>Refine the list of employees.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 px-4">
              <Label>Department</Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="All departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="eng">Engineering</SelectItem>
                  <SelectItem value="hr">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </SheetContent>
        </Sheet>
      </Example>

      <Example title="Popover">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline">Open popover</Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="text-sm">Compact contextual UI lives here.</div>
          </PopoverContent>
        </Popover>
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

function LayoutSection() {
  return (
    <Section
      id="layout"
      title="Layout Primitives"
      description="Shell components used in the authenticated app layout."
    >
      <Example title="Company switcher">
        <CompanySwitcher />
        <CompanySwitcher
          companies={[
            { id: "1", name: "Acme Corp" },
            { id: "2", name: "Globex" },
          ]}
          activeId="1"
        />
      </Example>

      <Example title="Notification panel">
        <NotificationPanel />
        <NotificationPanel
          notifications={[
            {
              id: "1",
              title: "Payroll approved",
              description: "October cycle",
              createdAt: "5 min ago",
            },
            { id: "2", title: "New employee added", createdAt: "1 hr ago", read: true },
          ]}
        />
      </Example>

      <Example title="User menu">
        <UserMenu name="Ana Rivera" initials="AR" onLogout={() => toast("Logged out")} />
      </Example>

      <Example title="Sidebar item (visual)">
        <div className="w-64 rounded-md border border-border bg-card p-3">
          <div className="flex items-center gap-3 rounded-md bg-primary/10 px-3 py-2 text-sm font-medium text-primary">
            <Users className="h-4 w-4" /> Active item
          </div>
          <div className="mt-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground">
            <Bell className="h-4 w-4" /> Inactive item
          </div>
        </div>
      </Example>

      <Example title="Separator">
        <div className="w-full space-y-2">
          <div className="text-sm">Above</div>
          <Separator />
          <div className="text-sm">Below</div>
        </div>
      </Example>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/* State patterns                                                      */
/* ------------------------------------------------------------------ */

function StatesSection() {
  return (
    <Section
      id="states"
      title="State Patterns"
      description="Standard responses for loading, empty, and error conditions."
    >
      <Example title="Loading">
        <div className="w-full">
          <LoadingState />
        </div>
      </Example>
      <Example title="Empty">
        <div className="w-full">
          <EmptyState
            title="No employees yet"
            description="Add your first employee to get started."
            action={
              <Button>
                <Plus /> Add employee
              </Button>
            }
          />
        </div>
      </Example>
      <Example title="Error">
        <Alert variant="destructive" className="w-full">
          <AlertTriangle />
          <AlertTitle>We couldn't load this data</AlertTitle>
          <AlertDescription>Check your connection and try again.</AlertDescription>
        </Alert>
      </Example>
    </Section>
  );
}
