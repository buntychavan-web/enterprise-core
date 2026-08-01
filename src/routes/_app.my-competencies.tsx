import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Target } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { HistoryTimeline, type HistoryEntry } from "@/components/ewos/HistoryTimeline";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth-context";
import {
  ApiError,
  competencySelfServiceApi,
  type CompetencyAssessmentDto,
  type CompetencyDto,
  type EmployeeCompetencyDto,
} from "@/lib/api-client";

export const Route = createFileRoute("/_app/my-competencies")({
  head: () => ({
    meta: [{ title: "Competencies — EWOS" }, { name: "robots", content: "noindex" }],
  }),
  component: MyCompetenciesPage,
});

function MyCompetenciesPage() {
  const { user } = useAuth();
  const employeeId = user?.employeeId;

  const [levels, setLevels] = useState<EmployeeCompetencyDto[] | null>(null);
  const [assessments, setAssessments] = useState<CompetencyAssessmentDto[]>([]);
  const [catalog, setCatalog] = useState<CompetencyDto[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([
      competencySelfServiceApi.myCompetencies(),
      competencySelfServiceApi.myAssessments(),
      competencySelfServiceApi.competencyCatalog(),
    ])
      .then(([l, a, c]) => {
        if (cancelled) return;
        setLevels(l);
        setAssessments(a);
        setCatalog(c);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Failed to load your competencies.");
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [employeeId]);

  const competencyName = (id: string) => catalog.find((c) => c.id === id)?.name ?? id;
  const competencyScaleMax = (id: string) => catalog.find((c) => c.id === id)?.scaleMax;

  const historyEntries: HistoryEntry[] = assessments.map((a) => ({
    id: a.id,
    occurredAt: a.assessedAt,
    actor: a.assessorName ?? a.assessedBy,
    action: `${a.assessmentType} assessment — ${competencyName(a.competencyId)} level ${a.assessedLevel}`,
    notes: a.comments,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="My Performance"
        title="Competencies"
        description="Your current competency levels and assessment history."
      />

      {!employeeId ? (
        <EmptyState
          icon={Target}
          title="No employee record linked"
          description="Your account isn't linked to an employee record, so competencies can't be resolved."
        />
      ) : loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <EmptyState title="Couldn't load your competencies" description={error} />
      ) : (
        <>
          {!levels || levels.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No competencies recorded"
              description="No competency levels have been recorded for you yet."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {levels.map((l) => {
                const scaleMax = competencyScaleMax(l.competencyId);
                return (
                  <Card key={l.id}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold">
                        {competencyName(l.competencyId)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={scaleMax ? (l.currentLevel * 100) / scaleMax : 0}
                          className="h-2"
                        />
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {l.currentLevel}
                          {scaleMax !== undefined && ` / ${scaleMax}`}
                        </span>
                      </div>
                      {l.targetLevel !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          Target level: {l.targetLevel}
                        </div>
                      )}
                      {l.lastAssessedAt && (
                        <div className="text-xs text-muted-foreground">
                          Last assessed {l.lastAssessedAt.slice(0, 10)}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Assessment history</CardTitle>
            </CardHeader>
            <CardContent>
              <HistoryTimeline entries={historyEntries} />
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
