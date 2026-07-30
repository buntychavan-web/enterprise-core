import { useEffect, useMemo, useState } from "react";
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
import {
  ApiError,
  resourceApi,
  type QueryParams,
  type ResourceRecord,
} from "@/lib/api-client";

export type CrudField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "email" | "number" | "date" | "select";
  required?: boolean;
  placeholder?: string;
  /** Options for `type: "select"`. */
  options?: Array<{ value: string; label: string }>;
  /** Show in the list table. */
  listColumn?: boolean;
  /** Rendered read-only in the form (server-managed values). */
  readOnly?: boolean;
};

export type CrudScreenProps = {
  title: string;
  description?: string;
  /** Path under /api/v1 — e.g. "/organization/units". */
  resourcePath: string;
  singular: string;
  fields: CrudField[];
  /** Extra query params applied to every list request (server-side filtering). */
  listParams?: QueryParams;
  /** Values merged into every newly created record. */
  createDefaults?: Record<string, unknown>;
  /** RBAC gates — hide write affordances the user is not entitled to. */
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
};

type Row = ResourceRecord;

export function CrudScreen({
  title,
  description,
  resourcePath,
  singular,
  fields,
  listParams,
  createDefaults,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: CrudScreenProps) {
  const api = useMemo(() => resourceApi(resourcePath), [resourcePath]);
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [removingId, setRemovingId] = useState<string | number | null>(null);

  const columns = fields.filter((f) => f.listColumn !== false);
  const paramsKey = JSON.stringify(listParams ?? {});

  const load = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.list({ page: 0, size: 200, ...listParams }, signal);
      setRows(result.content);
      setUnavailable(false);
      setForbidden(false);
    } catch (err) {
      if (signal?.aborted) return;
      if (err instanceof ApiError && err.isNotFound) {
        setRows([]);
        setUnavailable(true);
      } else if (err instanceof ApiError && err.isForbidden) {
        setRows([]);
        setForbidden(true);
      } else {
        setError(err instanceof Error ? err.message : "Failed to load data.");
      }
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ctrl = new AbortController();
    load(ctrl.signal);
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourcePath, paramsKey]);


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
    setEditing({ ...row });
  };
  const closeForm = () => {
    setEditing(null);
    setCreating(false);
  };

  const submit = async () => {
    if (!editing) return;
    const payload: Record<string, unknown> = {};
    for (const f of fields) {
      const raw = editing[f.name];
      if (f.required && (raw === undefined || raw === null || raw === "")) {
        toast.error(`${f.label} is required`);
        return;
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

  const confirmDelete = async () => {
    if (!deleting?.id) return;
    setRemovingId(deleting.id);
    try {
      await api.remove(deleting.id);
      toast.success(`${singular} deleted`);
      setDeleting(null);
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
            description={`The ${title} endpoint (GET /api${resourcePath}) is not yet available on the backend. The screen is ready and will populate once the backend team ships it.`}
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
                        onClick={() => setDeleting(row)}
                        aria-label={`Delete ${singular}`}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
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
                  {f.type === "textarea" ? (
                    <Textarea
                      id={f.name}
                      value={String(editing[f.name] ?? "")}
                      placeholder={f.placeholder}
                      onChange={(e) => setEditing({ ...editing, [f.name]: e.target.value })}
                    />
                  ) : (
                    <Input
                      id={f.name}
                      type={f.type === "number" ? "number" : (f.type ?? "text")}
                      value={String(editing[f.name] ?? "")}
                      placeholder={f.placeholder}
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

      <AlertDialog open={deleting !== null} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {singular.toLowerCase()}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The record will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removingId !== null}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={removingId !== null}
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
