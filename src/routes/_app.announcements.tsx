import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Megaphone, Pin } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ewos/PageHeader";
import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { announcementsApi, type AnnouncementResponse } from "@/lib/api-client";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_app/announcements")({
  head: () => ({
    meta: [
      { title: "Announcements — EWOS" },
      { name: "description", content: "Company-wide announcements and policy updates." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AnnouncementsPage,
});

const TONE: Record<AnnouncementResponse["category"], StatusTone> = {
  Company: "info",
  HR: "success",
  Product: "neutral",
  Policy: "warning",
};

const TABS = ["All", "Company", "HR", "Product", "Policy"] as const;

function AnnouncementsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");

  const query = useQuery({
    queryKey: ["announcements"],
    queryFn: ({ signal }) => announcementsApi.list(signal),
  });

  const filtered = useMemo(
    () =>
      tab === "All" ? (query.data ?? []) : (query.data ?? []).filter((a) => a.category === tab),
    [query.data, tab],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Newsroom"
        title="Announcements"
        description="Latest updates from leadership, HR, product and policy teams."
      />

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          <QueryState
            isLoading={query.isLoading}
            error={query.error}
            onRetry={() => query.refetch()}
            label="announcements"
          >
            {filtered.length === 0 ? (
              <Card>
                <CardContent className="p-6">
                  <EmptyState
                    icon={Megaphone}
                    title="Nothing here"
                    description={
                      tab !== "All"
                        ? "No announcements in this category yet."
                        : "Announcements will appear once the backend endpoint is available."
                    }
                  />
                </CardContent>
              </Card>
            ) : (
              filtered.map((a) => (
                <Card key={a.id}>
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      {a.pinned && (
                        <StatusChip tone="warning" icon={<Pin className="h-3 w-3" />}>
                          Pinned
                        </StatusChip>
                      )}
                      <StatusChip tone={TONE[a.category]}>{a.category}</StatusChip>
                      <span className="ml-auto text-xs text-muted-foreground">
                        {formatDate(a.publishedAt)}
                      </span>
                    </div>
                    <h3 className="mt-2 text-base font-semibold text-foreground">{a.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                    <div className="mt-3 text-xs text-muted-foreground">— {a.author || "EWOS"}</div>
                  </CardContent>
                </Card>
              ))
            )}
          </QueryState>
        </TabsContent>
      </Tabs>
    </div>
  );
}
