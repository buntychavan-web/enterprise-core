import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Activity,
  ArrowLeftRight,
  Bell,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock,
  Contact2,
  HelpCircle,
  Info,
  Landmark,
  LayoutDashboard,
  Megaphone,
  Menu,
  MoreHorizontal,
  Network,
  PartyPopper,
  Rocket,
  ScrollText,
  Settings as SettingsIcon,
  ShieldCheck,
  Users as UsersIcon,
  Users2,
  UserSquare2,
  Wallet,
  Workflow as WorkflowIcon,
  X,
} from "lucide-react";
import { EwosLogo } from "@/components/ewos/Logo";
import { ErrorBoundary } from "@/components/ewos/ErrorBoundary";
import { CompanySwitcher } from "@/components/ewos/CompanySwitcher";
import { NotificationPanel } from "@/components/ewos/NotificationPanel";
import { UserMenu } from "@/components/ewos/UserMenu";
import { Footer } from "@/components/ewos/Footer";
import { CommandCentre, useTrackRecentRoute } from "@/components/ewos/CommandCentre";
import { ThemeToggle } from "@/components/ewos/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { displayName, initials, tokenStore } from "@/lib/api-client";
import { TenantProvider, useTenant } from "@/lib/tenant-context";
import { useHasDirectReports } from "@/hooks/use-ess-home-data";
import { cn } from "@/lib/utils";

// Sprint 2.1 — Company Switcher backend integration. GET /api/v1/companies
// is already Chinese-Wall filtered server-side to the companies under the
// caller's accessible clients. Sprint 2.1 lifted the companies/activeCompanyId
// state out of this route into TenantProvider (lib/tenant-context.tsx) so
// sibling routes (Employees, Organization) can consume the active tenant and
// company via useTenant() instead of hardcoding DEFAULT_TENANT_ID/DEFAULT_COMPANY_ID.
//
// Sprint 0 (EWOS App Shell) — the flat 27-item NAV list below is replaced by
// a small primary nav (Home, Work, Team) plus a "More" group holding every
// other existing route unchanged. No route was removed or renamed; only
// where each one is *linked from* changed. See CTO review "App Shell —
// REDESIGN: keep auth guard, ErrorBoundary, CompanySwitcher, notification
// bell wiring — replace the flat sidebar with the new IA."

export const Route = createFileRoute("/_app")({
  // Route-level guard: redirects before the protected shell ever renders,
  // instead of the previous mount-then-useEffect-then-navigate flash. Checks
  // tokenStore directly (a synchronous storage read) rather than useAuth(),
  // since beforeLoad runs outside React and can't read context.
  beforeLoad: () => {
    if (!tokenStore.get()) {
      throw redirect({ to: "/login" });
    }
  },
  component: AppShell,
});

const PRIMARY_NAV = [
  { to: "/dashboard", label: "Home", icon: LayoutDashboard },
  { to: "/work", label: "Work", icon: Briefcase },
] as const;

const TEAM_ITEM = { to: "/my-team", label: "Team", icon: Users2 } as const;

const MORE_NAV = [
  { to: "/employees", label: "Employees", icon: UserSquare2 },
  { to: "/attendance", label: "Attendance (Admin)", icon: Clock },
  { to: "/leave", label: "Leave (Admin)", icon: CalendarDays },
  { to: "/payslips", label: "Payslips (Admin)", icon: Wallet },
  { to: "/directory", label: "Directory", icon: Contact2 },
  { to: "/holidays", label: "Holidays", icon: PartyPopper },
  { to: "/announcements", label: "Announcements", icon: Megaphone },
  { to: "/notifications", label: "Notifications", icon: Bell },
  { to: "/organization", label: "Organization", icon: Building2 },
  { to: "/tenant-management", label: "Tenant Management", icon: Landmark },
  { to: "/outsourcing", label: "Outsourcing", icon: Landmark },
  { to: "/provider-dashboard", label: "Provider Dashboard", icon: ScrollText },
  { to: "/data-exchange", label: "Data Exchange", icon: ArrowLeftRight },
  { to: "/client-approvals", label: "Client Approvals", icon: ClipboardCheck },
  { to: "/integration-configurations", label: "Integration Configurations", icon: Network },
  { to: "/integration-monitoring", label: "Integration Monitoring", icon: Activity },
  { to: "/operations-dashboard", label: "Operations Dashboard", icon: WorkflowIcon },
  { to: "/client-golive", label: "Client Go-Live", icon: Rocket },
  { to: "/users", label: "Users", icon: UsersIcon },
  { to: "/roles", label: "Roles", icon: ShieldCheck },
  { to: "/audit-history", label: "Audit History", icon: ClipboardCheck },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
  { to: "/help", label: "Help", icon: HelpCircle },
  { to: "/about", label: "About EWOS", icon: Info },
] as const;

function AppShell() {
  const { isAuthenticated, isInitializing } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <TenantProvider>
      <AppShellContent />
    </TenantProvider>
  );
}

