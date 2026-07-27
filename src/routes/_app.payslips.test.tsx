import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { listMock, resourceApiFactory } = vi.hoisted(() => {
  const listMock = vi.fn();
  return { listMock, resourceApiFactory: vi.fn(() => ({ list: listMock })) };
});

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    resourceApi: resourceApiFactory,
  };
});

import { PayslipsPage } from "./_app.payslips";

describe("Payslips (payroll) screen", () => {
  beforeEach(() => {
    listMock.mockClear();
    resourceApiFactory.mockClear();
  });

  it("looks up payslips for the entered employee id and renders the results", async () => {
    listMock.mockResolvedValueOnce({
      items: [
        {
          id: "payslip-1",
          periodStart: "2026-06-01",
          periodEnd: "2026-06-30",
          payDate: "2026-07-01",
          currency: "INR",
          grossAmount: 100000,
          deductionsAmount: 18000,
          netAmount: 82000,
          status: "PAID",
        },
      ],
      total: 1,
      unavailable: false,
    });

    const user = userEvent.setup();
    render(<PayslipsPage />);

    const employeeIdInput = screen.getByLabelText(/employee id/i);
    await user.type(employeeIdInput, "11111111-1111-1111-1111-111111111111");
    await user.click(screen.getByRole("button", { name: /search/i }));

    await waitFor(() =>
      expect(resourceApiFactory).toHaveBeenCalledWith(
        "/payroll/payslips/employee/11111111-1111-1111-1111-111111111111",
      ),
    );
    expect(await screen.findByText("PAID")).toBeInTheDocument();
  });

  it("does not search when the employee id field is left blank", async () => {
    const user = userEvent.setup();
    render(<PayslipsPage />);

    await user.click(screen.getByRole("button", { name: /search/i }));

    expect(listMock).not.toHaveBeenCalled();
  });
});
