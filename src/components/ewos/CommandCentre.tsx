import { useEffect, useRef, useState } from "react";
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
  // Sprint 1 (ESS Core Polish) — these 3 admin screens already existed as
  // real, linked routes (sidebar "More" group, labeled "(Admin)" there too)
  // but were conspicuously absent from ⌘K search right next to their ESS
  // counterparts above. Nav["to"] already had these paths typed; only the
  // NAV entries were missing. The other 11 admin/ops routes in "More"
  // (Tenant Management, Outsourcing, Integration Monitoring, etc.) are
  // deliberately left out of ⌘K search for now — see Sprint 1 report.
  { label: "Leave (Admin)", to: "/leave", icon: CalendarDays, hint: "Tenant-wide leave" },
  { label: "Attendance (Admin)", to: "/attendance", icon: Clock, hint: "Tenant-wide attendance" },
  { label: "Payslips (Admin)", to: "/payslips", icon: Wallet, hint: "Look up by employee" },
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

// Sprint 0 final-gate E2E testing found that AppShell mounts two
// <CommandCentre/> instances (one per responsive trigger wrapper — see
// _app.tsx's header), and each independently owned its own `open` state and
// its own global Cmd/Ctrl+K listener. Pressing the shortcut fired both
// listeners at once and opened two stacked dialogs. Rather than restructure
// the header's responsive layout, the open state and the keyboard shortcut
// are made module-level singletons here: exactly one "Cmd/Ctrl+K opens,
// Escape closes" listener ever exists, and every mounted instance renders
// off the same shared boolean.
let sharedOpen = false;
const openSubscribers = new Set<(open: boolean) => void>();

function publishOpen(next: boolean) {
  sharedOpen = next;
  openSubscribers.forEach((notify) => notify(next));
}

let globalShortcutHandler: ((e: KeyboardEvent) => void) | null = null;

function attachGlobalShortcut() {
  if (globalShortcutHandler || typeof window === "undefined") return;
  globalShortcutHandler = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      publishOpen(!sharedOpen);
      return;
    }
    if (e.key === "Escape" && sharedOpen) {
      publishOpen(false);
    }
  };
  window.addEventListener("keydown", globalShortcutHandler);
}

// Torn down once the last mounted instance unsubscribes (component-test
// remounts, HMR, or a logout/login cycle that unmounts the whole shell) so
// the next mount starts clean instead of inheriting a stale open state or a
// duplicate listener.
function detachGlobalShortcutIfIdle() {
  if (openSubscribers.size > 0 || !globalShortcutHandler || typeof window === "undefined") return;
  window.removeEventListener("keydown", globalShortcutHandler);
  globalShortcutHandler = null;
  sharedOpen = false;
}

function useSharedCommandCentreOpen() {
  const [open, setLocalOpen] = useState(sharedOpen);
  useEffect(() => {
    attachGlobalShortcut();
    openSubscribers.add(setLocalOpen);
    return () => {
      openSubscribers.delete(setLocalOpen);
      detachGlobalShortcutIfIdle();
    };
  }, []);
  const setOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    publishOpen(typeof next === "function" ? next(sharedOpen) : next);
  };
  return [open, setOpen] as const;
}

// Sharing `open` alone isn't enough — every mounted <CommandCentre/> still
// renders its own <CommandDialog>, so two instances would still show two
// (perfectly synced) dialogs. Only the first-mounted instance "owns" and
// renders the dialog; every other instance renders trigger buttons only,
// which still work since they share the same open state above.
let dialogOwner: object | null = null;

function useIsCommandDialogOwner() {
  const idRef = useRef<object | null>(null);
  if (!idRef.current) idRef.current = {};
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    const id = idRef.current!;
    if (dialogOwner === null) {
      dialogOwner = id;
      setIsOwner(true);
    }
    return () => {
      if (dialogOwner === id) dialogOwner = null;
    };
  }, []);

  return isOwner;
}

export function CommandCentre() {
  const [open, setOpen] = useSharedCommandCentreOpen();
  const isDialogOwner = useIsCommandDialogOwner();
  const [recent, setRecent] = useState<string[]>([]);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
      {/* EWOS identity (Sprint 0 design gate) — the trigger's ⌘K chip uses the
          dark-ink + gold pairing so Command Centre reads as the same shell
          language as the nav rail, even though the topbar itself stays light. */}
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
        <kbd className="pointer-events-none hidden select-none rounded bg-ink px-1.5 py-0.5 text-[10px] font-medium text-nav-fg-active sm:inline-block">
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

      {/* Only the dialog-owning instance renders CommandDialog at all — see
          useIsCommandDialogOwner above. Every instance's trigger buttons
          above still work, since they all drive the same shared open state. */}
      {isDialogOwner && (
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
                  {n.hint && (
                    <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </CommandDialog>
      )}
    </>
  );
}
