import { useState } from "react";
import { Loader2, Search, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { ApiError, tenantAccessGrantApi, type TenantAccessGrantDto } from "@/lib/api-client";

// Sprint 2.2 — GET /tenant-access-grants only supports lookup by a specific
// userId (there is no "list all grants" endpoint), so this screen is a
// search-by-user tool, not a plain list — matches the real API shape rather
// than pretending a broader one exists.
export function TenantAccessGrantScreen() {
  const [userId, setUserId] = useState("");
  const [searchedUserId, setSearchedUserId] = useState<string | null>(null);
  const [grants, setGrants] = useState<TenantAccessGrantDto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [granting, setGranting] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [form, setForm] = useState({ tenantId: "", reason: "", expiresAt: "" });

  const search = async (forUserId: string) => {
    if (!forUserId.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const result = await tenantAccessGrantApi.listForUser(forUserId.trim());
      setGrants(result);
      setSearchedUserId(forUserId.trim());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load grants.");
    } finally {
      setLoading(false);
    }
  };

  const submitGrant = async () => {
    if (!searchedUserId) return;
    if (!form.tenantId.trim() || !form.reason.trim() || !form.expiresAt) {
      toast.error("Tenant ID, reason, and expiry are all required");
      return;
    }
    const expiresAt = new Date(form.expiresAt);
    if (expiresAt.getTime() <= Date.now()) {
      toast.error("Expiry must be in the future");
      return;
    }
    setGranting(true);
    try {
      await tenantAccessGrantApi.grant({
        userId: searchedUserId,
        tenantId: form.tenantId.trim(),
        reason: form.reason.trim(),
        expiresAt: expiresAt.toISOString(),
      });
      toast.success("Access grant created");
      setForm({ tenantId: "", reason: "", expiresAt: "" });
      await search(searchedUserId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create grant.");
    } finally {
      setGranting(false);
    }
  };

  const revoke = async (id: string) => {
    setRevokingId(id);
    try {
      await tenantAccessGrantApi.revoke(id);
      toast.success("Grant revoked");
      if (searchedUserId) await search(searchedUserId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to revoke grant.");
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tenant Access Grants"
        description="Narrow, time-boxed exceptions letting a user access a tenant that isn't their own."
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <Label htmlFor="grant-user-id">User ID</Label>
        <div className="mt-1.5 flex gap-2">
          <Input
            id="grant-user-id"
            value={userId}
            placeholder="UUID of the user to look up"
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && search(userId)}
          />
          <Button onClick={() => search(userId)} disabled={loading || !userId.trim()}>
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>
      </div>

      {searchedUserId && (
        <div className="rounded-lg border border-border bg-card">
          <div className="flex items-center justify-between border-b border-border p-3">
            <div className="text-sm font-medium">Grants for {searchedUserId}</div>
            <GrantDialog form={form} setForm={setForm} granting={granting} onSubmit={submitGrant} />
          </div>

          {error ? (
            <div className="p-8 text-center text-sm text-destructive">{error}</div>
          ) : grants.length === 0 ? (
            <EmptyState
              title="No access grants"
              description="This user has no cross-tenant access grants on record."
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tenant</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Expires</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-24 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {grants.map((g) => (
                    <TableRow key={g.id}>
                      <TableCell className="font-mono text-xs">{g.tenantId}</TableCell>
                      <TableCell className="text-sm">{g.reason}</TableCell>
                      <TableCell className="text-sm">
                        {new Date(g.expiresAt).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {g.active ? "Active" : g.revokedAt ? "Revoked" : "Expired"}
                      </TableCell>
                      <TableCell className="text-right">
                        {g.active && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => revoke(g.id)}
                            disabled={revokingId === g.id}
                            aria-label="Revoke grant"
                          >
                            {revokingId === g.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <ShieldOff className="h-4 w-4 text-destructive" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function GrantDialog({
  form,
  setForm,
  granting,
  onSubmit,
}: {
  form: { tenantId: string; reason: string; expiresAt: string };
  setForm: (f: { tenantId: string; reason: string; expiresAt: string }) => void;
  granting: boolean;
  onSubmit: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button size="sm" onClick={() => setOpen(true)}>
        Grant access
      </Button>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Grant tenant access</DialogTitle>
          <DialogDescription>
            Time-boxed exception letting this user access a tenant that isn't their own.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="grant-tenant-id">
              Target Tenant ID<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="grant-tenant-id"
              value={form.tenantId}
              onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
              placeholder="UUID"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grant-reason">
              Reason<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="grant-reason"
              value={form.reason}
              onChange={(e) => setForm({ ...form, reason: e.target.value })}
              placeholder="e.g. Support ticket #1234"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="grant-expires">
              Expires<span className="ml-0.5 text-destructive">*</span>
            </Label>
            <Input
              id="grant-expires"
              type="datetime-local"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={granting}>
            Cancel
          </Button>
          <Button
            onClick={async () => {
              await onSubmit();
              setOpen(false);
            }}
            disabled={granting}
          >
            {granting && <Loader2 className="h-4 w-4 animate-spin" />}
            Grant
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
