import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  BookOpen,
  Keyboard,
  LifeBuoy,
  Mail,
  MessageSquare,
  Send,
} from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { HELP_TOPICS, SHORTCUTS } from "@/lib/mock/workspace";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/help")({
  head: () => ({
    meta: [
      { title: "Help Center — EWOS" },
      { name: "description", content: "Find answers, shortcuts and contact support." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HelpPage,
});

function HelpPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Support"
        title="Help Center"
        description="Search guides, view keyboard shortcuts, or contact the EWOS team."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <QuickCard
          icon={BookOpen}
          title="Product guides"
          description="Step-by-step help articles across every module."
        />
        <ShortcutsCard />
        <FeedbackCard />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Frequently asked</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {HELP_TOPICS.map((s) => (
              <div key={s.section}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {s.section}
                </div>
                <Accordion type="multiple" className="w-full">
                  {s.items.map((item, i) => (
                    <AccordionItem key={i} value={`${s.section}-${i}`}>
                      <AccordionTrigger className="text-left text-sm">{item.q}</AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.a}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Still need help?</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button variant="outline" asChild>
            <a href="mailto:support@ewos.example">
              <Mail className="mr-2 h-4 w-4" /> support@ewos.example
            </a>
          </Button>
          <Button variant="outline" disabled>
            <LifeBuoy className="mr-2 h-4 w-4" /> Open support ticket
          </Button>
          <span className="text-xs text-muted-foreground">Response within 1 business day.</span>
        </CardContent>
      </Card>
    </div>
  );
}

function QuickCard({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof BookOpen;
  title: string;
  description: string;
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <div className="mt-3 text-sm font-semibold">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </CardContent>
    </Card>
  );
}

function ShortcutsCard() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Card
        role="button"
        tabIndex={0}
        onClick={() => setOpen(true)}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
        className="cursor-pointer transition-colors hover:border-primary/40"
      >
        <CardContent className="p-4">
          <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
            <Keyboard className="h-4 w-4" />
          </div>
          <div className="mt-3 text-sm font-semibold">Keyboard shortcuts</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Speed up navigation with ⌘K and quick keys.
          </div>
        </CardContent>
      </Card>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Keyboard className="h-4 w-4" /> Keyboard shortcuts
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {SHORTCUTS.map((g) => (
              <div key={g.group}>
                <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {g.group}
                </div>
                <ul className="divide-y divide-border rounded-md border border-border">
                  {g.items.map((s, i) => (
                    <li key={i} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span className="text-muted-foreground">{s.description}</span>
                      <span className="flex items-center gap-1">
                        {s.keys.map((k, ki) => (
                          <kbd
                            key={ki}
                            className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px] text-foreground"
                          >
                            {k}
                          </kbd>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FeedbackCard() {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Idea");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && setOpen(true)}
          className="cursor-pointer transition-colors hover:border-primary/40"
        >
          <CardContent className="p-4">
            <div className="grid h-9 w-9 place-items-center rounded-md bg-primary/10 text-primary">
              <MessageSquare className="h-4 w-4" />
            </div>
            <div className="mt-3 text-sm font-semibold">Send feedback</div>
            <div className="mt-0.5 text-xs text-muted-foreground">
              Report a bug or share what would make EWOS better.
            </div>
          </CardContent>
        </Card>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Send feedback
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              setOpen(false);
              setMessage("");
              toast.success("Feedback sent", {
                description: "Thanks — the EWOS team will review shortly.",
              });
            }}
          >
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Idea">Idea</SelectItem>
                  <SelectItem value="Bug">Bug</SelectItem>
                  <SelectItem value="Question">Question</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-email">Reply-to email (optional)</Label>
              <Input
                id="fb-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-msg">Message</Label>
              <Textarea
                id="fb-msg"
                rows={4}
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what happened or what you'd like to see."
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={!message.trim()}>
                <Send className="mr-1.5 h-4 w-4" /> Send
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
