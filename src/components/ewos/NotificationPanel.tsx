import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "./EmptyState";

export type NotificationItem = {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  read?: boolean;
};

/**
 * NotificationPanel — UI shell. Notifications must be sourced from a backend
 * endpoint. Renders an empty state until real data is wired in.
 */
export function NotificationPanel({ notifications }: { notifications?: NotificationItem[] }) {
  const list = notifications ?? [];
  const unread = list.filter((n) => !n.read).length;

  return (
    <Popover>
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
          {list.length === 0 ? (
            <div className="p-4">
              <EmptyState
                icon={Bell}
                title="You're all caught up"
                description="Notifications will appear here as they arrive."
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((n) => (
                <li key={n.id} className="px-3 py-2 text-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-foreground">{n.title}</div>
                    {!n.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" aria-hidden />
                    )}
                  </div>
                  {n.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{n.description}</p>
                  )}
                  <div className="mt-1 text-[11px] uppercase tracking-wide text-muted-foreground">
                    {n.createdAt}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
