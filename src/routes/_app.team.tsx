import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MessageSquare, Phone, UserSquare2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DIRECTORY, MY_MANAGER_ID, MY_TEAM_IDS } from "@/lib/mock/workspace";

export const Route = createFileRoute("/_app/team")({
  head: () => ({
    meta: [
      { title: "My Team — EWOS" },
      { name: "description", content: "Your manager, direct reports and peers." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TeamPage,
});

function TeamPage() {
  const manager = DIRECTORY.find((p) => p.id === MY_MANAGER_ID);
  const team = DIRECTORY.filter((p) => MY_TEAM_IDS.includes(p.id));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="People"
        title="My Team"
        description="Your reporting line and immediate team."
      />

      {manager && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Manager</CardTitle>
          </CardHeader>
          <CardContent>
            <PersonRow id={manager.id} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-semibold">Team ({team.length})</CardTitle>
          <StatusChip tone="info">You + peers</StatusChip>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {team.map((p) => (
            <PersonRow key={p.id} id={p.id} />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function PersonRow({ id }: { id: string }) {
  const p = DIRECTORY.find((d) => d.id === id);
  if (!p) return null;
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback className="bg-primary/10 text-primary">{p.initials}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <Link
          to="/employees/$id"
          params={{ id: p.id }}
          className="truncate text-sm font-semibold text-foreground hover:text-primary"
        >
          {p.name}
        </Link>
        <div className="truncate text-xs text-muted-foreground">
          {p.designation} · {p.location}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
            <a href={`mailto:${p.email}`}>
              <Mail className="mr-1 h-3 w-3" /> Email
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
            <a href={`tel:${p.phone.replace(/\s+/g, "")}`}>
              <Phone className="mr-1 h-3 w-3" /> Call
            </a>
          </Button>
          <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
            <Link to="/employees/$id" params={{ id: p.id }}>
              <UserSquare2 className="mr-1 h-3 w-3" /> Profile
            </Link>
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" disabled>
            <MessageSquare className="mr-1 h-3 w-3" /> Chat
          </Button>
        </div>
      </div>
    </div>
  );
}
