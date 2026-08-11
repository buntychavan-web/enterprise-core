import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Sprint 0 (EWOS App Shell) — rewritten for the new Home/Today screen, which
// replaces the old mock-heavy Executive/HR/Payroll/Employee tabbed dashboard.
// Home consumes small independent hooks (src/hooks/use-ess-home-data.ts)
// rather than calling api-client functions directly, so those hooks are what
// this test mocks — each card's loading/error/data state is set directly per
// test rather than mocking the underlying fetch.

const essDashboardMock = vi.hoisted(() => vi.fn());
const mssDashboardMock = vi.hoisted(() => vi.fn());
const attendanceMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children, to }: { children?: React.ReactNode; to?: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({ user: { fullName: "Asha Rao" } }),
}));

vi.mock("@/components/ewos/AttentionInbox", () => ({
  // Covered by its own dedicated test (AttentionInbox.test.tsx) — Home's own
  // test scope is the greeting, quick stats, work cards, and Team Pulse gate.
  AttentionInbox: () => null,
}));

vi.mock("@/hooks/use-ess-home-data", () => ({
  useEssDashboard: essDashboardMock,
  useMssDashboard: mssDashboardMock,
  useTodayAttendanceStatus: attendanceMock,
}));

import { HomePage } from "./_app.dashboard";

const emptyMssDashboard = {
  teamSummary: {
    headcount: 0,
    onLeaveToday: 0,
    pendingApprovals: 0,
    timesheetsPending: 0,
    leaveRequestsPending: 0,
  },
  teamAttendanceSnapshot: [],
  upcomingTeamLeave: [],
};

describe("Home page", () => {
  it("greets the caller by name and renders real leave/attendance/payslip data once loaded", async () => {
    essDashboardMock.mockReturnValue({
      loading: false,
      error: null,
      data: {
        employee: null,
        pendingActions: {
          notificationsUnread: 0,
          timesheetDue: false,
          leaveRequestsPendingMyApproval: 0,
        },
        leaveSummary: { balanceDays: 12, pendingRequests: 1 },
        payrollSnapshot: { latestPayslipPeriodEnd: "2026-07-31" },
        upcomingEvents: [],
      },
    });
    attendanceMock.mockReturnValue({
      loading: false,
      error: null,
      data: { label: "Clocked in at 09:12", latestEntry: null },
    });
    mssDashboardMock.mockReturnValue({ loading: false, error: null, data: emptyMssDashboard });

    render(<HomePage />);

    expect(
      screen.getByRole("heading", { name: /good (morning|afternoon|evening), asha/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("12 days").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Clocked in at 09:12").length).toBeGreaterThan(0);
  });

  it("shows the Team Pulse card only when the caller actually has direct reports", () => {
    essDashboardMock.mockReturnValue({ loading: true, error: null, data: null });
    attendanceMock.mockReturnValue({ loading: true, error: null, data: null });
    mssDashboardMock.mockReturnValue({
      loading: false,
      error: null,
      data: {
        ...emptyMssDashboard,
        teamSummary: {
          ...emptyMssDashboard.teamSummary,
          headcount: 4,
          onLeaveToday: 1,
          pendingApprovals: 2,
        },
      },
    });

    render(<HomePage />);

    expect(screen.getByText(/team pulse/i)).toBeInTheDocument();
    expect(screen.getByText(/1 on leave today/i)).toBeInTheDocument();
  });

  it("does not render Team Pulse for an individual contributor with no reports", () => {
    essDashboardMock.mockReturnValue({ loading: true, error: null, data: null });
    attendanceMock.mockReturnValue({ loading: true, error: null, data: null });
    mssDashboardMock.mockReturnValue({ loading: false, error: null, data: emptyMssDashboard });

    render(<HomePage />);

    expect(screen.queryByText(/team pulse/i)).not.toBeInTheDocument();
  });

  it("renders an 'unavailable' marker for a card whose API call failed, without hiding the rest of the page", () => {
    essDashboardMock.mockReturnValue({
      loading: false,
      error: "Request failed (500).",
      data: null,
    });
    attendanceMock.mockReturnValue({
      loading: false,
      error: null,
      data: { label: "No entry yet today", latestEntry: null },
    });
    mssDashboardMock.mockReturnValue({ loading: false, error: null, data: emptyMssDashboard });

    render(<HomePage />);

    // The greeting and the attendance card (a sibling, independent fetch) still render.
    expect(
      screen.getByRole("heading", { name: /good (morning|afternoon|evening), asha/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByText("No entry yet today").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/unavailable right now/i).length).toBeGreaterThan(0);
  });
});
