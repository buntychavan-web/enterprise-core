import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ewos/PageHeader";
import { EmptyState } from "@/components/ewos/EmptyState";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiError, essCalendarApi, type CalendarEventDto } from "@/lib/api-client";

// Sprint 1 (ESS Core Polish) — replaces the previous HOLIDAYS_2026 mock data
// (src/lib/mock/workspace.ts) with the real Sprint 27C calendar endpoint,
// which was already built and wired into api-client.ts but never consumed by
// this screen. GET /self-service/calendar merges holidays, the caller's own
// approved leave, and timesheet-due dates into one array — this page filters
// to type "HOLIDAY" only, matching its purpose. The backend's holiday event
// (see EssCalendarService.holidayEvents) carries only { date, type, title },
// metadata is null for holidays — there is no location or National/Regional/
// Optional/Company subcategory in the real data, so that filter/badge from
// the old mock UI is intentionally not reproduced rather than invented.
export const Route = createFileRoute("/_app/holidays")({
  head: () => ({
    meta: [
      { title: "Holiday Calendar — EWOS" },
      { name: "description", content: "Company holiday calendar for the year." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: HolidaysPage,
});

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export function HolidaysPage() {
  const [holidays, setHolidays] = useState<CalendarEventDto[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const year = new Date().getFullYear();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    essCalendarApi
      .upcoming(`${year}-01-01`, `${year}-12-31`)
      .then((events) => {
        if (cancelled) return;
        setHolidays(events.filter((e) => e.type === "HOLIDAY"));
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 404) {
          // "No employee record is linked to your account" — same shape as
          // every other ESS screen's 404, not a genuine error to surface.
          setHolidays([]);
        } else {
          setError(err instanceof ApiError ? err.message : "Failed to load the holiday calendar.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [year]);

  const grouped = useMemo(() => {
    const g: Record<string, CalendarEventDto[]> = {};
    for (const h of holidays ?? []) {
      const m = MONTHS[new Date(h.date).getMonth()];
      (g[m] ??= []).push(h);
    }
    return g;
  }, [holidays]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title={`Holiday Calendar ${year}`}
        description={
          holidays
            ? `${holidays.length} ${holidays.length === 1 ? "holiday" : "holidays"} this year.`
            : undefined
        }
      />

      {loading ? (
        <div className="grid place-items-center p-16 text-sm text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
          <span className="sr-only">Loading holiday calendar…</span>
        </div>
      ) : error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : !holidays || holidays.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="No holidays found"
          description={`No company holidays are on record for ${year} yet.`}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {MONTHS.filter((m) => grouped[m]?.length).map((m) => (
            <Card key={m}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                  <CalendarDays className="h-4 w-4 text-muted-foreground" aria-hidden /> {m}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {grouped[m].map((h) => {
                    const d = new Date(h.date);
                    return (
                      <li
                        key={`${h.date}-${h.title}`}
                        className="flex items-center gap-3 px-4 py-3"
                      >
                        <div
                          aria-hidden
                          className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-brand/12 text-brand"
                        >
                          <div className="text-center leading-none">
                            <div className="text-[10px] font-medium uppercase">
                              {d.toLocaleDateString("en", { weekday: "short" })}
                            </div>
                            <div className="text-base font-bold">{d.getDate()}</div>
                          </div>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium text-foreground">
                            {h.title}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {d.toLocaleDateString(undefined, {
                              weekday: "long",
                              day: "numeric",
                              month: "long",
                            })}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
