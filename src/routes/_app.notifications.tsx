import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError, notificationsApi, type NotificationDto } from "@/lib/api-client";

// Sprint 4: wired to the real com.ewos.notification inbox. Through Sprint 13 this screen ran on
// mock data because the backend module was an empty package stub with no endpoints or table (see
// the Sprint 13 completion report) — Sprint 4 built the notifications table, service, and REST API
// this screen now consumes.

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

const TYPE_TONE: Record<NotificationDto["type"], StatusTone> = {
  TASK_ASSIGNED: "info",
  TASK_ESCALATED: "warning",
  INSTANCE_COMPLETED: "success",
  INSTANCE_CANCELLED: "neutral",
  INSTANCE_ERRORED: "danger",
  GENERIC: "neutral",
};

const TYPE_LABEL: Record<NotificationDto["type"], string> = {
  TASK_ASSIGNED: "Task assigned",
  TASK_ESCALATED: "Escalated",
  INSTANCE_COMPLETED: "Completed",
  INSTANCE_CANCELLED: "Cancelled",
  INSTANCE_ERRORED: "Error",
  GENERIC: "Notice",
};

function NotificationsPage() {
  const [items, setItems] = useState<NotificationDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await notificationsApi.mine(0, 50);
      setItems(page.content);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = (items ?? []).filter((n) => !n.readAt);

  const markOne = async (id: string) => {
    await notificationsApi.markRead(id);
    setItems((xs) =>
      (xs ?? []).map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => notificationsApi.markRead(n.id)));
      await load();
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={items ? `${unread.length} unread of ${items.length} total.` : "Loading…"}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={markAll}
            disabled={unread.length === 0 || markingAll}
          >
            {markingAll ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-1.5 h-4 w-4" />
            )}
            Mark all read
          </Button>
        }
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <Card>
          <CardContent className="p-0">
            {!items || items.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={Bell}
                  title="Nothing here yet"
                  description="Task assignments, escalations, and request updates will appear here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {items.map((n) => (
                  <li
                    key={n.id}
                    className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${!n.readAt ? "bg-primary/5" : ""}`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-muted-foreground/30" : "bg-primary"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{n.title}</span>
                        <StatusChip tone={TYPE_TONE[n.type]}>{TYPE_LABEL[n.type]}</StatusChip>
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    {!n.readAt && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 text-xs"
                        onClick={() => markOne(n.id)}
                      >
                        Mark read
                      </Button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
