import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Loader2, Plus, RefreshCw, Search, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { RoleMultiSelect } from "@/components/ewos/RoleMultiSelect";
import { PermissionPicker } from "@/components/ewos/PermissionPicker";
import {
  ApiError,
  resourceApi,
  type ResourceApiOptions,
  type ResourceRecord,
} from "@/lib/api-client";

export type CrudField = {
  name: string;
  label: string;
  /** "role-multiselect"/"permission-multiselect" (Sprint 2.3, §6.4/§7.4 of the
   *  Sprint 2 SDD) are additive: they read from `row[name]` (an array of
   *  {id,...} objects, e.g. RoleSummary[]/PermissionResponse[]) and write to
   *  "roleIds"/"permissionIds" respectively, regardless of `name` — matching
   *  the backend's read-vs-write field-name split (UserResponse.roles vs.
   *  UpdateUserRequest.roleIds). */
  type?: "text" | "textarea" | "email" | "number" | "role-multiselect" | "permission-multiselect";
  required?: boolean;
  placeholder?: string;
  /** Show in the list table. */
  listColumn?: boolean;
  /** Only sent (and only editable) on create — e.g. a password field the
   *  backend's update DTO doesn't accept. Rendered disabled when editing. */
  createOnly?: boolean;
};

export type CrudScreenProps = {
  title: string;
  description?: string;
  /** e.g. "/employees" — mounted under /api/v1 by the client. */
  resourcePath: string;
  singular: string;
  fields: CrudField[];
  /** tenantId/companyId query+body injection and the correct update verb
   *  for this resource — see ResourceApiOptions in lib/api-client.ts. */
  apiOptions?: ResourceApiOptions;
  /** Sprint 2.3, §7.3 — impact-analysis-gated delete (e.g. Role Usage Impact
   *  Analysis): fetched when the delete confirmation opens; if `canDelete` is
   *  false the confirm button is disabled with `summary` as the explanation.
   *  A UX safeguard only — the backend's own DELETE guard is still what
   *  actually prevents an unsafe delete. */
  deleteImpact?: (row: Row) => Promise<{ canDelete: boolean; summary: string }>;
  /** Extra per-row controls rendered before Edit/Delete — e.g. Sprint 2.3's
   *  inline enable/disable toggle on Users, or Sprint 2.4's Employee Identity
   *  panel. `reload` re-fetches the list, for actions that change server
   *  state outside the edit dialog. */
  extraRowActions?: (row: Row, reload: () => void) => ReactNode;
  /** Sprint 2.3, §7.3 — hide Edit/Delete for a row (e.g. system roles) that
   *  the backend already rejects writes/deletes for; a read-only badge is
   *  shown instead. Defense in depth, not the authorization mechanism. */
  rowActionsDisabled?: (row: Row) => boolean;
  /** Label shown in place of Edit/Delete when `rowActionsDisabled` is true. */
  rowActionsDisabledLabel?: string;
};

type Row = ResourceRecord;

