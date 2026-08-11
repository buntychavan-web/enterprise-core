import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Sprint 1 (ESS Core Polish) — My Leave had real, mutating actions (apply,
// submit, cancel) and zero test coverage before this. Covers real data
// loading, the empty state, and the submit/cancel/error flows the audit
// flagged as untested.

const { myBalances, myRequests, leaveTypes, createRequest, submitRequest, cancelRequest } =
  vi.hoisted(() => ({
    myBalances: vi.fn(),
    myRequests: vi.fn(),
    leaveTypes: vi.fn(),
    createRequest: vi.fn(),
    submitRequest: vi.fn(),
    cancelRequest: vi.fn(),
  }));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    leaveSelfServiceApi: {
      myBalances,
      myRequests,
      leaveTypes,
      createRequest,
      submitRequest,
      cancelRequest,
    },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { MyLeavePage } from "./_app.my-leave";
import { ApiError } from "@/lib/api-client";

const balance = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "bal-1",
  leaveTypeId: "lt-1",
  leaveTypeCode: "EL",
  year: 2026,
  accruedDays: 18,
  consumedDays: 3,
  pendingDays: 1,
  adjustmentDays: 0,
  carryForwardDays: 0,
  availableDays: 14,
  ...overrides,
});

const request = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "req-1",
  employeeId: "emp-1",
  leaveTypeId: "lt-1",
  leaveTypeCode: "EL",
  startDate: "2026-08-18",
  endDate: "2026-08-20",
  daysRequested: 3,
  status: "SUBMITTED",
  ...overrides,
});

describe("My Leave", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("loads real balances and request history", async () => {
    myBalances.mockResolvedValueOnce([balance()]);
    myRequests.mockResolvedValueOnce([request()]);
    leaveTypes.mockResolvedValueOnce([{ id: "lt-1", code: "EL", name: "Earned Leave" }]);

    render(<MyLeavePage />);

    expect(await screen.findByText("14")).toBeInTheDocument();
    // "EL" appears twice — once as the balance card's label, once as the
    // request table's Type cell — so assert on the count, not a single match.
    expect(screen.getAllByText("EL")).toHaveLength(2);
    expect(screen.getByText("SUBMITTED")).toBeInTheDocument();
  });

  it("shows an empty state when there's no employee record linked", async () => {
    myBalances.mockResolvedValueOnce([]);
    myRequests.mockResolvedValueOnce([]);
    leaveTypes.mockResolvedValueOnce([]);

    render(<MyLeavePage />);

    expect(await screen.findByText("No employee record linked")).toBeInTheDocument();
  });

  it("shows a request-history empty state when balances exist but no requests yet", async () => {
    myBalances.mockResolvedValueOnce([balance()]);
    myRequests.mockResolvedValueOnce([]);
    leaveTypes.mockResolvedValueOnce([{ id: "lt-1", code: "EL", name: "Earned Leave" }]);

    render(<MyLeavePage />);

    expect(await screen.findByText("No leave requests yet")).toBeInTheDocument();
  });

  it("submits a draft request for approval", async () => {
    myBalances.mockResolvedValue([balance()]);
    myRequests
      .mockResolvedValueOnce([request({ id: "req-1", status: "DRAFT" })])
      .mockResolvedValueOnce([request({ id: "req-1", status: "SUBMITTED" })]);
    leaveTypes.mockResolvedValue([{ id: "lt-1", code: "EL", name: "Earned Leave" }]);
    submitRequest.mockResolvedValueOnce(undefined);

    render(<MyLeavePage />);

    const submitButton = await screen.findByRole("button", { name: /submit/i });
    const user = userEvent.setup();
    await user.click(submitButton);

    await waitFor(() => expect(submitRequest).toHaveBeenCalledWith("req-1"));
    await waitFor(() => expect(myRequests).toHaveBeenCalledTimes(2));
  });

  it("cancels a cancellable request", async () => {
    myBalances.mockResolvedValue([balance()]);
    myRequests
      .mockResolvedValueOnce([request({ id: "req-1", status: "SUBMITTED" })])
      .mockResolvedValueOnce([request({ id: "req-1", status: "CANCELLED" })]);
    leaveTypes.mockResolvedValue([{ id: "lt-1", code: "EL", name: "Earned Leave" }]);
    cancelRequest.mockResolvedValueOnce(undefined);

    render(<MyLeavePage />);

    const cancelButton = await screen.findByRole("button", { name: /cancel/i });
    const user = userEvent.setup();
    await user.click(cancelButton);

    await waitFor(() => expect(cancelRequest).toHaveBeenCalledWith("req-1"));
  });

  it("shows a real error message when loading fails for a reason other than 404", async () => {
    myBalances.mockRejectedValueOnce(new ApiError("Server unavailable", 500, null));
    myRequests.mockResolvedValueOnce([]);
    leaveTypes.mockResolvedValueOnce([]);

    render(<MyLeavePage />);

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
  });
});
