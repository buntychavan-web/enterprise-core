import { useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarDays,
  Clock,
  Contact2,
  HelpCircle,
  Info,
  LayoutDashboard,
  Megaphone,
  PartyPopper,
  Search,
  Settings,
  UserCircle2,
  UserSquare2,
  Users as UsersIcon,
  Wallet,
  Briefcase,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

/**
 * Sprint 0 (EWOS App Shell) — Command Centre V1, refined from the previous
 * `GlobalSearch.tsx` (renamed, history preserved via `git mv`).
 *
 * V1 scope, exactly as specified: Cmd/Ctrl+K, a visible search button (no
 * shortcut required), route search, navigation, and *real* recent actions
 * (the user's own last-visited routes, tracked client-side — not fabricated
 * "AI-predicted" suggestions). No LLM, no natural-language parsing, no fake
 * command execution.
 *
 * `CommandResult.kind` is a discriminated union with only `"route"`
 * populated today. `"action"` and `"person"` exist as reserved variants so a
 * future action registry / people search can plug into this same dialog
 * without restructuring it — per the Sprint 0 brief's "structure the
 * component so these can be added later," not built now.
 */

type CommandResult =
  | { kind: "route"; to: Nav["to"]; label: string; hint?: string; icon: Nav["icon"] }
  // Reserved for a future action registry — no producers exist yet.
  | { kind: "action"; id: string; label: string }
  // Reserved for future people search — no producers exist yet.
  | { kind: "person"; id: string; label: string };

type Nav = {
  label: string;
  to:
    | "/dashboard"
    | "/work"
    | "/users"
    | "/organization"
    | "/employees"
    | "/profile"
    | "/settings"
    | "/attendance"
    | "/leave"
    | "/payslips"
    | "/notifications"
    | "/my-leave"
    | "/my-attendance"
    | "/my-payslips"
    | "/my-team"
    | "/directory"
    | "/holidays"
    | "/announcements"
    | "/help"
    | "/about";
  icon: typeof LayoutDashboard;
  hint?: string;
};

const NAV: Nav[] = [
  { label: "Home", to: "/dashboard", icon: LayoutDashboard, hint: "Today" },
  { label: "Work", to: "/work", icon: Briefcase, hint: "Leave, attendance, payslips" },
  { label: "My Leave", to: "/my-leave", icon: CalendarDays },
  { label: "My Attendance", to: "/my-attendance", icon: Clock },
  { label: "My Payslips", to: "/my-payslips", icon: Wallet },
  { label: "My profile", to: "/profile", icon: UserCircle2 },
  { label: "My Team", to: "/my-team", icon: UsersIcon, hint: "Manager & reports" },
  { label: "Employees", to: "/employees", icon: UserSquare2, hint: "Workforce directory" },
  { label: "Directory", to: "/directory", icon: Contact2, hint: "Company-wide people" },
  { label: "Holidays", to: "/holidays", icon: PartyPopper, hint: "Company calendar" },
  { label: "Announcements", to: "/announcements", icon: Megaphone, hint: "Latest news" },
  { label: "Notifications", to: "/notifications", icon: Bell, hint: "Inbox" },
  { label: "Organization", to: "/organization", icon: Building2, hint: "Setup" },
  { label: "Users", to: "/users", icon: UsersIcon, hint: "Access & roles" },
  { label: "Help Center", to: "/help", icon: HelpCircle, hint: "Guides & shortcuts" },
  { label: "About EWOS", to: "/about", icon: Info },
  { label: "Settings", to: "/settings", icon: Settings },
];

const RECENT_KEY = "ewos.recentRoutes";
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

function pushRecent(path: string) {
  if (typeof window === "undefined") return;
  const current = readRecent().filter((p) => p !== path);
  current.unshift(path);
  localStorage.setItem(RECENT_KEY, JSON.stringify(current.slice(0, MAX_RECENT)));
}

/** Tracks real navigation so the Command Centre's "Recent" group reflects actual usage. */
export function useTrackRecentRoute() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  useEffect(() => {
    if (NAV.some((n) => n.to === pathname)) {
      pushRecent(pathname);
    }
  }, [pathname]);
}

export function CommandCentre() {
  const [open, setOpen] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Sprint 0 review fix: verified via manual browser testing that Escape
  // needed two presses to close the dialog (Radix's own DismissableLayer
  // escape-to-close didn't fire on the first press in this app — root cause
  // not fully isolated, but reproducible regardless of timing). This
  // explicit handler makes a single Escape always close it, independent of
  // whatever layering interaction was swallowing the first keydown.
  useEffect(() => {
    if (!open) return;
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [open]);

  useEffect(() => {
    if (open) setRecent(readRecent().filter((p) => p !== pathname));
  }, [open, pathname]);

  const go = (result: CommandResult) => {
    setOpen(false);
    if (result.kind === "route") navigate({ to: result.to });
    // "action"/"person" kinds have no producers yet — nothing to handle.
  };

  const recentNav = recent
    .map((path) => NAV.find((n) => n.to === path))
    .filter((n): n is Nav => !!n);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xs items-center justify-between gap-2 text-muted-foreground sm:flex"
        aria-label="Open command centre"
      >
        <span className="flex items-center gap-2">
          <Search className="h-4 w-4" />
          Search EWOS…
        </span>
        <kbd className="pointer-events-none hidden select-none rounded border border-border bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-block">
          ⌘K
        </kbd>
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="sm:hidden"
        aria-label="Open command centre"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search modules, people, actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          {recentNav.length > 0 && (
            <>
              <CommandGroup heading="Recent">
                {recentNav.map((n) => (
                  <CommandItem
                    key={`recent-${n.to}`}
                    value={`recent ${n.label} ${n.hint ?? ""}`}
                    onSelect={() => go({ kind: "route", to: n.to, label: n.label, icon: n.icon })}
                  >
                    <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                    <span>{n.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
            </>
          )}
          <CommandGroup heading="Navigate">
            {NAV.map((n) => (
              <CommandItem
                key={n.to}
                value={`${n.label} ${n.hint ?? ""}`}
                onSelect={() => go({ kind: "route", to: n.to, label: n.label, icon: n.icon })}
              >
                <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{n.label}</span>
                {n.hint && <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