export function CrudScreen({
  title,
  description,
  resourcePath,
  singular,
  fields,
  apiOptions,
  deleteImpact,
  extraRowActions,
  rowActionsDisabled,
  rowActionsDisabledLabel = "Read-only",
}: CrudScreenProps) {
  // Callers must pass a stable (memoized) `apiOptions` object — a fresh
  // literal on every render would thrash this memo and re-fetch on every
  // render. useTenant()'s `apiOptions` is memoized for this reason.
  const api = useMemo(() => resourceApi(resourcePath, apiOptions), [resourcePath, apiOptions]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [removingId, setRemovingId] = useState<string | number | null>(null);
  const [impact, setImpact] = useState<{
    loading: boolean;
    canDelete: boolean;
    summary: string;
  } | null>(null);

  const columns = fields.filter((f) => f.listColumn !== false);

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.list(signal);
      setRows(result.items);
      setUnavailable(result.unavailable);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  const filtered = query
    ? rows.filter((row) =>
        Object.values(row).some((v) =>
          String(v ?? "")
            .toLowerCase()
            .includes(query.toLowerCase()),
        ),
      )
    : rows;

  const openCreate = () => {
    setCreating(true);
    setEditing({});
  };
  const openEdit = (row: Row) => {
    setCreating(false);
    const next: Row = { ...row };
    for (const f of fields) {
      if (
        (f.type === "role-multiselect" || f.type === "permission-multiselect") &&
        Array.isArray(row[f.name])
      ) {
        next[f.name] = (row[f.name] as { id?: string | number }[]).map((r) => r.id);
      }
    }
    setEditing(next);
  };
  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const submit = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.createOnly && !creating) continue;
      const raw = editing[f.name];
      if (f.required && (raw === undefined || raw === null || raw === "")) {
        toast.error(`${f.label} is required`);
        return;
      }
      if (f.type === "role-multiselect") {
        payload.roleIds = Array.isArray(raw) ? raw : [];
        continue;
      }
      if (f.type === "permission-multiselect") {
        payload.permissionIds = Array.isArray(raw) ? raw : [];
        continue;
      }
      if (raw !== undefined) {
        payload[f.name] = f.type === "number" && raw !== "" ? Number(raw) : raw;
      }
    }
    setSaving(true);
    try {
      if (creating) {
        await api.create(payload);
        toast.success(`${singular} created`);
      } else if (editing.id !== undefined) {
        await api.update(editing.id, payload);
        toast.success(`${singular} updated`);
      }
      closeForm();
      await load();
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 404
            ? "This endpoint is not yet available on the backend."
            : err.message
          : "Save failed.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const openDelete = (row: Row) => {
    setDeleting(row);
    if (deleteImpact) {
      setImpact({ loading: true, canDelete: false, summary: "" });
      deleteImpact(row).then(
        (result) => setImpact({ loading: false, ...result }),
        () => setImpact({ loading: false, canDelete: true, summary: "" }),
      );
    }
  };

  const confirmDelete = async () => {
    if (!deleting?.id) return;
    setRemovingId(deleting.id);
    try {
      await api.remove(deleting.id);
      toast.success(`${singular} deleted`);
      setDeleting(null);
      setImpact(null);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Delete failed.");
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => load()} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate} disabled={unavailable}>
              <Plus className="h-4 w-4" />
              New {singular}
            </Button>
          </div>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <div className="flex items-center gap-2 border-b border-border p-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${title.toLowerCase()}…`}
              className="pl-8"
              disabled={unavailable || loading}
            />
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            {loading ? "…" : `${filtered.length} of ${rows.length}`}
          </div>
        </div>

        {loading ? (
          <div className="grid place-items-center p-16 text-sm text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : unavailable ? (
          <EmptyState
            title="Coming soon"
            description={`The ${title} endpoint (GET /api/v1${resourcePath}) is not yet available on the backend. The screen is ready and will populate once the backend team ships it.`}
          />
        ) : error ? (
          <div className="p-8 text-center">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => load()}>
              Try again
            </Button>
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={rows.length === 0 ? `No ${title.toLowerCase()} yet` : "No matches"}
            description={
              rows.length === 0
                ? `Create your first ${singular.toLowerCase()} to get started.`
                : "Try a different search term."
            }
            action={
              rows.length === 0 ? (
                <Button onClick={openCreate} size="sm">
                  <Plus className="h-4 w-4" />
                  New {singular}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((c) => (
                    <TableHead key={c.name}>{c.label}</TableHead>
                  ))}
                  <TableHead className="w-24 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row, i) => (
                  <TableRow key={String(row.id ?? i)}>
                    {columns.map((c) => (
                      <TableCell key={c.name} className="text-sm">
                        {String(row[c.name] ?? "—")}
                      </TableCell>
                    ))}
                    <TableCell className="text-right">
                      {extraRowActions?.(row, () => load())}
                      {rowActionsDisabled?.(row) ? (
                        <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                          {rowActionsDisabledLabel}
                        </span>
                      ) : (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(row)}
                            aria-label={`Edit ${singular}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openDelete(row)}
                            aria-label={`Delete ${singular}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <Dialog open={editing !== null} onOpenChange={(o) => !o && closeForm()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{creating ? `New ${singular}` : `Edit ${singular}`}</DialogTitle>
            <DialogDescription>
              {creating
                ? `Create a new ${singular.toLowerCase()} record.`
                : `Update this ${singular.toLowerCase()}.`}
            </DialogDescription>
          </DialogHeader>
          {editing && (
            <div className="space-y-4">
              {fields.map((f) => (
                <div key={f.name} className="space-y-1.5">
                  <Label htmlFor={f.name}>
                    {f.label}
                    {f.required && <span className="ml-0.5 text-destructive">*</span>}
                  </Label>
                  {f.type === "role-multiselect" ? (
                    <RoleMultiSelect
                      value={(editing[f.name] as string[] | undefined) ?? []}
                      onChange={(ids) => setEditing({ ...editing, [f.name]: ids })}
                    />
                  ) : f.type === "permission-multiselect" ? (
                    <PermissionPicker
                      value={(editing[f.name] as string[] | undefined) ?? []}
                      onChange={(ids) => setEditing({ ...editing, [f.name]: ids })}
                    />
                  ) : f.type === "textarea" ? (
                    <Textarea
                      id={f.name}
                      value={String(editing[f.name] ?? "")}
                      placeholder={f.placeholder}
                      disabled={f.createOnly && !creating}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                    />
                  ) : (
                    <Input
                      id={f.name}
                      type={f.type === "number" ? "number" : (f.type ?? "text")}
                      value={String(editing[f.name] ?? "")}
                      placeholder={f.placeholder}
                      disabled={f.createOnly && !creating}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={closeForm} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {creating ? "Create" : "Save changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleting !== null}
        onOpenChange={(o) => {
          if (!o) {
            setDeleting(null);
            setImpact(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {impact && (
            <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
              {impact.loading ? (
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Checking usage impact…
                </span>
              ) : (
                <span className={impact.canDelete ? "text-muted-foreground" : "text-destructive"}>
                  {impact.summary}
                </span>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={
                removingId !== null || (impact !== null && (impact.loading || !impact.canDelete))
              }
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removingId !== null && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
