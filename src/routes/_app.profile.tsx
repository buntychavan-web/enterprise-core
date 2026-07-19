import { createFileRoute } from "@tanstack/react-router";
import { Mail, ShieldCheck, User } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { displayName, initials } from "@/lib/api-client";

export const Route = createFileRoute("/_app/profile")({
  head: () => ({
    meta: [{ title: "My profile — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { user } = useAuth();
  const name = displayName(user) || "You";
  const roles = Array.isArray(user?.roles)
    ? user!.roles.map((r) => (typeof r === "string" ? r : r.name))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="My profile" description="Your EWOS account details." />

      <Card>
        <CardContent className="flex flex-col items-start gap-4 p-5 sm:flex-row sm:items-center">
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-primary/10 text-lg font-semibold text-primary">
            {initials(user)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-lg font-semibold">{name}</div>
            {user?.email && (
              <div className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Mail className="h-3.5 w-3.5" />
                {user.email}
              </div>
            )}
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusChip tone="success">Active</StatusChip>
              {roles.map((r) => (
                <StatusChip key={r} tone="info" icon={<ShieldCheck className="h-3 w-3" />}>
                  {r}
                </StatusChip>
              ))}
            </div>
          </div>
          <Button size="sm" variant="outline">
            Edit
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Account details</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <Field label="Username" value={user?.username ?? "—"} />
          <Field label="Full name" value={name} />
          <Field label="Email" value={user?.email ?? "—"} />
          <Field label="User ID" value={String(user?.id ?? "—")} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <User className="h-4 w-4" />
            Preferences
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Personalize your experience from the{" "}
            <a href="/settings" className="text-primary hover:underline">
              Settings
            </a>{" "}
            page.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{value}</div>
    </div>
  );
}
