import { useEffect, useState } from "react";
import {
  ApiError,
  attendanceSelfServiceApi,
  employeeReportsApi,
  essDashboardApi,
  mssDashboardApi,
  type EssDashboardDto,
  type MssDashboardDto,
  type TimeEntryDto,
} from "@/lib/api-client";

/**
 * Sprint 0 (EWOS App Shell) — small independent-fetch hooks for Home/Work Hub.
 * Deliberately plain useState/useEffect, matching the pattern already used by
 * every other self-service screen in this codebase (my-team.tsx,
 * notifications.tsx, profile.tsx, ...) rather than introducing the first-ever
 * TanStack Query usage for Sprint 0 alone.
 *
 * Each hook fails independently — a rejected fetch turns into a `error`
 * string, never a thrown exception, so one card's failure never takes down
 * a sibling card on Home or Work Hub (see AttentionInbox.tsx / dashboard.tsx).
 */

type AsyncState<T> = { data: T | null; loading: boolean; error: string | null };

function toMessage(err: unknown): string {
  return err instanceof ApiError ? err.message : "Unable to load right now.";
}

export function useEssDashboard(): AsyncState<EssDashboardDto> {
  const [state, setState] = useState<AsyncState<EssDashboardDto>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    essDashboardApi
      .get()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: toMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

/**
 * MSS dashboard is fetched for every signed-in user, not just managers — the
 * backend resolves "direct reports" server-side, and a non-manager simply
 * gets `teamSummary.headcount === 0`. That real, data-driven signal (rather
 * than a guessed authority string) is what gates the Team Pulse card and the
 * App Shell's "Team" nav item — see AppShell's useHasDirectReports usage.
 */
export function useMssDashboard(): AsyncState<MssDashboardDto> {
  const [state, setState] = useState<AsyncState<MssDashboardDto>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    mssDashboardApi
      .get()
      .then((data) => {
        if (!cancelled) setState({ data, loading: false, error: null });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: toMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

export type TodayAttendanceStatus = {
  label: string;
  latestEntry: TimeEntryDto | null;
};

/**
 * There is no "today's attendance status" backend endpoint (only a recent
 * time-entries list) — this derives a real status from the caller's own
 * latest entry timestamped today, rather than inventing a rollup the
 * backend doesn't have. See AttendanceSelfServiceController's javadoc: live
 * clock-in/out capture is deliberately out of scope, but recent entries are
 * real if the employee's time is tracked by an external/HR process.
 */
export function useTodayAttendanceStatus(): AsyncState<TodayAttendanceStatus> {
  const [state, setState] = useState<AsyncState<TodayAttendanceStatus>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let cancelled = false;
    attendanceSelfServiceApi
      .myRecentTimeEntries()
      .then((entries) => {
        if (cancelled) return;
        const todayKey = new Date().toDateString();
        const todays = entries
          .filter((e) => new Date(e.occurredAt).toDateString() === todayKey)
          .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime());
        const latest = todays[0] ?? null;
        setState({
          data: { label: describe(latest), latestEntry: latest },
          loading: false,
          error: null,
        });
      })
      .catch((err) => {
        if (!cancelled) setState({ data: null, loading: false, error: toMessage(err) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}

function describe(entry: TimeEntryDto | null): string {
  if (!entry) return "No entry yet today";
  const time = new Date(entry.occurredAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  switch (entry.eventType) {
    case "IN":
      return `Clocked in at ${time}`;
    case "OUT":
      return `Clocked out at ${time}`;
    case "BREAK_START":
      return `On break since ${time}`;
    case "BREAK_END":
      return `Back from break at ${time}`;
    default:
      return "No entry yet today";
  }
}

/**
 * Real, data-driven "is this person a manager" signal for gating the App
 * Shell's "Team" nav item — a lightweight GET /employees/me/reports check,
 * deliberately separate from the heavier useMssDashboard() (team summary +
 * attendance snapshot + upcoming leave) that Home's Team Pulse card uses.
 * Not an invented permission/authority string — see Sprint 0 CTO notes.
 */
export function useHasDirectReports(): boolean {
  const [hasReports, setHasReports] = useState(false);

  useEffect(() => {
    let cancelled = false;
    employeeReportsApi
      .myReports()
      .then((reports) => {
        if (!cancelled) setHasReports(reports.length > 0);
      })
      .catch(() => {
        if (!cancelled) setHasReports(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return hasReports;
}
