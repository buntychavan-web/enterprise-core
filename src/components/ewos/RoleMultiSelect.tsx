import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { rolesApi, type RoleDto } from "@/lib/api-client";

// Sprint 2.3 — additive CrudScreen field-type extension (§6.4 of the Sprint 2
// SDD): a thin checkbox list backed by GET /roles, populated once per dialog
// open. Role assignability is server-enforced only (privilege-escalation
// guard, Sprint 1.4) — this shows the full catalog and lets the backend's
// 403 surface as-is rather than pre-filtering.
export function RoleMultiSelect({
  value,
  onChange,
}: {
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  const [roles, setRoles] = useState<RoleDto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    rolesApi.list().then((list) => {
      if (!cancelled) setRoles(list);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (roles === null) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
      </div>
    );
  }

  const toggle = (id: string) => {
    onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);
  };

  return (
    <div className="max-h-56 space-y-1.5 overflow-y-auto rounded-md border border-border p-2">
      {roles.map((r) => (
        <label
          key={r.id}
          className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
        >
          <Checkbox checked={value.includes(r.id)} onCheckedChange={() => toggle(r.id)} />
          <span>{r.name}</span>
          {r.systemRole && (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
              System
            </span>
          )}
        </label>
      ))}
    </div>
  );
}
