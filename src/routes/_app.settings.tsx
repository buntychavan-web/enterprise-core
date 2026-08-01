import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Monitor, Moon, Sun, LogOut, Lock, Bell, ChevronRight } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useTheme, type Theme } from "@/lib/theme";
import { useAuth } from "@/lib/auth-context";
import { usersApi, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [{ title: "Settings — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm the new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordForm = z.infer<typeof passwordSchema>;

const PREF_KEY = "ewos.notificationPreferences";

function loadPrefs(): UserPrefs {
  if (typeof window === "undefined") return defaultPrefs;
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? { ...defaultPrefs, ...JSON.parse(raw) } : defaultPrefs;
  } catch {
    return defaultPrefs;
  }
}

function savePrefs(prefs: UserPrefs) {
  if (typeof window === "undefined") return;
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

type UserPrefs = {
  emailDigest: boolean;
  approvalReminders: boolean;
  productUpdates: boolean;
};

const defaultPrefs: UserPrefs = {
  emailDigest: true,
  approvalReminders: true,
  productUpdates: false,
};

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { logout } = useAuth();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [prefs, setPrefs] = useState<UserPrefs>(loadPrefs);

  const form = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const options: { value: Theme; label: string; icon: typeof Sun; hint: string }[] = [
    { value: "light", label: "Light", icon: Sun, hint: "Bright surfaces" },
    { value: "dark", label: "Dark", icon: Moon, hint: "Reduced glare" },
    { value: "system", label: "System", icon: Monitor, hint: "Match OS" },
  ];

  function onSubmit(values: PasswordForm) {
    return usersApi
      .changeMyPassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      })
      .then(() => {
        toast.success("Password changed", {
          description: "Your password has been updated successfully.",
        });
        form.reset();
        setPasswordOpen(false);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "Could not change password");
      });
  }

  function updatePrefs(next: Partial<UserPrefs>) {
    const merged = { ...prefs, ...next };
    setPrefs(merged);
    savePrefs(merged);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Application"
        title="Settings"
        description="Personalize appearance, notification preferences and account security."
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Appearance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {options.map((o) => {
              const active = theme === o.value;
              return (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => setTheme(o.value)}
                  className={cn(
                    "flex items-start gap-3 rounded-md border p-3 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40 hover:bg-muted/50",
                  )}
                  aria-pressed={active}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-md",
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    <o.icon className="h-4 w-4" />
                  </span>
                  <span>
                    <span className="block text-sm font-medium">{o.label}</span>
                    <span className="block text-xs text-muted-foreground">{o.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Bell className="h-4 w-4" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefRow
            title="Email digest"
            description="Daily summary of activity across your organization."
            checked={prefs.emailDigest}
            onChange={(v) => updatePrefs({ emailDigest: v })}
          />
          <PrefRow
            title="Approval reminders"
            description="Get notified when approvals are pending for more than 24 hours."
            checked={prefs.approvalReminders}
            onChange={(v) => updatePrefs({ approvalReminders: v })}
          />
          <PrefRow
            title="Product updates"
            description="News about new EWOS features and improvements."
            checked={prefs.productUpdates}
            onChange={(v) => updatePrefs({ productUpdates: v })}
          />
          <p className="text-xs text-muted-foreground">
            Preferences are saved locally. Server-side sync is pending backend endpoint
            availability.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Lock className="h-4 w-4" />
            Account security
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <button
            type="button"
            onClick={() => setPasswordOpen(true)}
            className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left transition-colors hover:border-primary/40 hover:bg-muted/50"
          >
            <span>
              <span className="block text-sm font-medium">Change password</span>
              <span className="block text-xs text-muted-foreground">
                Update your EWOS account password.
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <button
            type="button"
            disabled
            className="flex w-full items-center justify-between rounded-md border border-border p-3 text-left opacity-60"
          >
            <span>
              <span className="block text-sm font-medium">Manage sessions</span>
              <span className="block text-xs text-muted-foreground">
                Review active sign-in sessions. (Backend dependency)
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>

          <Button variant="outline" size="sm" onClick={() => logout()} className="mt-1">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </CardContent>
      </Card>

      <Dialog open={passwordOpen} onOpenChange={setPasswordOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password and a new password below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="current-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm new password</FormLabel>
                    <FormControl>
                      <Input type="password" autoComplete="new-password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setPasswordOpen(false);
                    form.reset();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? "Saving…" : "Change password"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PrefRow({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
