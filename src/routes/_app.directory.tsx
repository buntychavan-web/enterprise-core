import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Building2, Mail, MapPin, Phone, Search } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DIRECTORY, type DirectoryPerson } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_app/directory")({
  head: () => ({
    meta: [
      { title: "Company Directory — EWOS" },
      { name: "description", content: "Search employees across the company." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DirectoryPage,
});

function DirectoryPage() {
  const [q, setQ] = useState("");
  const [dept, setDept] = useState<string>("all");
  const [loc, setLoc] = useState<string>("all");

  const departments = useMemo(
    () => Array.from(new Set(DIRECTORY.map((p) => p.department))).sort(),
    [],
  );
  const locations = useMemo(() => Array.from(new Set(DIRECTORY.map((p) => p.location))).sort(), []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return DIRECTORY.filter((p) => {
      if (dept !== "all" && p.department !== dept) return false;
      if (loc !== "all" && p.location !== loc) return false;
      if (!needle) return true;
      return (
        p.name.toLowerCase().includes(needle) ||
        p.designation.toLowerCase().includes(needle) ||
        p.email.toLowerCase().includes(needle) ||
        p.department.toLowerCase().includes(needle)
      );
    });
  }, [q, dept, loc]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="Company Directory"
        description={`${DIRECTORY.length} people across ${departments.length} departments and ${locations.length} locations.`}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, role, email…"
            className="pl-8"
          />
        </div>
        <Select value={dept} onValueChange={setDept}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d} value={d}>
                {d}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={loc} onValueChange={setLoc}>
          <SelectTrigger className="w-full sm:w-44">
            <SelectValue placeholder="Location" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All locations</SelectItem>
            {locations.map((l) => (
              <SelectItem key={l} value={l}>
                {l}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="text-xs text-muted-foreground sm:ml-auto">
          {filtered.length} of {DIRECTORY.length}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={Search}
              title="No matches"
              description="Try a different name, role or department."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => (
            <PersonCard key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}

function PersonCard({ p }: { p: DirectoryPerson }) {
  return (
    <Card className="transition-colors hover:border-primary/40">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <Avatar className="h-11 w-11 shrink-0">
            <AvatarFallback className="bg-primary/10 text-primary">{p.initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <Link
              to="/employees/$id"
              params={{ id: p.id }}
              className="truncate text-sm font-semibold text-foreground hover:text-primary"
            >
              {p.name}
            </Link>
            <div className="truncate text-xs text-muted-foreground">{p.designation}</div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Building2 className="h-3 w-3" /> {p.department}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {p.location}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <a
                href={`mailto:${p.email}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Mail className="h-3 w-3" /> Email
              </a>
              <a
                href={`tel:${p.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <Phone className="h-3 w-3" /> Call
              </a>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
