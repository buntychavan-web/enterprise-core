import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, CalendarClock, ClipboardCheck, X } from "lucide-react";
import { ApiError, notificationInboxApi, type NotificationInboxItemDto } from "@/lib/api-client";
import { useEssDashboard } from "@/hooks/use-ess-home-data";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Sprint 0 (EWOS App Shell) — the Attention Inbox signature element.
 *
 * V1 is a client-side aggregation of two real, already-existing sources —
 * exactly per the Sprint 0 brief ("do not create a new backend aggregation
 * endpoint merely to make the UI easier; if client-side aggregation is
 * sufficient for V1, use it"):
 *
 *  1. GET /self-service/dashboard → pendingActions (leave approvals waiting
 *     on this caller, timesheet due) — a live count, not a persisted item,
 *     so it's navigable but not individually dismissible.
 *  2. GET /self-service/notifications (Sprint 27C NotificationInboxController,
 *     not the older /notifications/mine — see Sprint 0 API-wiring notes) →
 *     real unread notifications, individually readable and dismissible.
 *
 * This is explicitly NOT an audit trail — read/dismiss here only change what
 * this screen shows this user; they are not a record of any HR/payroll
 * decision. See the EWOS CTO review's correction of Kimi's "AuditableEntity"
 * claim: authoritative audit, if ever needed for approval actions, must be a
 * dedicated server-side table, never this component.
 */

type AttentionItem = {
  key: string;
  icon: React.ReactNode;
  title: string;
  body?: string;
  to?: string;
  dismissible: boolean;
  notificationId?: string;
};

const MAX_VISIBLE = 3;

export function AttentionInbox() {
  const dashboard = useEssDashboard();
  const [notifications, setNotifications] = useState<NotificationInboxItemDto[] | null>(null);
  const [notificationsFailed, setNotificationsFailed] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    notificationInboxApi
      .list({ unreadOnly: true, limit: 5 })
      .then((page) => {
        if (!cancelled) setNotifications(page.items);
      })
      .catch(() => {
        if (!cancelled) {
          setNotifications([]);
          setNotificationsFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loading = dashboard.loading || notifications === null;

  // Both real sources failed — nothing honest to show; collapse rather than
  // render a broken hero-position widget (see Sprint 0 design notes).
  if (!loading && dashboard.error && notificationsFailed) {
    return null;
  }

  if (loading) {
    return (
      <div className="space-y-2" aria-hidden>
        {Array.from({ length: 2 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  const items: AttentionItem[] = [];

  const pending = dashboard.data?.pendingActions;
  if (pending?.leaveRequestsPendingMyApproval) {
    items.push({
      key: "leave-approvals",
      icon: <ClipboardCheck className="h-4 w-4" aria-hidden />,
      title: `${pending.leaveRequestsPendingMyApproval} leave ${pending.leaveRequestsPendingMyApproval === 1 ? "request" : "requests"} awaiting your approval`,
      to: "/my-team",
      dismissible: false,
    });
  }
  if (pending?.timesheetDue) {
    items.push({
      key: "timesheet-due",
      icon: <CalendarClock className="h-4 w-4" aria-hidden />,
      title: "Your timesheet is due",
      body: pending.upcomingTimesheetDeadline
        ? `Due ${new Date(pending.upcomingTimesheetDeadline).toLocaleDateString()}`
        : undefined,
      to: "/my-attendance",
      dismissible: false,
    });
  }
  for (const n of notifications ?? []) {
    if (dismissed.has(n.id)) continue;
    items.push({
      key: `notification-${n.id}`,
      icon: <Bell className="h-4 w-4" aria-hidden />,
      title: n.title,
      body: n.body,
      to: n.link,
      dismissible: true,
      notificationId: n.id,
    });
  }

  if (items.length === 0) return null;

  const visible = items.slice(0, MAX_VISIBLE);
  const overflow = items.length - visible.length;

  const handleDismiss = async (item: AttentionItem, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!item.notificationId) return;
    setDismissed((prev) => new Set(prev).add(item.notificationId!));
    try {
      await notificationInboxApi.dismiss(item.notificationId);
    } catch (err) {
      if (!(err instanceof ApiError)) throw err;
      // Best-effort: leave it dismissed client-side for this session even if
      // the server call failed transiently; it will reappear on next load if
      // it's genuinely still unread server-side.
    }
  };

  const handleOpen = async (item: AttentionItem) => {
    if (item.notificationId) {
      notificationInboxApi.markRead(item.notificationId).catch(() => {});
    }
  };

  return (
    <section aria-label="Attention" role="list" aria-live="polite" className="space-y-2">
      {visible.map((item) => {
        const content = (
          <div
            className={cn(
              "flex items-start gap-3 rounded-lg border border-border border-t-2 border-t-attention bg-card p-3",
              item.to && "transition-colors hover:border-foreground/20",
            )}
          >
            <span className="mt-0.5 text-attention">{item.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              {item.body && <p className="mt-0.5 text-xs text-muted-foreground">{item.body}</p>}
            </div>
            {item.dismissible && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                aria-label={`Dismiss: ${item.title}`}
                onClick={(e) => handleDismiss(item, e)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        );

        return (
          <div key={item.key} role="listitem">
            {item.to ? (
              // item.to for notifications is a backend-supplied path (NotificationResponse.link),
              // not one of this app's statically-known route literals, hence the cast.
              <Link to={item.to as never} onClick={() => handleOpen(item)} aria-label={item.title}>
                {content}
              </Link>
            ) : (
              content
            )}
          </div>
        );
      })}
      {overflow > 0 && (
        <Link
          to="/notifications"
          className="block px-1 text-xs font-medium text-muted-foreground hover:text-foreground"
        >
          +{overflow} more
        </Link>
      )}
    </section>
  );
}
