import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

const listMock = vi.fn();

vi.mock("@tanstack/react-router", () => ({
  createFileRoute: () => () => ({}),
  Link: ({ children }: { children?: React.ReactNode }) => <a>{children}</a>,
}));

vi.mock("@/lib/tenant-context", () => ({
  useTenant: () => ({ apiOptions: {} }),
}));

vi.mock("@/lib/api-client", () => ({
  resourceApi: () => ({
    list: listMock,
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  }),
}));

vi.mock("@/components/ewos/EmployeeIdentityPanel", () => ({
  EmployeeIdentityPanel: () => null,
}));

import { EmployeesPage } from "./_app.employees";

describe("Employees list page", () => {
  it("renders the employee roster once the list call resolves", async () => {
    listMock.mockResolvedValueOnce({
      items: [
        {
          id: "emp-1",
          employeeNumber: "EMP-0001",
          firstName: "Jane",
          lastName: "Doe",
          workEmail: "jane.doe@example.com",
          hireDate: "2024-01-15",
        },
      ],
      total: 1,
      unavailable: false,
    });

    render(<EmployeesPage />);

    expect(screen.getByRole("heading", { name: /employees/i })).toBeInTheDocument();

    await waitFor(() => expect(screen.getByText("EMP-0001")).toBeInTheDocument());
    expect(screen.getByText("jane.doe@example.com")).toBeInTheDocument();
  });

  it("renders an empty state when there are no employee records yet", async () => {
    listMock.mockResolvedValueOnce({ items: [], total: 0, unavailable: false });

    render(<EmployeesPage />);

    await waitFor(() => expect(listMock).toHaveBeenCalled());
    expect(await screen.findByText(/no employees yet/i)).toBeInTheDocument();
  });
});
