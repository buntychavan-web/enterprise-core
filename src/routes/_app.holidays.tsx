import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/ewos/PageHeader";
import { QueryState } from "@/components/ewos/QueryState";
import { EmptyState } from "@/components/ewos/EmptyState";
import { StatusChip, type StatusTone } from "@/components/ewos/StatusChip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { holidaysApi, type HolidayResponse } from "@/lib/api-client";

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

const TONE: Record<HolidayResponse["type"], StatusTone> = {
  National: "info",
  Regional: "neutral",
  Optional: "warning",
  Company: "success",
};

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

function HolidaysPage() {
  const [type, setType] = useState<string>("all");
  const year = new Date().getFullYear();

  const query = useQuery({
    queryKey: ["holidays", year],
    queryFn: ({ signal }) => holidaysApi.list(year, signal),
  });

  const filtered = useMemo(
    () =>
      type === "all"
        ? (query.data ?? [])
        : (query.data ?? []).filter((h) => h.type === type),
    [query.data, type],
  );

  const grouped = useMemo(() => {
    const g: Record<string, HolidayResponse[]> = {};
    for (const h of filtered) {
      const m = MONTHS[new Date(h.date).getMonth()];
      (g[m] ??= []).push(h);
    }
    return g;
  }, [filtered]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Calendar"
        title={`Holiday Calendar ${year}`}
        description={`${filtered.length} holidays across all offices.`}
        actions={
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="w-40" aria-label="Filter by holiday type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="National">National</SelectItem>
              <SelectItem value="Regional">Regional</SelectItem>
              <SelectItem value="Optional">Optional</SelectItem>
              <SelectItem value="Company">Company</SelectItem>
            </SelectContent>
          </Select>
        }
      />

      <QueryState
        isLoading={query.isLoading}
        error={query.error}
        onRetry={() => query.refetch()}
        label="holiday calendar"
      >
        {filtered.length === 0 ? (
          <EmptyState
            icon={CalendarDays}
            title="No holidays found"
            description={
              type !== "all"
                ? "Try a different filter."
                : "The holiday calendar will appear once the backend endpoint is available."
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {MONTHS.filter((m) => grouped[m]?.length).map((m) => (
              <Card key={m}>
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                    <CalendarDays className="h-4 w-4 text-muted-foreground" /> {m}
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {grouped[m].map((h) => {
                      const d = new Date(h.date);
                      return (
                        <li key={h.id ?? h.date} className="flex items-center gap-3 px-4 py-3">
                          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                            <div className="text-center leading-none">
                              <div className="text-[10px] font-medium uppercase">
                                {d.toLocaleDateString("en", { weekday: "short" })}
                              </div>
                              <div className="text-base font-bold">{d.getDate()}</div>
                            </div>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium">{h.name}</div>
                            <div className="truncate text-xs text-muted-foreground">
                              {h.location || "All offices"}
                            </div>
                          </div>
                          <StatusChip tone={TONE[h.type]}>{h.type}</StatusChip>
                        </li>
                      );
                    })}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </QueryState>
    </div>
  );
}
