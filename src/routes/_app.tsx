import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Building2, LayoutDashboard, Menu, Users as UsersIcon, UserSquare2, X } from "lucide-react";
import { EwosLogo } from "@/components/ewos/Logo";
import { CompanySwitcher } from "@/components/ewos/CompanySwitcher";
import { NotificationPanel } from "@/components/ewos/NotificationPanel";
import { UserMenu } from "@/components/ewos/UserMenu";
import { Footer } from "@/components/ewos/Footer";
import { GlobalSearch } from "@/components/ewos/GlobalSearch";
import { ThemeToggle } from "@/components/ewos/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { displayName, initials } from "@/lib/api-client";

export const Route = createFileRoute("/_app")({
  component: AppShell,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/users", label: "Users", icon: UsersIcon },
  { to: "/organization", label: "Organization", icon: Building2 },
  { to: "/employees", label: "Employees", icon: UserSquare2 },
] as const;

function AppShell() {
  const { isAuthenticated, isInitializing, user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!isInitializing && !isAuthenticated) {
      navigate({ to: "/login", replace: true });
    }
  }, [isAuthenticated, isInitializing, navigate]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen]);

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-muted/30 text-foreground">
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
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <EwosLogo />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <nav aria-label="Primary" className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="flex min-h-11 items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
              activeOptions={{ exact: false }}
              activeProps={{ "aria-current": "page" }}
            >
              <item.icon className="h-4 w-4" aria-hidden />
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="border-t border-border p-3">
          <Link to="/design-system" className="text-xs text-muted-foreground hover:text-foreground">
            Design System
          </Link>
          <div className="mt-1 text-[11px] text-muted-foreground">EWOS v1.0</div>
        </div>
      </aside>

      <div className="flex min-h-dvh flex-col lg:pl-64">
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
          <CompanySwitcher />
          <div className="mx-2 hidden flex-1 sm:block">
            <GlobalSearch />
          </div>
          <div className="ml-auto flex items-center gap-1 sm:gap-2 sm:ml-0">
            <div className="sm:hidden">
              <GlobalSearch />
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
            <Outlet />
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
