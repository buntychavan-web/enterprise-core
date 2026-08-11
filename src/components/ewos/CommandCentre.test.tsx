import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigateMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateMock,
  useRouterState: () => "/dashboard",
}));

import { CommandCentre } from "./CommandCentre";

describe("CommandCentre", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    localStorage.clear();
  });

  it("has a visible search button reachable without the keyboard shortcut", async () => {
    render(<CommandCentre />);

    const buttons = screen.getAllByRole("button", { name: /open command centre/i });
    expect(buttons.length).toBeGreaterThan(0);

    const user = userEvent.setup();
    await user.click(buttons[0]);

    expect(
      await screen.findByPlaceholderText(/search modules, people, actions/i),
    ).toBeInTheDocument();
  });

  it("does not contain the old hardcoded demo item", async () => {
    render(<CommandCentre />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: /open command centre/i })[0]);

    await screen.findByPlaceholderText(/search modules, people, actions/i);
    expect(screen.queryByText(/sample employee profile/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/EMP-1001/)).not.toBeInTheDocument();
  });

  it("navigates to a selected route and closes the dialog", async () => {
    render(<CommandCentre />);
    const user = userEvent.setup();
    await user.click(screen.getAllByRole("button", { name: /open command centre/i })[0]);

    const input = await screen.findByPlaceholderText(/search modules, people, actions/i);
    await user.type(input, "My Leave");
    await user.click(await screen.findByText("My Leave"));

    expect(navigateMock).toHaveBeenCalledWith({ to: "/my-leave" });
  });

  it("opens with Cmd/Ctrl+K without requiring a click", async () => {
    render(<CommandCentre />);

    expect(
      screen.queryByPlaceholderText(/search modules, people, actions/i),
    ).not.toBeInTheDocument();

    const user = userEvent.setup();
    await user.keyboard("{Control>}k{/Control}");

    expect(
      await screen.findByPlaceholderText(/search modules, people, actions/i),
    ).toBeInTheDocument();
  });
});
