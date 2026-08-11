import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Sprint 1 (ESS Core Polish) — Holidays previously rendered HOLIDAYS_2026
// mock data unconditionally, with no loading/error/empty state because there
// was no network call. This covers the real essCalendarApi.upcoming() wiring:
// loading, error, empty, and correct data (filtered to HOLIDAY events only,
// since the endpoint also returns LEAVE/TIMESHEET_DUE events for the same
// caller).

const { upcoming } = vi.hoisted(() => ({ upcoming: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    essCalendarApi: { upcoming },
  };
});

import { HolidaysPage } from "./_app.holidays";
import { ApiError } from "@/lib/api-client";

describe("Holidays", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads real holiday events from the calendar API, filtering out non-holiday events", async () => {
    upcoming.mockResolvedValueOnce([
      { date: "2026-01-26", type: "HOLIDAY", title: "Republic Day" },
      { date: "2026-08-15", type: "HOLIDAY", title: "Independence Day" },
      // Same endpoint also returns these for the caller — must not leak
      // onto a page titled "Holiday Calendar".
      {
        date: "2026-08-20",
        type: "LEAVE",
        title: "Earned Leave",
        metadata: { leaveRequestId: "x" },
      },
      { date: "2026-09-01", type: "TIMESHEET_DUE", title: "Timesheet due" },
    ]);

    render(<HolidaysPage />);

    expect(await screen.findByText("Republic Day")).toBeInTheDocument();
    expect(screen.getByText("Independence Day")).toBeInTheDocument();
    expect(screen.queryByText("Earned Leave")).not.toBeInTheDocument();
    expect(screen.queryByText("Timesheet due")).not.toBeInTheDocument();
  });

  it("does not hardcode a year — requests the current calendar year", async () => {
    upcoming.mockResolvedValueOnce([]);

    render(<HolidaysPage />);

    await screen.findByText("No holidays found");
    const year = new Date().getFullYear();
    expect(upcoming).toHaveBeenCalledWith(`${year}-01-01`, `${year}-12-31`);
  });

  it("shows an empty state when there are no holidays", async () => {
    upcoming.mockResolvedValueOnce([]);

    render(<HolidaysPage />);

    expect(await screen.findByText("No holidays found")).toBeInTheDocument();
  });

  it("treats a 404 (no linked employee) as empty, not an error", async () => {
    upcoming.mockRejectedValueOnce(new ApiError("No employee record is linked", 404, null));

    render(<HolidaysPage />);

    expect(await screen.findByText("No holidays found")).toBeInTheDocument();
  });

  it("shows a real error message for a non-404 failure", async () => {
    upcoming.mockRejectedValueOnce(new ApiError("Server unavailable", 500, null));

    render(<HolidaysPage />);

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
  });

  it("groups and formats holiday dates correctly", async () => {
    upcoming.mockResolvedValueOnce([
      { date: "2026-01-26", type: "HOLIDAY", title: "Republic Day" },
    ]);

    render(<HolidaysPage />);

    expect(await screen.findByText("January")).toBeInTheDocument();
    expect(screen.getByText("Republic Day")).toBeInTheDocument();
  });
});
