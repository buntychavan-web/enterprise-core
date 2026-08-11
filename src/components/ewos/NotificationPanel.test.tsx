import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Sprint 1 (ESS Core Polish) — the header bell popover duplicates read logic
// against notificationInboxApi and had zero direct test coverage (only the
// full /notifications page did). Covers mark-read, the unread badge, and
// loading behavior specifically for this component.

const { list, markRead } = vi.hoisted(() => ({
  list: vi.fn(),
  markRead: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    notificationInboxApi: { list, markRead },
  };
});

import { NotificationPanel } from "./NotificationPanel";

const item = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "n1",
  type: "TASK_ASSIGNED",
  title: "Leave request approved",
  body: "Your leave for 18-20 Aug was approved.",
  readAt: undefined,
  createdAt: "2026-08-10T10:00:00Z",
  ...overrides,
});

describe("NotificationPanel (header bell)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("shows an unread count badge on the bell once items load", async () => {
    list.mockResolvedValueOnce({
      items: [item(), item({ id: "n2", readAt: "2026-08-10T11:00:00Z" })],
    });

    render(<NotificationPanel />);

    expect(
      await screen.findByRole("button", { name: /Notifications, 1 unread/i }),
    ).toBeInTheDocument();
  });

  it("shows no unread badge in the accessible name when everything is read", async () => {
    list.mockResolvedValueOnce({ items: [item({ readAt: "2026-08-10T11:00:00Z" })] });

    render(<NotificationPanel />);

    await waitFor(() => expect(list).toHaveBeenCalled());
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("opens the panel, marks an unread item read, and updates the badge", async () => {
    list.mockResolvedValue({ items: [item()] });
    markRead.mockResolvedValueOnce(undefined);

    render(<NotificationPanel />);

    const trigger = await screen.findByRole("button", { name: /Notifications, 1 unread/i });
    const user = userEvent.setup();
    await user.click(trigger);

    const row = await screen.findByText("Leave request approved");
    await user.click(row);

    await waitFor(() => expect(markRead).toHaveBeenCalledWith("n1"));
    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });

  it("shows an empty state when there are no notifications", async () => {
    // The panel fetches on mount AND again on every open (onOpenChange) —
    // a persistent resolved value covers both calls.
    list.mockResolvedValue({ items: [] });

    render(<NotificationPanel />);

    const trigger = await screen.findByRole("button", { name: "Notifications" });
    const user = userEvent.setup();
    await user.click(trigger);

    expect(await screen.findByText("You're all caught up")).toBeInTheDocument();
  });

  it("fails closed (empty list) rather than throwing when the API errors", async () => {
    list.mockRejectedValueOnce(new Error("network error"));

    render(<NotificationPanel />);

    expect(await screen.findByRole("button", { name: "Notifications" })).toBeInTheDocument();
  });
});
