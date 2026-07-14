import {
  createFileRoute,
  Link,
  Outlet,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Menu,
  Users as UsersIcon,
  UserCircle2,
  UserSquare2,
  X,
} from "lucide-react";
import { EwosLogo } from "@/components/ewos/Logo";
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

  if (isInitializing || !isAuthenticated) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30 text-foreground">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-foreground/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-border bg-card transition-transform lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-14 items-center justify-between border-b border-border px-4">
          <EwosLogo />
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 p-3">
          {NAV.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground data-[status=active]:bg-primary/10 data-[status=active]:text-primary"
              activeOptions={{ exact: false }}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-border p-3 text-xs text-muted-foreground">
          EWOS v1.0
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-h-screen flex-col lg:pl-64">
        <TopBar
          onOpenNav={() => setMobileOpen(true)}
          userLabel={displayName(user)}
          userInitials={initials(user)}
          onLogout={async () => {
            await logout();
            navigate({ to: "/login", replace: true });
          }}
        />
        <main className="flex-1">
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

function TopBar({
  onOpenNav,
  userLabel,
  userInitials,
  onLogout,
}: {
  onOpenNav: () => void;
  userLabel: string;
  userInitials: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const currentTitle =
    NAV.find((n) => pathname.startsWith(n.to))?.label ?? "";

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
      <button
        type="button"
        onClick={onOpenNav}
        className="rounded-md p-1.5 text-muted-foreground hover:bg-muted lg:hidden"
        aria-label="Open navigation"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 truncate text-sm font-semibold text-foreground">
        {currentTitle}
      </h1>

      <div className="ml-auto flex items-center gap-2" ref={menuRef}>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-muted"
          aria-haspopup="menu"
          aria-expanded={open}
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {userInitials}
          </span>
          <span className="hidden max-w-[10rem] truncate text-foreground sm:inline">
            {userLabel}
          </span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute right-4 top-14 w-56 overflow-hidden rounded-md border border-border bg-popover shadow-md"
          >
            <div className="border-b border-border px-3 py-2">
              <div className="truncate text-sm font-medium text-foreground">{userLabel}</div>
              <div className="text-xs text-muted-foreground">Signed in</div>
            </div>
            <button
              type="button"
              role="menuitem"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <UserCircle2 className="h-4 w-4 text-muted-foreground" />
              Profile
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={onLogout}
              className="flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
            >
              <LogOut className="h-4 w-4 text-muted-foreground" />
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
