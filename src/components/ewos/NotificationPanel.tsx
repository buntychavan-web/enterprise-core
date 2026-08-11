import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./EmptyState";
import { ApiError, notificationInboxApi, type NotificationInboxItemDto } from "@/lib/api-client";

/**
 * Sprint 4 — wired to the real `com.ewos.notification` inbox (previously a stub package with no
 * endpoints; the `/notifications` screen and this panel both ran on mock data through Sprint 13).
 *
 * Sprint 0 (EWOS App Shell) — repointed from the older `/notifications/mine`
 * controller to the Sprint 27C `NotificationInboxController`
 * (/self-service/notifications), the only one that supports dismiss and the
 * one the rest of the ESS/MSS self-service API family already uses. See the
 * EWOS CTO review's "two notification controllers" finding.
 *
 * Fetches once on mount rather than polling — an operator can add a refresh
 * interval later without changing this component's shape.
 */
export function NotificationPanel() {
  const [items, setItems] = useState<NotificationInboxItemDto[]>([]);
  const [open, setOpen] = useState(false);

  const load = () => {
    notificationInboxApi
      .list({ limit: 8 })
      .then((page) => setItems(page.items))
      .catch(() => setItems([]));
  };

  useEffect(() => {
    load();
  }, []);

  const unread = items.filter((n) => !n.readAt).length;

  const markRead = async (id: string) => {
    try {
      await notificationInboxApi.markRead(id);
      setItems((xs) =>
        xs.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
    }
  };

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) load();
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`}
          className="relative h-9 w-9"
        >
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive"
              aria-hidden
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2">
          <div className="text-sm font-semibold text-foreground">Notifications</div>
          {unread > 0 && <Badge variant="secondary">{unread} new</Badge>}
        </div>
        <div className="max-h-80 overflow-auto">
          {items.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="Notifications will appear here as they arrive."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((n) => (
                <li key={n.id} className="px-3 py-2 text-sm">
                  <button
                    type="button"
                    className="w-full text-left"
                    onClick={() => !n.readAt && markRead(n.id)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-medium text-foreground">{n.title}</div>
                      {!n.readAt && (
                        <span
                          className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary"
                          aria-hidden
                        />
                      )}
                    </div>
                    {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
                    <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                      {new Date(n.createdAt).toLocaleString()}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="border-t border-border px-3 py-2 text-right">
          <Button variant="ghost" size="sm" asChild className="text-xs">
            <Link to="/notifications">View all</Link>
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
