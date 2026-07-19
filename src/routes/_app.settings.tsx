import { createFileRoute } from "@tanstack/react-router";
import { Monitor, Moon, Sun } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useTheme, type Theme } from "@/lib/theme";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [{ title: "Settings — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const options: { value: Theme; label: string; icon: typeof Sun; hint: string }[] = [
    { value: "light", label: "Light", icon: Sun, hint: "Bright surfaces" },
    { value: "dark", label: "Dark", icon: Moon, hint: "Reduced glare" },
    { value: "system", label: "System", icon: Monitor, hint: "Match OS" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Application"
        title="Settings"
        description="Personalize appearance and notification preferences."
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
          <CardTitle className="text-sm font-semibold">Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <PrefRow
            title="Email digest"
            description="Daily summary of activity across your organization."
            defaultChecked
          />
          <PrefRow
            title="Approval reminders"
            description="Get notified when approvals are pending for more than 24 hours."
            defaultChecked
          />
          <PrefRow
            title="Product updates"
            description="News about new EWOS features and improvements."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Session</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <Button variant="outline" size="sm">
            Change password
          </Button>
          <Button variant="outline" size="sm">
            Manage sessions
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PrefRow({
  title,
  description,
  defaultChecked,
}: {
  title: string;
  description: string;
  defaultChecked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
      <div className="min-w-0">
        <Label className="text-sm font-medium">{title}</Label>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch defaultChecked={defaultChecked} />
    </div>
  );
}
