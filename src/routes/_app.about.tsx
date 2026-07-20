import { createFileRoute } from "@tanstack/react-router";
import { Github, Globe, Mail, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusChip } from "@/components/ewos/StatusChip";
import { EwosLogo } from "@/components/ewos/Logo";

export const Route = createFileRoute("/_app/about")({
  head: () => ({
    meta: [
      { title: "About — EWOS" },
      { name: "description", content: "About the EWOS platform, version and support." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Platform"
        title="About EWOS"
        description="Enterprise Workforce Operating System — powering people, payroll and compliance."
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Platform</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <EwosLogo />
              <StatusChip tone="success">v1.0.0</StatusChip>
              <StatusChip tone="info">Production</StatusChip>
            </div>
            <p className="text-sm text-muted-foreground">
              EWOS is a modern, modular HRMS covering organization setup, employee lifecycle,
              attendance, leave, payroll, compliance and analytics — with an enterprise design
              system tuned for scale and accessibility.
            </p>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <Row k="Release channel" v="Stable" />
              <Row k="Build" v="ewos-web@1.0.0" />
              <Row k="Region" v="ap-south-1" />
              <Row k="Support tier" v="Enterprise 24×7" />
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Resources</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <ResourceLink icon={Globe} label="ewos.example" href="https://ewos.example" />
            <ResourceLink icon={Mail} label="support@ewos.example" href="mailto:support@ewos.example" />
            <ResourceLink icon={Github} label="Release notes" href="#" />
            <ResourceLink icon={ShieldCheck} label="Security & compliance" href="#" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Legal</CardTitle>
        </CardHeader>
        <CardContent className="text-xs text-muted-foreground">
          © {new Date().getFullYear()} EWOS Technologies Pvt. Ltd. All rights reserved. EWOS,
          the EWOS logo and product names are trademarks of EWOS Technologies. Use of this
          product is governed by your Enterprise Agreement.
        </CardContent>
      </Card>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-border/60 py-1.5 last:border-0">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="font-medium text-foreground">{v}</dd>
    </div>
  );
}

function ResourceLink({
  icon: Icon,
  label,
  href,
}: {
  icon: typeof Globe;
  label: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="truncate">{label}</span>
    </a>
  );
}