function AppShellContent() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { companies, activeCompanyId, selectCompany } = useTenant();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const hasTeam = useHasDirectReports();

  const moreIsActive = MORE_NAV.some((item) => pathname.startsWith(item.to));
  const [moreOpen, setMoreOpen] = useState(moreIsActive);

  useTrackRecentRoute();

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  // EWOS identity (Sprint 0 design gate) — dark-ink nav rail. Active state is
  // a gold left-indicator (box-shadow, not a border, so it doesn't shift
  // layout) + gold text, never a filled background — restrained per "do not
  // make the rail visually heavy."
  const navLinkClass =
    "flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-nav-fg transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-ink data-[status=active]:text-nav-fg-active data-[status=active]:shadow-[inset_2.5px_0_0_var(--nav-fg-active)]";

  return (
    <div className="min-h-dvh bg-ewos-canvas text-foreground">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground focus:shadow"
      >
        Skip to main content
      </a>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close navigation overlay"
        />
      )}

      <aside
        id="primary-navigation"
        aria-label="Sidebar"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-ink transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-ink-border px-4">
          <EwosLogo onDark />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="text-nav-fg hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-0.5 overflow-y-auto p-3 pb-20 lg:pb-3">
          {PRIMARY_NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={navLinkClass}
              activeOptions={{ exact: false }}
              activeProps={{ "aria-current": "page" }}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
          {hasTeam && (
            <Link
              to={TEAM_ITEM.to}
              onClick={() => setMobileOpen(false)}
              className={navLinkClass}
              activeOptions={{ exact: false }}
              activeProps={{ "aria-current": "page" }}
            >
              <TEAM_ITEM.icon className="h-4 w-4" aria-hidden />
              {TEAM_ITEM.label}
            </Link>
          )}

          <div className="my-2 border-t border-ink-border" />

          <button
            type="button"
            onClick={() => setMoreOpen((o) => !o)}
            aria-expanded={moreOpen}
            aria-controls="more-nav-group"
            className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-nav-fg transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
            More
          </button>
          {moreOpen && (
            <div id="more-nav-group" className="space-y-0.5">
              {MORE_NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileOpen(false)}
                  className={cn(navLinkClass, "pl-9 text-[13px]")}
                  activeOptions={{ exact: false }}
                  activeProps={{ "aria-current": "page" }}
                >
                  <item.icon className="h-3.5 w-3.5" aria-hidden />
                  {item.label}
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="border-t border-ink-border p-3">
          <div className="text-[11px] text-nav-fg">EWOS v1.0</div>
        </div>
      </aside>

      {/* pb-16 clears the fixed mobile bottom tab bar (h-14 + safe-area) so it never
          overlaps the last card on a page or the footer — see Sprint 0 review's
          "mobile overflow" finding. Applied to the whole column, not just <main>,
          since <Footer/> is a sibling that needs the same clearance. */}
      <div className="flex min-h-dvh flex-col pb-16 lg:pb-0 lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(true)}
            className="lg:hidden"
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="primary-navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <CompanySwitcher
            companies={companies}
            activeId={activeCompanyId}
            onSelect={selectCompany}
          />
          <div className="mx-2 hidden flex-1 sm:block">
            <CommandCentre />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 sm:ml-0">
            <div className="sm:hidden">
              <CommandCentre />
            </div>
            <ThemeToggle />
            <NotificationPanel />
            <UserMenu
              name={displayName(user)}
              initials={initials(user)}
              onLogout={async () => {
                await logout();
                navigate({ to: "/login", replace: true });
              }}
            />
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <ErrorBoundary key={pathname} section="This page">
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        <Footer />
      </div>

      <MobileTabBar pathname={pathname} hasTeam={hasTeam} onMore={() => setMobileOpen(true)} />
    </div>
  );
}

/**
 * Sprint 0 (EWOS App Shell) — mobile bottom navigation.
 *
 * EWOS identity (Sprint 0 design gate): adapted from the desktop rail, not a
 * copy of it — same dark-ink + gold language (so the brand signature still
 * reads at 375px), but the gesture changes to suit touch/thumb use: a solid
 * gold-filled pill behind the active icon instead of the desktop's inset
 * left-indicator, since a 2.5px edge bar isn't legible at this size. Mobile
 * is not a shrunken desktop, per the design brief.
 */
function MobileTabBar({
  pathname,
  hasTeam,
  onMore,
}: {
  pathname: string;
  hasTeam: boolean;
  onMore: () => void;
}) {
  const tabs = [...PRIMARY_NAV, ...(hasTeam ? [TEAM_ITEM] : [])];

  return (
    <nav
      aria-label="Primary (mobile)"
      className="fixed inset-x-0 bottom-0 z-30 grid border-t border-ink-border bg-ink lg:hidden"
      style={{ gridTemplateColumns: `repeat(${tabs.length + 1}, minmax(0, 1fr))` }}
    >
      {tabs.map((item) => {
        const active = pathname === item.to || pathname.startsWith(`${item.to}/`);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-nav-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-inset",
              active && "text-nav-fg-active",
            )}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={cn(
                "flex h-6 w-9 items-center justify-center rounded-full",
                active && "bg-nav-fg-active/15",
              )}
            >
              <item.icon className="h-5 w-5" aria-hidden />
            </span>
            {item.label}
          </Link>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        className="flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] font-medium text-nav-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-attention focus-visible:ring-inset"
      >
        <span className="flex h-6 w-9 items-center justify-center rounded-full">
          <MoreHorizontal className="h-5 w-5" aria-hidden />
        </span>
        More
      </button>
    </nav>
  );
}
