import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { employeeSelfApi, type ResourceRecord } from "@/lib/api-client";

function isConflict(v: unknown): v is { conflictCompanyIds: string[] } {
  return !!v && typeof v === "object" && "conflictCompanyIds" in v;
}

// Sprint 2.4, §8.4 — read-only self-service employment summary via
// GET /employees/me, with the multi-company disambiguation retry the
// backend's 409 documents (see employeeSelfApi.me in api-client.ts).
export function MyEmployeeCard() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "none" }
    | { kind: "conflict"; companyIds: string[] }
    | { kind: "found"; employee: ResourceRecord }
  >({ kind: "loading" });

  const load = (companyId?: string) => {
    setState({ kind: "loading" });
    employeeSelfApi.me(companyId).then((result) => {
      if (result === null) setState({ kind: "none" });
      else if (isConflict(result))
        setState({ kind: "conflict", companyIds: result.conflictCompanyIds });
      else setState({ kind: "found", employee: result });
    });
  };

  useEffect(() => {
    load();
  }, []);

  if (state.kind === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading employment details…
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "none") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Employment details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No employee record is linked to your login. Contact an administrator if this seems wrong.
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "conflict") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-semibold">Employment details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Your login is linked to employee records in more than one company. Pick one:
          </p>
          <div className="flex flex-wrap gap-2">
            {state.companyIds.map((id) => (
              <Button key={id} variant="outline" size="sm" onClick={() => load(id)}>
                {id}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const e = state.employee;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Employment details</CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
        <Field label="Employee number" value={String(e.employeeNumber ?? "—")} />
        <Field label="Work email" value={String(e.workEmail ?? "—")} />
        <Field label="Status" value={String(e.status ?? "—")} />
        <Field label="Hire date" value={String(e.hireDate ?? "—")} />
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
