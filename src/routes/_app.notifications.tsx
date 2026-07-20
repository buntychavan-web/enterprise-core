import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bell, Check, Filter } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { NOTIFICATIONS, type AppNotification } from "@/lib/mock/self-service";

export const Route = createFileRoute("/_app/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — EWOS" },
      { name: "description", content: "All workspace notifications, alerts and reminders." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: NotificationsPage,
});

const CATEGORIES = ["All", "Payroll", "Leave", "HR", "Compliance", "System"] as const;

function NotificationsPage() {
  const [list, setList] = useState<AppNotification[]>(NOTIFICATIONS);
  const [tab, setTab] = useState<(typeof CATEGORIES)[number]>("All");

  const filtered = useMemo(
    () => (tab === "All" ? list : list.filter((n) => n.category === tab)),
    [list, tab],
  );
  const unread = list.filter((n) => !n.read).length;

  const markAll = () => setList((xs) => xs.map((n) => ({ ...n, read: true })));
  const toggle = (id: string) =>
    setList((xs) => xs.map((n) => (n.id === id ? { ...n, read: !n.read } : n)));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={`${unread} unread of ${list.length} total.`}
        actions={
          <Button variant="outline" size="sm" onClick={markAll} disabled={unread === 0}>
            <Check className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4">
          <Card>
            <CardContent className="p-0">
              {filtered.length === 0 ? (
                <div className="p-6">
                  <EmptyState
                    icon={Filter}
                    title="Nothing here"
                    description="No notifications match this filter."
                  />
                </div>
              ) : (
                <ul className="divide-y divide-border">
                  {filtered.map((n) => (
                    <li
                      key={n.id}
                      className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${
                        !n.read ? "bg-primary/5" : ""
                      }`}
                    >
                      <span
                        className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                          n.read ? "bg-muted-foreground/30" : "bg-primary"
                        }`}
                        aria-hidden
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{n.title}</span>
                          <StatusChip tone={n.tone}>{n.category}</StatusChip>
                        </div>
                        <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                        <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                          {n.createdAt}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => toggle(n.id)}
                      >
                        {n.read ? "Mark unread" : "Mark read"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {filtered.length === 0 && (
            <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
              <Bell className="h-3.5 w-3.5" /> Sample notifications — replace when backend endpoint
              is available.
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
