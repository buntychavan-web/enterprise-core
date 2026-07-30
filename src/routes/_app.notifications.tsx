import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, Check, Filter } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { QueryState } from "@/components/ewos/QueryState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { notificationsApi, type NotificationResponse } from "@/lib/api-client";
import { formatDateTime, humanizeEnum } from "@/lib/format";

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

const ALL = "All";

function toneFor(type?: string): "neutral" | "info" | "success" | "warning" | "danger" {
  const t = (type ?? "").toUpperCase();
  if (t.includes("ERROR") || t.includes("REJECT") || t.includes("FAIL")) return "danger";
  if (t.includes("WARN") || t.includes("PENDING") || t.includes("DUE")) return "warning";
  if (t.includes("APPROV") || t.includes("SUCCESS") || t.includes("COMPLETE")) return "success";
  if (t) return "info";
  return "neutral";
}

function NotificationsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<string>(ALL);

  const notifications = useQuery({
    queryKey: ["notifications", "mine"],
    queryFn: ({ signal }) => notificationsApi.mine({ page: 0, size: 50 }, signal),
  });

  const markRead = useMutation({
    mutationFn: (id: string) => notificationsApi.markRead(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not update the notification."),
  });

  const markAll = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id) => notificationsApi.markRead(id)));
    },
    onSuccess: () => {
      toast.success("All notifications marked as read");
      void qc.invalidateQueries({ queryKey: ["notifications"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not mark all as read."),
  });

  const list: NotificationResponse[] = useMemo(
    () => notifications.data?.content ?? [],
    [notifications.data],
  );

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const n of list) if (n.type) set.add(n.type);
    return [ALL, ...Array.from(set).sort()];
  }, [list]);

  const filtered = useMemo(
    () => (tab === ALL ? list : list.filter((n) => n.type === tab)),
    [list, tab],
  );
  const unreadIds = list.filter((n) => !n.readAt).map((n) => n.id);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        description={
          notifications.isLoading
            ? "Loading your notifications…"
            : `${unreadIds.length} unread of ${list.length} total.`
        }
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAll.mutate(unreadIds)}
            disabled={unreadIds.length === 0 || markAll.isPending}
          >
            <Check className="mr-1.5 h-4 w-4" /> Mark all read
          </Button>
        }
      />

      <QueryState
        isLoading={notifications.isLoading}
        error={notifications.error}
        onRetry={() => void notifications.refetch()}
        label="notifications"
      >
        <Tabs value={categories.includes(tab) ? tab : ALL} onValueChange={setTab}>
          <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
            {categories.map((c) => (
              <TabsTrigger key={c} value={c}>
                {c === ALL ? c : humanizeEnum(c)}
              </TabsTrigger>
            ))}
          </TabsList>
          <TabsContent value={categories.includes(tab) ? tab : ALL} className="mt-4">
            <Card>
              <CardContent className="p-0">
                {filtered.length === 0 ? (
                  <div className="p-6">
                    <EmptyState
                      icon={list.length === 0 ? Bell : Filter}
                      title={list.length === 0 ? "No notifications" : "Nothing here"}
                      description={
                        list.length === 0
                          ? "Alerts, approvals and reminders will appear in this inbox."
                          : "No notifications match this filter."
                      }
                    />
                  </div>
                ) : (
                  <ul className="divide-y divide-border">
                    {filtered.map((n) => {
                      const read = !!n.readAt;
                      return (
                        <li
                          key={n.id}
                          className={`flex items-start gap-3 px-4 py-3 sm:px-5 ${
                            read ? "" : "bg-primary/5"
                          }`}
                        >
                          <span
                            className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                              read ? "bg-muted-foreground/30" : "bg-primary"
                            }`}
                            aria-hidden
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium text-foreground">{n.title}</span>
                              {n.type && (
                                <StatusChip tone={toneFor(n.type)}>{humanizeEnum(n.type)}</StatusChip>
                              )}
                            </div>
                            {n.body && (
                              <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                            )}
                            <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                              {formatDateTime(n.createdAt)}
                            </div>
                          </div>
                          {!read && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="shrink-0 text-xs"
                              onClick={() => markRead.mutate(n.id)}
                              disabled={markRead.isPending}
                            >
                              Mark read
                            </Button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </QueryState>
    </div>
  );
}
