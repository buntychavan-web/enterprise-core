import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2, Network } from "lucide-react";
import { CrudScreen, type CrudField } from "@/components/ewos/CrudScreen";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  organizationApi,
  type OrganizationUnitTypeResponse,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/organization")({
  head: () => ({
    meta: [
      { title: "Organization — EWOS" },
      { name: "description", content: "Companies, business units, departments and locations." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OrganizationPage,
});

/**
 * The backend models the entire org structure as ONE resource —
 * `/organization/units` — discriminated by `unitTypeId` / `unitTypeCode`
 * (see OrganizationUnitController). Unit types themselves are configurable
 * data from `/organization/unit-types`, so the tab strip is driven by the
 * server rather than a hardcoded list.
 */
function OrganizationPage() {
  const { hasRole, hasPermission } = useAuth();
  const [types, setTypes] = useState<OrganizationUnitTypeResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);

  const isAdmin = hasRole("ADMIN") || hasRole("ROLE_ADMIN");
  const canWrite = isAdmin || hasPermission("ORGANIZATION_WRITE");

  const loadTypes = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const page = await organizationApi.unitTypes.list(
        { page: 0, size: 100, sort: "sortOrder,asc" },
        signal,
      );
      if (signal?.aborted) return;
      const list = page.content as OrganizationUnitTypeResponse[];
      setTypes(list);
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
    } catch (err) {
      if (signal?.aborted) return;
      setError(
        err instanceof ApiError
          ? err.message
          : "Unable to load organization unit types from the server.",
      );
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    void loadTypes(ctrl.signal);
    return () => ctrl.abort();
  }, []);

  const active = types.find((t) => t.id === activeId) ?? null;

  const fields = useMemo<CrudField[]>(
    () => [
      { name: "code", label: "Code", required: true, placeholder: "e.g. ENG-01" },
      { name: "name", label: "Name", required: true },
      {
        name: "parentId",
        label: "Parent unit",
        type: "select",
        listColumn: false,
        options: [],
      },
      { name: "costCenterCode", label: "Cost centre", listColumn: false },
      { name: "countryCode", label: "Country", listColumn: false, placeholder: "ISO-2, e.g. IN" },
      { name: "effectiveFrom", label: "Effective from", type: "date", listColumn: false },
      { name: "description", label: "Description", type: "textarea", listColumn: false },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Organization Setup"
        title="Organization"
        description="Structural building blocks — companies, business units, departments, grades and locations."
      />

      {loading ? (
        <div
          className="grid place-items-center rounded-lg border border-border bg-card p-16"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
          <span className="sr-only">Loading unit types…</span>
        </div>
      ) : error ? (
        <div
          className="rounded-lg border border-border bg-card p-8 text-center"
          role="alert"
        >
          <AlertTriangle className="mx-auto h-6 w-6 text-destructive" aria-hidden />
          <p className="mt-3 text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => void loadTypes()}>
            Try again
          </Button>
        </div>
      ) : types.length === 0 ? (
        <div className="rounded-lg border border-border bg-card">
          <EmptyState
            icon={Network}
            title="No unit types configured"
            description="Organization unit types (Company, Business Unit, Department, Location…) must be configured before units can be created."
          />
        </div>
      ) : (
        <>
          <nav aria-label="Organization unit types" className="-mx-1 flex gap-1 overflow-x-auto pb-1">
            {types.map((t) => {
              const isActive = t.id === activeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "flex min-h-11 shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:text-foreground",
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  {t.name ?? t.code}
                </button>
              );
            })}
          </nav>

          {active && (
            <CrudScreen
              key={active.id}
              title={active.name ?? active.code}
              description={
                active.description ??
                `Organization units of type ${active.code}. Managed under /organization/units.`
              }
              resourcePath="/organization/units"
              singular={singularize(active.name ?? active.code)}
              fields={fields}
              listParams={{ unitTypeId: active.id }}
              createDefaults={{ unitTypeId: active.id }}
              canCreate={canWrite}
              canEdit={canWrite}
              canDelete={isAdmin}
            />
          )}
        </>
      )}
    </div>
  );
}

function singularize(label: string): string {
  if (/ies$/i.test(label)) return label.replace(/ies$/i, "y");
  if (/s$/i.test(label) && !/ss$/i.test(label)) return label.slice(0, -1);
  return label;
}
