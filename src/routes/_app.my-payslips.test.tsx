import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

// Sprint 1 (ESS Core Polish) — My Payslips was the only payslip surface with
// zero direct test coverage (the admin lookup screen already had one).
// Covers real data loading, empty state, and correct currency formatting
// (Intl.NumberFormat, matching the admin screen — Sprint 1 also fixed the
// raw-string-concat formatting this screen used to have).

const { myPayslips } = vi.hoisted(() => ({ myPayslips: vi.fn() }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    payslipSelfServiceApi: { myPayslips },
  };
});

import { MyPayslipsPage } from "./_app.my-payslips";
import { ApiError } from "@/lib/api-client";

const payslip = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "pay-1",
  periodStart: "2026-07-01",
  periodEnd: "2026-07-31",
  payDate: "2026-08-01",
  currency: "INR",
  grossAmount: 85000,
  deductionsAmount: 12000,
  netAmount: 73000,
  status: "PAID",
  ...overrides,
});

describe("My Payslips", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads and renders real payslips with correctly formatted currency", async () => {
    myPayslips.mockResolvedValueOnce([payslip()]);

    render(<MyPayslipsPage />);

    expect(await screen.findByText("PAID")).toBeInTheDocument();
    // Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" })
    // renders as "₹85,000" (maximumFractionDigits: 0) — not "INR 85000".
    expect(screen.getByText("₹85,000")).toBeInTheDocument();
    expect(screen.getByText("₹73,000")).toBeInTheDocument();
  });

  it("shows an empty state when there are no payslips (or no employee record)", async () => {
    myPayslips.mockResolvedValueOnce([]);

    render(<MyPayslipsPage />);

    expect(await screen.findByText("No payslips yet")).toBeInTheDocument();
  });

  it("treats a 404 the same as an empty list, not an error", async () => {
    myPayslips.mockRejectedValueOnce(new ApiError("Not found", 404, null));

    render(<MyPayslipsPage />);

    expect(await screen.findByText("No payslips yet")).toBeInTheDocument();
    expect(screen.queryByText("Not found")).not.toBeInTheDocument();
  });

  it("shows a real error message for a non-404 failure", async () => {
    myPayslips.mockRejectedValueOnce(new ApiError("Server unavailable", 500, null));

    render(<MyPayslipsPage />);

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
  });
});
