import { useState } from "react";
import { Loader2, UserCog } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError, employeeIdentityApi, type ResourceRecord } from "@/lib/api-client";

type Mode = "view" | "link" | "unlink" | "provision";

// Sprint 2.4, §8.4 — link/unlink/provision an employee's platform login.
// Named actions with distinct payloads, not a generic CrudScreen form fit,
// per the Sprint 2 SDD. Reloads the parent list on success so the row's
// userId reflects the change.
export function EmployeeIdentityPanel({
  employee,
  onChanged,
}: {
  employee: ResourceRecord;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("view");
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState("");
  const [reason, setReason] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const linkedUserId = employee.userId as string | undefined;

  const reset = () => {
    setMode("view");
    setUserId("");
    setReason("");
    setUsername("");
    setEmail("");
    setPassword("");
  };

  const runAction = async (fn: () => Promise<unknown>, successMessage: string) => {
    setSaving(true);
    try {
      await fn();
      toast.success(successMessage);
      onChanged();
      reset();
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Action failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) reset();
      }}
    >
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        aria-label="Manage login identity"
      >
        <UserCog className="h-4 w-4" />
      </Button>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Login identity</DialogTitle>
          <DialogDescription>
            {linkedUserId
              ? `Linked to user ${linkedUserId}.`
              : "No platform login linked to this employee."}
          </DialogDescription>
        </DialogHeader>

        {mode === "view" && (
          <div className="flex flex-wrap gap-2">
            {linkedUserId ? (
              <Button variant="outline" onClick={() => setMode("unlink")}>
                Unlink
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => setMode("link")}>
                  Link existing user
                </Button>
                <Button variant="outline" onClick={() => setMode("provision")}>
                  Provision new user
                </Button>
              </>
            )}
          </div>
        )}

        {mode === "link" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="link-user-id">
                User ID<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="link-user-id"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                placeholder="UUID from Users"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="link-reason">Reason</Label>
              <Input
                id="link-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset} disabled={saving}>
                Back
              </Button>
              <Button
                disabled={saving || !userId.trim()}
                onClick={() =>
                  runAction(
                    () =>
                      employeeIdentityApi.link(String(employee.id), {
                        userId: userId.trim(),
                        reason: reason.trim() || undefined,
                      }),
                    "User linked",
                  )
                }
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Link
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "unlink" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="unlink-reason">Reason</Label>
              <Input
                id="unlink-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset} disabled={saving}>
                Back
              </Button>
              <Button
                variant="destructive"
                disabled={saving}
                onClick={() =>
                  runAction(
                    () =>
                      employeeIdentityApi.unlink(String(employee.id), {
                        reason: reason.trim() || undefined,
                      }),
                    "User unlinked",
                  )
                }
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Unlink
              </Button>
            </DialogFooter>
          </div>
        )}

        {mode === "provision" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="prov-username">
                Username<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="prov-username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prov-email">
                Email<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="prov-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prov-password">
                Password<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="prov-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="prov-reason">Reason</Label>
              <Input
                id="prov-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Optional"
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={reset} disabled={saving}>
                Back
              </Button>
              <Button
                disabled={saving || !username.trim() || !email.trim() || !password}
                onClick={() =>
                  runAction(
                    () =>
                      employeeIdentityApi.provisionUser(String(employee.id), {
                        username: username.trim(),
                        email: email.trim(),
                        password,
                        reason: reason.trim() || undefined,
                      }),
                    "User provisioned and linked",
                  )
                }
              >
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Provision
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
