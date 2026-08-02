import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
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
  Search,
  Settings,
  UserCircle2,
  UserSquare2,
  Users as UsersIcon,
  Wallet,
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

type Nav = {
  label: string;
  to:
    | "/dashboard"
    | "/users"
    | "/organization"
    | "/employees"
    | "/profile"
    | "/settings"
    | "/attendance"
    | "/leave"
    | "/payslips"
    | "/notifications"
    | "/my-team"
    | "/directory"
    | "/announcements"
    | "/help"
    | "/about";
  icon: typeof LayoutDashboard;
  hint?: string;
};

const NAV: Nav[] = [
  { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard, hint: "Executive overview" },
  { label: "Employees", to: "/employees", icon: UserSquare2, hint: "Workforce directory" },
  { label: "Attendance", to: "/attendance", icon: Clock, hint: "Daily punches" },
  { label: "Leave", to: "/leave", icon: CalendarDays, hint: "Balances & requests" },
  { label: "Payslips", to: "/payslips", icon: Wallet, hint: "Salary history" },
  { label: "My Team", to: "/my-team", icon: UsersIcon, hint: "Manager & reports" },
  { label: "Directory", to: "/directory", icon: Contact2, hint: "Company-wide people" },
  { label: "Announcements", to: "/announcements", icon: Megaphone, hint: "Latest news" },
  { label: "Notifications", to: "/notifications", icon: Bell, hint: "Inbox" },
  { label: "Organization", to: "/organization", icon: Building2, hint: "Setup" },
  { label: "Users", to: "/users", icon: UsersIcon, hint: "Access & roles" },
  { label: "Help Center", to: "/help", icon: HelpCircle, hint: "Guides & shortcuts" },
  { label: "About EWOS", to: "/about", icon: Info },
  { label: "My profile", to: "/profile", icon: UserCircle2 },
  { label: "Settings", to: "/settings", icon: Settings },
];

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

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

  const go = (to: Nav["to"]) => {
    setOpen(false);
    navigate({ to });
  };

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="hidden h-9 w-full max-w-xs items-center justify-between gap-2 text-muted-foreground sm:flex"
        aria-label="Open global search"
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
        aria-label="Open global search"
      >
        <Search className="h-4 w-4" />
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Search modules, people, actions…" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigate">
            {NAV.map((n) => (
              <CommandItem
                key={n.to}
                value={`${n.label} ${n.hint ?? ""}`}
                onSelect={() => go(n.to)}
              >
                <n.icon className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{n.label}</span>
                {n.hint && <span className="ml-auto text-xs text-muted-foreground">{n.hint}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Sample employee">
            <CommandItem
              value="employee sample profile demo"
              onSelect={() => {
                setOpen(false);
                navigate({ to: "/employees/$id", params: { id: "EMP-1001" } });
              }}
            >
              <UserSquare2 className="mr-2 h-4 w-4 text-muted-foreground" />
              Open sample employee profile
              <span className="ml-auto text-xs text-muted-foreground">EMP-1001</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
