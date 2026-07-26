import { useEffect, useMemo, useState } from "react";
import { Loader2, Search } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { permissionsApi, type PermissionDto } from "@/lib/api-client";

// Sprint 2.3 — additive CrudScreen field-type extension (§7.4 of the Sprint 2
// SDD): the 118 permission codes group naturally by their MODULE_ prefix
// (EMP_*, ATT_*, WF_*, ...) — grouping is string-prefix parsing on data
// already returned, no backend change needed. Permission grantability is
// server-enforced only; a 403 on save is surfaced as-is, not pre-filtered.
export function PermissionPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [permissions, setPermissions] = useState<PermissionDto[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    let cancelled = false;
    permissionsApi.list().then((list) => {
      if (!cancelled) setPermissions(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const groups = useMemo(() => {
    if (!permissions) return [];
    const filtered = query
      ? permissions.filter(
          (p) =>
            p.code.toLowerCase().includes(query.toLowerCase()) ||
            (p.description ?? "").toLowerCase().includes(query.toLowerCase()),
        )
      : permissions;
    const byPrefix = new Map<string, PermissionDto[]>();
    for (const p of filtered) {
      const prefix = p.code.split("_")[0];
      if (!byPrefix.has(prefix)) byPrefix.set(prefix, []);
      byPrefix.get(prefix)!.push(p);
    }
    return [...byPrefix.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [permissions, query]);

  if (permissions === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading permissions…
      </div>
    );
  }

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search permissions…"
          className="pl-8"
        />
      </div>
      <div className="max-h-64 space-y-3 overflow-y-auto rounded-md border border-border p-2">
        {groups.map(([prefix, perms]) => (
          <div key={prefix}>
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {prefix}
            </div>
            {perms.map((p) => (
              <label
                key={p.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
              >
                <Checkbox checked={value.includes(p.id)} onCheckedChange={() => toggle(p.id)} />
                <span className="font-mono text-xs">{p.code}</span>
                {p.description && (
                  <span className="truncate text-xs text-muted-foreground">{p.description}</span>
                )}
              </label>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
