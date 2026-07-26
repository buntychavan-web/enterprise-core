import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Rocket } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
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
  ApiError,
  DEFAULT_COMPANY_ID,
  DEFAULT_TENANT_ID,
  clientGoLiveApi,
  type ClientGoLiveConfigurationDto,
  type ClientGoLiveStatus,
} from "@/lib/api-client";

// Sprint 14.4 — Client Go-Live Configuration. One row per Company: target go-live date and a
// coarse status. Custom screen (not CrudScreen) since this is a single "current configuration for
// this company" record rather than a list — same reasoning that kept Data Exchange off CrudScreen.

export const Route = createFileRoute("/_app/client-golive")({
  head: () => ({
    meta: [{ title: "Client Go-Live — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: ClientGoLivePage,
});

const STATUS_TONE: Record<ClientGoLiveStatus, StatusTone> = {
  PLANNING: "neutral",
  READY: "warning",
  LIVE: "success",
  SUSPENDED: "danger",
};

const STATUS_OPTIONS: ClientGoLiveStatus[] = ["PLANNING", "READY", "LIVE", "SUSPENDED"];

function ClientGoLivePage() {
  const [config, setConfig] = useState<ClientGoLiveConfigurationDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [goLiveDate, setGoLiveDate] = useState("");
  const [status, setStatus] = useState<ClientGoLiveStatus>("PLANNING");
  const [notes, setNotes] = useState("");

  const load = async () => {
    setLoading(true);
    try {
      const data = await clientGoLiveApi.forCompany(DEFAULT_COMPANY_ID);
      setConfig(data);
      setGoLiveDate(data?.goLiveDate ?? "");
      setStatus(data?.status ?? "PLANNING");
      setNotes(data?.notes ?? "");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to load go-live configuration.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const create = async () => {
    setSaving(true);
    try {
      const created = await clientGoLiveApi.create({
        tenantId: DEFAULT_TENANT_ID,
        clientId: DEFAULT_TENANT_ID,
        companyId: DEFAULT_COMPANY_ID,
        goLiveDate: goLiveDate || undefined,
        notes: notes || undefined,
      });
      setConfig(created);
      toast.success("Go-live configuration created");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create.");
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const updated = await clientGoLiveApi.update(config.id, {
        goLiveDate: goLiveDate || undefined,
        status,
        notes: notes || undefined,
      });
      setConfig(updated);
      toast.success("Go-live configuration updated");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Payroll Outsourcing"
        title="Client Go-Live"
        description="Readiness of this outsourced payroll engagement to go live."
        actions={
          config && <StatusChip tone={STATUS_TONE[config.status]}>{config.status}</StatusChip>
        }
      />

      {loading ? (
        <div className="grid place-items-center rounded-lg border border-border bg-card p-16">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : !config ? (
        <EmptyState
          icon={Rocket}
          title="No go-live configuration yet"
          description="Create one to start tracking this company's readiness to go live."
          action={
            <Button onClick={() => void create()} disabled={saving} size="sm">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create go-live configuration
            </Button>
          }
        />
      ) : (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="goLiveDate">Go-live date</Label>
                <Input
                  id="goLiveDate"
                  type="date"
                  value={goLiveDate}
                  onChange={(e) => setGoLiveDate(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="status">Status</Label>
                <Select value={status} onValueChange={(v) => setStatus(v as ClientGoLiveStatus)}>
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
              />
            </div>
            <div className="flex justify-end">
              <Button onClick={() => void save()} disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
