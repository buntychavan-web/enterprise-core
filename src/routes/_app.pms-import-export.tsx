import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { CheckCircle2, Download, FileWarning, Loader2, Upload, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RequirePermission } from "@/lib/permissions";
import { useTenant } from "@/lib/tenant-context";
import {
  ApiError,
  competencyImportExportApi,
  developmentPlanImportExportApi,
  goalImportExportApi,
  type ImportResultDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/pms-import-export")({
  head: () => ({
    meta: [{ title: "PMS Data Import/Export — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: PmsImportExportPage,
});

type ModuleConfig = {
  key: string;
  label: string;
  permission: string;
  columns: string;
  api: {
    downloadTemplate: () => Promise<void>;
    exportCsv: (companyId: string) => Promise<void>;
    importCsv: (companyId: string, file: File) => Promise<ImportResultDto>;
  };
};

const MODULES: ModuleConfig[] = [
  {
    key: "goals",
    label: "Goals & KPIs",
    permission: "GOAL_ADMIN",
    columns:
      "employee_number, code, name, description, goal_type, scope, period_start, period_end, weightage, target, unit_of_measure, priority",
    api: goalImportExportApi,
  },
  {
    key: "competencies",
    label: "Employee Competencies",
    permission: "COMPETENCY_WRITE",
    columns: "employee_number, competency_code, current_level, target_level, notes",
    api: competencyImportExportApi,
  },
  {
    key: "development-plans",
    label: "Development Plans",
    permission: "COMPETENCY_PLAN",
    columns: "employee_number, title, description, starts_on, ends_on",
    api: developmentPlanImportExportApi,
  },
];

function PmsImportExportPage() {
  return (
    <RequirePermission
      code="GOAL_ADMIN"
      fallback={
        <RequirePermission
          code="COMPETENCY_WRITE"
          fallback={
            <RequirePermission
              code="COMPETENCY_PLAN"
              fallback={
                <EmptyState
                  title="Not authorized"
                  description="You do not have access to PMS bulk data tools."
                />
              }
            >
              <PmsImportExportContent />
            </RequirePermission>
          }
        >
          <PmsImportExportContent />
        </RequirePermission>
      }
    >
      <PmsImportExportContent />
    </RequirePermission>
  );
}

function PmsImportExportContent() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="PMS Data Import/Export"
        eyebrow="Performance Management"
        description="Bulk CSV import and export for Goals, Employee Competencies, and Development Plans. Every import is validated row-by-row with partial success — valid rows are applied even if some rows fail — and recorded as an audit log entry."
      />
      <Tabs defaultValue="goals">
        <TabsList>
          {MODULES.map((m) => (
            <TabsTrigger key={m.key} value={m.key}>
              {m.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {MODULES.map((m) => (
          <TabsContent key={m.key} value={m.key} className="mt-4">
            <ModulePanel module={m} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

function ModulePanel({ module: m }: { module: ModuleConfig }) {
  const { activeCompanyId } = useTenant();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [templateBusy, setTemplateBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const [importBusy, setImportBusy] = useState(false);
  const [result, setResult] = useState<ImportResultDto | null>(null);

  const downloadTemplate = async () => {
    setTemplateBusy(true);
    try {
      await m.api.downloadTemplate();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to download template.");
    } finally {
      setTemplateBusy(false);
    }
  };

  const exportData = async () => {
    if (!activeCompanyId) return;
    setExportBusy(true);
    try {
      await m.api.exportCsv(activeCompanyId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Failed to export data.");
    } finally {
      setExportBusy(false);
    }
  };

  const runImport = async () => {
    if (!activeCompanyId || !selectedFile) return;
    setImportBusy(true);
    setResult(null);
    try {
      const res = await m.api.importCsv(activeCompanyId, selectedFile);
      setResult(res);
      if (res.failureCount === 0) {
        toast.success(`Imported ${res.successCount} of ${res.totalRows} rows successfully.`);
      } else {
        toast.warning(
          `Imported ${res.successCount} of ${res.totalRows} rows — ${res.failureCount} row(s) failed. See the error report below.`,
        );
      }
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Import failed.");
    } finally {
      setImportBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Template &amp; Export</CardTitle>
          <CardDescription>Columns: {m.columns}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={downloadTemplate} disabled={templateBusy}>
            {templateBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Download CSV Template
          </Button>
          <Button variant="outline" onClick={exportData} disabled={exportBusy || !activeCompanyId}>
            {exportBusy ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-2 h-4 w-4" />
            )}
            Export All as CSV
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bulk Import</CardTitle>
          <CardDescription>
            Upload a CSV file matching the template above. Rows are processed independently — a bad
            row is reported as an error without blocking the valid rows around it.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              aria-label={`${m.label} CSV file`}
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-secondary-foreground"
            />
            <Button onClick={runImport} disabled={importBusy || !selectedFile || !activeCompanyId}>
              {importBusy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Import
            </Button>
          </div>

          {result && (
            <div className="space-y-3">
              <Alert variant={result.failureCount === 0 ? "default" : "destructive"}>
                {result.failureCount === 0 ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <FileWarning className="h-4 w-4" />
                )}
                <AlertTitle>Import complete</AlertTitle>
                <AlertDescription>
                  <span className="mr-3">
                    <StatusChip tone="neutral">{result.totalRows} total</StatusChip>
                  </span>
                  <span className="mr-3">
                    <StatusChip tone="success">{result.successCount} succeeded</StatusChip>
                  </span>
                  <span>
                    <StatusChip tone={result.failureCount > 0 ? "danger" : "neutral"}>
                      {result.failureCount} failed
                    </StatusChip>
                  </span>
                </AlertDescription>
              </Alert>

              {result.errors.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">Row</TableHead>
                        <TableHead>Row Data</TableHead>
                        <TableHead>Error</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.errors.map((e) => (
                        <TableRow key={e.rowNumber}>
                          <TableCell className="font-mono text-xs">{e.rowNumber}</TableCell>
                          <TableCell
                            className="max-w-xs truncate font-mono text-xs"
                            title={e.rowData}
                          >
                            {e.rowData}
                          </TableCell>
                          <TableCell className="text-sm text-destructive">
                            <span className="inline-flex items-center gap-1">
                              <XCircle className="h-3.5 w-3.5 shrink-0" />
                              {e.errorMessage}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
