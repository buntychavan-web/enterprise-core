import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const navigateMock = vi.fn();
const loginMock = vi.fn();
const loginAsDemoMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  useNavigate: () => navigateMock,
}));

vi.mock("@/lib/auth-context", () => ({
  useAuth: () => ({
    login: loginMock,
    loginAsDemo: loginAsDemoMock,
    isAuthenticated: false,
    isInitializing: false,
  }),
  DEMO_CREDENTIALS: { username: "demo", password: "demo" },
}));

vi.mock("@/lib/env", () => ({
  isDemoLoginEnabled: false,
}));

import { LoginPage } from "./login";

describe("Login page", () => {
  beforeEach(() => {
    navigateMock.mockClear();
    loginMock.mockClear();
  });

  it("renders the sign-in form", () => {
    render(<LoginPage />);

    // "Sign in" appears twice: the CardTitle (a styled <div>, not a semantic
    // heading) and the submit button — assert both instead of a single
    // ambiguous getByText match.
    expect(screen.getAllByText("Sign in")).toHaveLength(2);
    expect(screen.getByLabelText(/username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /sign in/i })).toBeInTheDocument();
  });

  it("shows validation errors instead of submitting when fields are empty", async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/username is required/i)).toBeInTheDocument();
    expect(screen.getByText(/password is required/i)).toBeInTheDocument();
    expect(loginMock).not.toHaveBeenCalled();
  });

  it("calls login with the entered credentials and navigates to the dashboard", async () => {
    loginMock.mockResolvedValueOnce(undefined);
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), "jane.doe");
    await user.type(screen.getByLabelText(/password/i), "s3cret!");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    await waitFor(() => expect(loginMock).toHaveBeenCalledWith("jane.doe", "s3cret!", true));
    expect(navigateMock).toHaveBeenCalledWith({ to: "/dashboard", replace: true });
  });

  it("surfaces a login failure instead of navigating away", async () => {
    loginMock.mockRejectedValueOnce(new Error("Invalid credentials"));
    const user = userEvent.setup();
    render(<LoginPage />);

    await user.type(screen.getByLabelText(/username/i), "jane.doe");
    await user.type(screen.getByLabelText(/password/i), "wrong");
    await user.click(screen.getByRole("button", { name: /sign in/i }));

    expect(await screen.findByText(/invalid credentials/i)).toBeInTheDocument();
    expect(navigateMock).not.toHaveBeenCalledWith({ to: "/dashboard", replace: true });
  });
});
