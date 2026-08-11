import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Sprint 1 (ESS Core Polish) — the real "edit profile" flow, backed by the
// Sprint 27C PATCH /self-service/me endpoint. Covers: entering edit mode,
// client-side validation, a successful save, cancel discarding changes, a
// generic API error, and a field-level validation error from the backend.

const { me, updateMe } = vi.hoisted(() => ({
  me: vi.fn(),
  updateMe: vi.fn(),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    employeeSelfApi: { me },
    essProfileApi: { updateMe },
  };
});

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { ProfilePersonalDetailsCard } from "./ProfilePersonalDetailsCard";
import { ApiError } from "@/lib/api-client";

const record = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "emp-1",
  personalEmail: "asha.personal@example.com",
  phone: "+91 98765 43210",
  emergencyContactName: "Ravi Rao",
  emergencyContactPhone: "+91 91234 56789",
  avatarStorageUri: "",
  ...overrides,
});

describe("ProfilePersonalDetailsCard", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows the real loaded values in view mode", async () => {
    me.mockResolvedValueOnce(record());

    render(<ProfilePersonalDetailsCard />);

    expect(await screen.findByText("asha.personal@example.com")).toBeInTheDocument();
    expect(screen.getByText("Ravi Rao")).toBeInTheDocument();
  });

  it("enters edit mode and pre-fills the form with the current values", async () => {
    me.mockResolvedValueOnce(record());

    render(<ProfilePersonalDetailsCard />);
    await screen.findByText("asha.personal@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    expect(screen.getByLabelText("Personal email")).toHaveValue("asha.personal@example.com");
    expect(screen.getByLabelText("Emergency contact name")).toHaveValue("Ravi Rao");
  });

  it("rejects an invalid phone number client-side before calling the API", async () => {
    me.mockResolvedValueOnce(record());

    render(<ProfilePersonalDetailsCard />);
    await screen.findByText("asha.personal@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const phoneInput = screen.getByLabelText("Phone");
    await user.clear(phoneInput);
    await user.type(phoneInput, "abc");
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Enter a valid phone number.")).toBeInTheDocument();
    expect(updateMe).not.toHaveBeenCalled();
  });

  it("saves successfully and returns to view mode with the updated values", async () => {
    me.mockResolvedValueOnce(record());
    updateMe.mockResolvedValueOnce(record({ personalEmail: "new@example.com" }));

    render(<ProfilePersonalDetailsCard />);
    await screen.findByText("asha.personal@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));

    const emailInput = screen.getByLabelText("Personal email");
    await user.clear(emailInput);
    await user.type(emailInput, "new@example.com");
    await user.click(screen.getByRole("button", { name: /save/i }));

    await waitFor(() => expect(updateMe).toHaveBeenCalledTimes(1));
    expect(await screen.findByText("new@example.com")).toBeInTheDocument();
    // Back in view mode — no Save/Cancel buttons left.
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });

  it("cancel discards edits and leaves the original values untouched", async () => {
    me.mockResolvedValueOnce(record());

    render(<ProfilePersonalDetailsCard />);
    await screen.findByText("asha.personal@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));
    const emailInput = screen.getByLabelText("Personal email");
    await user.clear(emailInput);
    await user.type(emailInput, "discarded@example.com");
    await user.click(screen.getByRole("button", { name: /cancel/i }));

    expect(updateMe).not.toHaveBeenCalled();
    expect(screen.getByText("asha.personal@example.com")).toBeInTheDocument();
    expect(screen.queryByText("discarded@example.com")).not.toBeInTheDocument();
  });

  it("shows a generic error banner when the save fails without field errors", async () => {
    me.mockResolvedValueOnce(record());
    updateMe.mockRejectedValueOnce(new ApiError("Server unavailable", 500, null));

    render(<ProfilePersonalDetailsCard />);
    await screen.findByText("asha.personal@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
  });

  it("shows a field-level error from the backend's validation response", async () => {
    me.mockResolvedValueOnce(record());
    updateMe.mockRejectedValueOnce(
      new ApiError("Validation failed", 400, {
        fieldErrors: [{ field: "personalEmail", message: "must be a well-formed email address" }],
      }),
    );

    render(<ProfilePersonalDetailsCard />);
    await screen.findByText("asha.personal@example.com");

    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: /edit/i }));
    await user.click(screen.getByRole("button", { name: /save/i }));

    expect(await screen.findByText("must be a well-formed email address")).toBeInTheDocument();
  });

  it("shows a linked-record-not-found message when no employee is linked", async () => {
    me.mockResolvedValueOnce(null);

    render(<ProfilePersonalDetailsCard />);

    expect(
      await screen.findByText(/No employee record is linked to your login/i),
    ).toBeInTheDocument();
  });
});
