import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const summaryMock = vi.hoisted(() => vi.fn());

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/api-client", () => ({
  dashboardApi: { summary: summaryMock },
}));

vi.mock("@/lib/tenant-context", () => ({
  useTenant: () => ({ tenantId: "tenant-1" }),
}));

// recharts itself is aliased to src/test/recharts-stub.tsx in vitest.config.ts
// (see that file for why) — no per-test vi.mock needed here.
import { DashboardPage } from "./_app.dashboard";

describe("Dashboard page", () => {
  it("shows loading state then renders live metrics from dashboardApi", async () => {
    summaryMock.mockResolvedValueOnce({
      employees: 42,
      users: 12,
      departments: 5,
      roles: 8,
    });

    render(<DashboardPage />);

    expect(screen.getByRole("heading", { name: /dashboard/i })).toBeInTheDocument();
    expect(summaryMock).toHaveBeenCalledWith("tenant-1");

    await waitFor(() => expect(screen.getByText("42")).toBeInTheDocument());
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
  });

  it("renders an unavailable marker for metrics the backend could not resolve", async () => {
    summaryMock.mockResolvedValueOnce({
      employees: null,
      users: null,
      departments: null,
      roles: null,
    });

    render(<DashboardPage />);

    await waitFor(() => expect(summaryMock).toHaveBeenCalled());
    // StatCard renders an em-dash placeholder for null/unavailable metrics.
    expect(await screen.findAllByText("—")).not.toHaveLength(0);
  });
});
