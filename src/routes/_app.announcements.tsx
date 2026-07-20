import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Megaphone, Pin } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { ANNOUNCEMENTS_FULL, type Announcement } from "@/lib/mock/workspace";

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

const TONE: Record<Announcement["category"], StatusTone> = {
  Company: "info",
  HR: "success",
  Product: "neutral",
  Policy: "warning",
};

const TABS = ["All", "Company", "HR", "Product", "Policy"] as const;

function AnnouncementsPage() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All");
  const filtered = useMemo(
    () =>
      tab === "All"
        ? ANNOUNCEMENTS_FULL
        : ANNOUNCEMENTS_FULL.filter((a) => a.category === tab),
    [tab],
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
            <TabsTrigger key={t} value={t}>{t}</TabsTrigger>
          ))}
        </TabsList>
        <TabsContent value={tab} className="mt-4 space-y-3">
          {filtered.length === 0 ? (
            <Card>
              <CardContent className="p-6">
                <EmptyState
                  icon={Megaphone}
                  title="Nothing here"
                  description="No announcements in this category yet."
                />
              </CardContent>
            </Card>
          ) : (
            filtered.map((a) => (
              <Card key={a.id}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.pinned && (
                      <StatusChip tone="warning" icon={<Pin className="h-3 w-3" />}>Pinned</StatusChip>
                    )}
                    <StatusChip tone={TONE[a.category]}>{a.category}</StatusChip>
                    <span className="ml-auto text-xs text-muted-foreground">{a.publishedAt}</span>
                  </div>
                  <h3 className="mt-2 text-base font-semibold text-foreground">{a.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{a.body}</p>
                  <div className="mt-3 text-xs text-muted-foreground">— {a.author}</div>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
