import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const { mineMock, markReadMock } = vi.hoisted(() => ({
  mineMock: vi.fn(),
  markReadMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    notificationsApi: { mine: mineMock, markRead: markReadMock },
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
  it("renders unread notifications from the backend inbox", async () => {
    mineMock.mockResolvedValueOnce({
      content: [notification()],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50,
    });

    render(<NotificationsPage />);

    expect(await screen.findByText("New task assigned")).toBeInTheDocument();
    expect(screen.getByText(/1 unread of 1 total/i)).toBeInTheDocument();
  });

  it("marks a notification read and updates the unread count", async () => {
    mineMock.mockResolvedValueOnce({
      content: [notification()],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 50,
    });
    markReadMock.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<NotificationsPage />);

    await screen.findByText("New task assigned");
    await user.click(screen.getByRole("button", { name: /mark read/i }));

    await waitFor(() => expect(markReadMock).toHaveBeenCalledWith("notif-1"));
    await waitFor(() => expect(screen.getByText(/0 unread of 1 total/i)).toBeInTheDocument());
  });

  it("shows an empty state when the inbox has nothing yet", async () => {
    mineMock.mockResolvedValueOnce({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 50,
    });

    render(<NotificationsPage />);

    expect(await screen.findByText(/nothing here yet/i)).toBeInTheDocument();
  });
});
