import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const essDashboardMock = vi.hoisted(() => vi.fn());
const { listMock, markReadMock, dismissMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  markReadMock: vi.fn(),
  dismissMock: vi.fn(),
}));

vi.mock("@tanstack/react-router", () => ({
  Link: ({
    children,
    to,
    onClick,
    ...rest
  }: {
    children?: React.ReactNode;
    to?: string;
    onClick?: () => void;
  }) => (
    <a href={to} onClick={onClick} {...rest}>
      {children}
    </a>
  ),
}));

vi.mock("@/hooks/use-ess-home-data", () => ({
  useEssDashboard: essDashboardMock,
}));

vi.mock("@/lib/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/api-client")>("@/lib/api-client");
  return {
    ...actual,
    notificationInboxApi: { list: listMock, markRead: markReadMock, dismiss: dismissMock },
  };
});

import { AttentionInbox } from "./AttentionInbox";

describe("AttentionInbox", () => {
  it("renders nothing when there is genuinely nothing to act on", async () => {
    essDashboardMock.mockReturnValue({
      loading: false,
      error: null,
      data: {
        pendingActions: {
          notificationsUnread: 0,
          timesheetDue: false,
          leaveRequestsPendingMyApproval: 0,
        },
      },
    });
    listMock.mockResolvedValueOnce({ items: [] });

    const { container } = render(<AttentionInbox />);

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it("surfaces a real pending-approval count from the ESS dashboard as a navigable item", async () => {
    essDashboardMock.mockReturnValue({
      loading: false,
      error: null,
      data: {
        pendingActions: {
          notificationsUnread: 0,
          timesheetDue: false,
          leaveRequestsPendingMyApproval: 3,
        },
      },
    });
    listMock.mockResolvedValueOnce({ items: [] });

    render(<AttentionInbox />);

    expect(await screen.findByText(/3 leave requests awaiting your approval/i)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /3 leave requests awaiting your approval/i }),
    ).toHaveAttribute("href", "/my-team");
  });

  it("renders a real unread notification and lets it be dismissed", async () => {
    essDashboardMock.mockReturnValue({
      loading: false,
      error: null,
      data: {
        pendingActions: {
          notificationsUnread: 1,
          timesheetDue: false,
          leaveRequestsPendingMyApproval: 0,
        },
      },
    });
    listMock.mockResolvedValueOnce({
      items: [
        {
          id: "notif-1",
          type: "PAYSLIP_READY",
          title: "Your July payslip is ready",
          createdAt: "2026-08-01T00:00:00Z",
        },
      ],
    });
    dismissMock.mockResolvedValueOnce(undefined);

    const user = userEvent.setup();
    render(<AttentionInbox />);

    expect(await screen.findByText("Your July payslip is ready")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /dismiss.*payslip/i }));

    await waitFor(() => expect(dismissMock).toHaveBeenCalledWith("notif-1"));
    expect(screen.queryByText("Your July payslip is ready")).not.toBeInTheDocument();
  });

  it("collapses entirely (does not render a broken widget) when both real sources fail", async () => {
    essDashboardMock.mockReturnValue({
      loading: false,
      error: "Request failed (500).",
      data: null,
    });
    listMock.mockRejectedValueOnce(new Error("network error"));

    const { container } = render(<AttentionInbox />);

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });
});
