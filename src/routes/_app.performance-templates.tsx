import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { FileText, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RequirePermission } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  appraisalTemplateApi,
  type AppraisalTemplateDto,
  type TemplateSectionDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/performance-templates")({
  head: () => ({
    meta: [{ title: "Appraisal Templates — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PerformanceTemplatesPage,
});

const EMPTY_FORM = {
  code: "",
  name: "",
  description: "",
  ratingScaleMin: "1",
  ratingScaleMax: "5",
};

function PerformanceTemplatesPage() {
  const { tenantId, activeCompanyId } = useTenant();
  const [templates, setTemplates] = useState<AppraisalTemplateDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const [sectionsFor, setSectionsFor] = useState<AppraisalTemplateDto | null>(null);
  const [sections, setSections] = useState<TemplateSectionDto[]>([]);
  const [sectionForm, setSectionForm] = useState({ code: "", name: "", weightage: "" });

  const load = async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    setError(null);
    try {
      setTemplates(await appraisalTemplateApi.listForCompany(activeCompanyId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load templates.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCompanyId]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateOpen(true);
  };

  const submitCreate = async () => {
    if (!tenantId || !activeCompanyId) return;
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    const min = Number(form.ratingScaleMin);
    const max = Number(form.ratingScaleMax);
    if (Number.isNaN(min) || Number.isNaN(max) || max <= min) {
      toast.error("Rating scale max must be greater than min");
      return;
    }
    setSaving(true);
    try {
      await appraisalTemplateApi.create({
        tenantId,
        companyId: activeCompanyId,
        code: form.code.trim(),
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        ratingScaleMin: min,
        ratingScaleMax: max,
      });
      toast.success("Template created");
      setCreateOpen(false);
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to create template.");
    } finally {
      setSaving(false);
    }
  };

  const openSections = async (t: AppraisalTemplateDto) => {
    setSectionsFor(t);
    setSectionForm({ code: "", name: "", weightage: "" });
    try {
      setSections(await appraisalTemplateApi.listSections(t.id));
    } catch {
      setSections([]);
    }
  };

  const submitSection = async () => {
    if (!sectionsFor) return;
    if (!sectionForm.code.trim() || !sectionForm.name.trim()) {
      toast.error("Section code and name are required");
      return;
    }
    const weightage = Number(sectionForm.weightage || "0");
    setSaving(true);
    try {
      await appraisalTemplateApi.addSection(sectionsFor.id, {
        code: sectionForm.code.trim(),
        name: sectionForm.name.trim(),
        weightage,
      });
      toast.success("Section added");
      setSectionForm({ code: "", name: "", weightage: "" });
      setSections(await appraisalTemplateApi.listSections(sectionsFor.id));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to add section.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Performance"
        title="Appraisal Templates"
        description="Rating scales and sections used by appraisal cycles."
        actions={
          <RequirePermission code="PERF_ADMIN">
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              New template
            </Button>
          </RequirePermission>
        }
      />

      {!activeCompanyId ? (
        <EmptyState
          title="Select a company"
          description="Choose a company to view its templates."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load templates" description={error} />
      ) : templates.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No templates yet"
          description="Create a template before launching an appraisal cycle."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {templates.map((t) => (
            <Card key={t.id}>
              <CardHeader className="flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-semibold">{t.name}</CardTitle>
                <StatusChip tone={t.active ? "success" : "neutral"}>
                  {t.active ? "Active" : "Inactive"}
                </StatusChip>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-xs text-muted-foreground">
                  {t.code} · Scale {t.ratingScaleMin}–{t.ratingScaleMax}
                </div>
                {t.description && <p className="text-sm text-muted-foreground">{t.description}</p>}
                <Button size="sm" variant="outline" onClick={() => void openSections(t)}>
                  Manage sections
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>New appraisal template</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="f-code">
                Code<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                maxLength={64}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-name">
                Name<span className="ml-0.5 text-destructive">*</span>
              </Label>
              <Input
                id="f-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                maxLength={256}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="f-description">Description</Label>
              <Textarea
                id="f-description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="f-min">Scale min</Label>
                <Input
                  id="f-min"
                  type="number"
                  value={form.ratingScaleMin}
                  onChange={(e) => setForm({ ...form, ratingScaleMin: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="f-max">Scale max</Label>
                <Input
                  id="f-max"
                  type="number"
                  value={form.ratingScaleMax}
                  onChange={(e) => setForm({ ...form, ratingScaleMax: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={() => void submitCreate()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sectionsFor !== null} onOpenChange={(o) => !o && setSectionsFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sections — {sectionsFor?.name}</DialogTitle>
            <DialogDescription>Weighted sections that make up this template.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {sections.length === 0 ? (
              <p className="text-sm text-muted-foreground">No sections yet.</p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {sections
                  .slice()
                  .sort((a, b) => a.displayOrder - b.displayOrder)
                  .map((s) => (
                    <li key={s.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <span>{s.name}</span>
                      <span className="text-xs text-muted-foreground">{s.weightage}%</span>
                    </li>
                  ))}
              </ul>
            )}
            <div className="grid grid-cols-3 gap-2">
              <Input
                placeholder="Code"
                value={sectionForm.code}
                onChange={(e) => setSectionForm({ ...sectionForm, code: e.target.value })}
              />
              <Input
                placeholder="Name"
                value={sectionForm.name}
                onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })}
              />
              <Input
                placeholder="Weight %"
                type="number"
                value={sectionForm.weightage}
                onChange={(e) => setSectionForm({ ...sectionForm, weightage: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSectionsFor(null)} disabled={saving}>
              Close
            </Button>
            <Button onClick={() => void submitSection()} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Add section
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
