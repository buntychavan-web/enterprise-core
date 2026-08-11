import { useEffect, useState } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ApiError,
  essProfileApi,
  employeeSelfApi,
  fieldErrorsFrom,
  type EssProfileUpdateRequest,
  type ResourceRecord,
} from "@/lib/api-client";

// Sprint 1 (ESS Core Polish) — the real "edit profile" experience, backed by
// the Sprint 27C PATCH /self-service/me endpoint. Previously Profile had a
// visible "Edit" button on the account-identity card that had no onClick and
// nothing to call, since api-client.ts had no update function at all.
//
// Only 5 fields are backend-editable here (see EssProfileUpdateRequest) —
// everything else on the employee record (name, employee number, work
// email, status, hire date, manager, etc.) is HR-admin-only and intentionally
// not shown as editable, per the backend's own EssProfileUpdateRequest
// contract. This card is deliberately separate from <MyEmployeeCard/>, which
// stays read-only employment data.

type EditableField = keyof EssProfileUpdateRequest;

const FIELDS: { key: EditableField; label: string; type: string; placeholder?: string }[] = [
  { key: "personalEmail", label: "Personal email", type: "email", placeholder: "you@example.com" },
  { key: "phone", label: "Phone", type: "tel", placeholder: "+91 98765 43210" },
  { key: "emergencyContactName", label: "Emergency contact name", type: "text" },
  { key: "emergencyContactPhone", label: "Emergency contact phone", type: "tel" },
  { key: "avatarStorageUri", label: "Avatar image URL", type: "url", placeholder: "https://…" },
];

// Mirrors the backend's phone @Pattern exactly, so an obviously-invalid
// number is caught before a round trip rather than only after a 400.
const PHONE_PATTERN = /^\+?[0-9()\-\s]{7,32}$/;

function toFormState(record: ResourceRecord): EssProfileUpdateRequest {
  return {
    personalEmail: str(record.personalEmail),
    phone: str(record.phone),
    emergencyContactName: str(record.emergencyContactName),
    emergencyContactPhone: str(record.emergencyContactPhone),
    avatarStorageUri: str(record.avatarStorageUri),
  };
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function isConflict(v: unknown): v is { conflictCompanyIds: string[] } {
  return !!v && typeof v === "object" && "conflictCompanyIds" in v;
}

export function ProfilePersonalDetailsCard() {
  const [state, setState] = useState<
    | { kind: "loading" }
    | { kind: "none" }
    | { kind: "conflict"; companyIds: string[] }
    | { kind: "error"; message: string }
    | { kind: "found"; record: ResourceRecord }
  >({ kind: "loading" });

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<EssProfileUpdateRequest>({});
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const load = (companyId?: string) => {
    setState({ kind: "loading" });
    employeeSelfApi
      .me(companyId)
      .then((result) => {
        if (result === null) setState({ kind: "none" });
        else if (isConflict(result))
          setState({ kind: "conflict", companyIds: result.conflictCompanyIds });
        else setState({ kind: "found", record: result });
      })
      .catch((err) => {
        setState({
          kind: "error",
          message: err instanceof ApiError ? err.message : "Failed to load your profile.",
        });
      });
  };

  useEffect(() => {
    load();
  }, []);

  const startEdit = () => {
    if (state.kind !== "found") return;
    setForm(toFormState(state.record));
    setFormError(null);
    setFieldErrors({});
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setFormError(null);
    setFieldErrors({});
  };

  const validate = (): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (form.phone && !PHONE_PATTERN.test(form.phone)) {
      errors.phone = "Enter a valid phone number.";
    }
    if (form.emergencyContactPhone && !PHONE_PATTERN.test(form.emergencyContactPhone)) {
      errors.emergencyContactPhone = "Enter a valid phone number.";
    }
    return errors;
  };

  const save = async () => {
    const clientErrors = validate();
    if (Object.keys(clientErrors).length > 0) {
      setFieldErrors(clientErrors);
      return;
    }
    setSaving(true);
    setFormError(null);
    setFieldErrors({});
    try {
      // Send only fields with a real value — an empty string would overwrite
      // (the backend treats non-null as "set", not "clear"), so a field the
      // user never touched (still "") is omitted rather than sent as "".
      const patch: EssProfileUpdateRequest = {};
      for (const f of FIELDS) {
        const v = form[f.key];
        if (v) patch[f.key] = v;
      }
      const updated = await essProfileApi.updateMe(patch);
      setState({ kind: "found", record: updated });
      setEditing(false);
      toast.success("Profile updated");
    } catch (err) {
      const fe = fieldErrorsFrom(err);
      if (Object.keys(fe).length > 0) {
        setFieldErrors(fe);
      } else {
        setFormError(err instanceof ApiError ? err.message : "Failed to save your profile.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (state.kind === "loading") {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-5 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Loading personal details…
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "none") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          No employee record is linked to your login, so there's nothing to edit yet. Contact an
          administrator if this seems wrong.
        </CardContent>
      </Card>
    );
  }

  if (state.kind === "conflict") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Personal details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Your login is linked to employee records in more than one company. Pick one to edit:
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

  if (state.kind === "error") {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Personal details</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive" role="alert">
            {state.message}
          </p>
          <Button variant="outline" size="sm" className="mt-3" onClick={() => load()}>
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const r = state.record;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-semibold">Personal details</CardTitle>
        {!editing && (
          <Button size="sm" variant="outline" onClick={startEdit}>
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {!editing ? (
          <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {f.label}
                </div>
                <div className="mt-1 truncate text-sm text-foreground">{str(r[f.key]) || "—"}</div>
              </div>
            ))}
          </div>
        ) : (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            {formError && (
              <p className="text-sm text-destructive" role="alert">
                {formError}
              </p>
            )}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {FIELDS.map((f) => (
                <div key={f.key}>
                  <Label htmlFor={`profile-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`profile-${f.key}`}
                    type={f.type}
                    placeholder={f.placeholder}
                    value={form[f.key] ?? ""}
                    disabled={saving}
                    aria-invalid={!!fieldErrors[f.key]}
                    aria-describedby={fieldErrors[f.key] ? `profile-${f.key}-error` : undefined}
                    onChange={(e) => setForm((prev) => ({ ...prev, [f.key]: e.target.value }))}
                    className="mt-1"
                  />
                  {fieldErrors[f.key] && (
                    <p id={`profile-${f.key}-error`} className="mt-1 text-xs text-destructive">
                      {fieldErrors[f.key]}
                    </p>
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" size="sm" disabled={saving}>
                {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />}
                Save
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={saving}
                onClick={cancelEdit}
              >
                Cancel
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
