import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// Sprint 0 (EWOS App Shell) — repointed to notificationInboxApi (the Sprint
// 27C NotificationInboxController) instead of the old notificationsApi, so
// dismiss is now real and testable — see the EWOS CTO review's "two
// notification controllers" finding.

const { listMock, markReadMock, dismissMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  markReadMock: vi.fn(),
  dismissMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    notificationInboxApi: { list: listMock, markRead: markReadMock, dismiss: dismissMock },
  };
});

import { NotificationsPage } from "./_app.notifications";

const notification = (overrides: Partial<Record<string, unknown>> = {}) => ({
  id: "notif-1",
  type: "TASK_ASSIGNED",
  title: "New task assigned",
  body: "A workflow task is waiting on your action",
  readAt: undefined,
  createdAt: "2026-07-27T10:00:00Z",
  ...overrides,
});

describe("Notification inbox", () => {
  it("renders unread notifications from the Sprint 27C inbox", async () => {
    listMock.mockResolvedValueOnce({ items: [notification()] });

    render(<NotificationsPage />);

    expect(await screen.findByText("New task assigned")).toBeInTheDocument();
    expect(screen.getByText(/1 unread of 1 total/i)).toBeInTheDocument();
  });

  it("marks a notification read and updates the unread count", async () => {
    listMock.mockResolvedValueOnce({ items: [notification()] });
    markReadMock.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText("New task assigned");
    await user.click(screen.getByRole("button", { name: /mark read/i }));

    await waitFor(() => expect(markReadMock).toHaveBeenCalledWith("notif-1"));
    await waitFor(() => expect(screen.getByText(/0 unread of 1 total/i)).toBeInTheDocument());
  });

  it("dismisses a notification and removes it from the list", async () => {
    listMock.mockResolvedValueOnce({ items: [notification()] });
    dismissMock.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText("New task assigned");
    await user.click(screen.getByRole("button", { name: /dismiss/i }));

    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith("notif-1"));
    await waitFor(() => expect(screen.queryByText("New task assigned")).not.toBeInTheDocument());
  });

  it("shows an empty state when the inbox has nothing yet", async () => {
    listMock.mockResolvedValueOnce({ items: [] });

    render(<NotificationsPage />);

    expect(await screen.findByText(/nothing here yet/i)).toBeInTheDocument();
  });
});
