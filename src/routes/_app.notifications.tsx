import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, Check, Loader2, X } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ApiError, notificationInboxApi, type NotificationInboxItemDto } from "@/lib/api-client";

// Sprint 4: wired to the real com.ewos.notification inbox. Through Sprint 13 this screen ran on
// mock data because the backend module was an empty package stub with no endpoints or table (see
// the Sprint 13 completion report) — Sprint 4 built the notifications table, service, and REST API
// this screen now consumes.
//
// Sprint 0 (EWOS App Shell) — repointed to the Sprint 27C NotificationInboxController
// (/self-service/notifications), the only one that supports dismiss/soft-delete. The old
// /notifications/mine controller this screen previously called is still real and untouched, but
// has no dismiss endpoint — see the EWOS CTO review's "two notification controllers" finding.

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

/** Real backend NotificationType has 60+ values across every module (see
 * com.ewos.notification.domain.NotificationType) — rather than hardcoding an
 * exhaustive tone/label map that will drift, this formats the raw enum name
 * into a readable label, e.g. "PAYSLIP_READY" -> "Payslip ready". */
function formatType(type: string): string {
  return type
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationInboxItemDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const page = await notificationInboxApi.list({ limit: 50 });
      setItems(page.items);
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
    await notificationInboxApi.markRead(id);
    setItems((xs) =>
      (xs ?? []).map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
    );
  };

  const dismissOne = async (id: string) => {
    setItems((xs) => (xs ?? []).filter((n) => n.id !== id));
    try {
      await notificationInboxApi.dismiss(id);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      load(); // best-effort: reload if the dismiss genuinely failed server-side
    }
  };

  const markAll = async () => {
    setMarkingAll(true);
    try {
      await Promise.all(unread.map((n) => notificationInboxApi.markRead(n.id)));
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
                    className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${!n.readAt ? "bg-attention/5" : ""}`}
                  >
                    {/* Sprint 1 (ESS Core Polish) — matches the header bell's
                        gold unread signal (NotificationPanel.tsx). This full
                        inbox page was using bg-primary here, a leftover from
                        before Sprint 0 established one "needs your attention"
                        color throughout. */}
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.readAt ? "bg-muted-foreground/30" : "bg-attention"}`}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{n.title}</span>
                        <span className="text-xs text-muted-foreground">{formatType(n.type)}</span>
                      </div>
                      {n.body && <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>}
                      <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                        {new Date(n.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      {!n.readAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => markOne(n.id)}
                        >
                          Mark read
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        aria-label={`Dismiss: ${n.title}`}
                        onClick={() => dismissOne(n.id)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
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
