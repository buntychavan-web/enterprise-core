import { test, expect, type Page } from "@playwright/test";

// Sprint 0 (EWOS App Shell) — the login -> Home -> Work -> Leave smoke flow.
//
// This pipeline has no backend (see login.spec.ts and playwright.config.ts),
// and the app's auth guard (`_app.tsx`'s `beforeLoad`) reads `tokenStore`
// synchronously, which only resolves client-side (SSR sees no localStorage
// and would redirect straight to /login on a fresh `page.goto("/dashboard")`).
// So this spec seeds a session via localStorage, loads the always-accessible
// /login route first, and lets the app's own "already signed in" redirect
// (login.tsx's `isAuthenticated` effect) hand off to /dashboard as a
// client-side transition — then continues with real in-app `<Link>` clicks,
// exactly what a signed-in user's browser actually does. The handful of
// /api/v1/self-service/* calls Home/Work Hub need on first paint are
// intercepted with realistic response shapes so the flow doesn't depend on a
// live Spring Boot backend; this is standard Playwright network stubbing,
// not fake data inside the application itself.

const FAKE_TOKEN = "e2e-fake-access-token";

async function seedSession(page: Page) {
  await page.addInitScript((token: string) => {
    localStorage.setItem("ewos.accessToken", token);
    localStorage.setItem(
      "ewos.user",
      JSON.stringify({ id: "u1", fullName: "Asha Rao", username: "asha", tenantId: "t1" }),
    );
    localStorage.setItem("ewos.tenantId", "t1");
  }, FAKE_TOKEN);
}

test.describe("Home -> Work -> Leave navigation", () => {
  test.beforeEach(async ({ page }) => {
    await seedSession(page);

    await page.route("**/api/v1/self-service/dashboard", (route) =>
      route.fulfill({
        json: {
          employee: null,
          pendingActions: {
            notificationsUnread: 0,
            timesheetDue: false,
            leaveRequestsPendingMyApproval: 0,
          },
          leaveSummary: { balanceDays: 12, pendingRequests: 0 },
          payrollSnapshot: {},
          upcomingEvents: [],
        },
      }),
    );
    await page.route("**/api/v1/manager-self-service/dashboard**", (route) =>
      route.fulfill({
        json: {
          teamSummary: {
            headcount: 0,
            onLeaveToday: 0,
            pendingApprovals: 0,
            timesheetsPending: 0,
            leaveRequestsPending: 0,
          },
          teamAttendanceSnapshot: [],
          upcomingTeamLeave: [],
        },
      }),
    );
    await page.route("**/api/v1/self-service/notifications**", (route) =>
      route.fulfill({ json: { items: [] } }),
    );
    await page.route("**/api/v1/attendance/self-service/time-entries", (route) =>
      route.fulfill({ json: [] }),
    );
    await page.route("**/api/v1/employees/me/reports", (route) => route.fulfill({ json: [] }));
    await page.route("**/api/v1/companies**", (route) => route.fulfill({ json: [] }));
  });

  test("a signed-in user lands on Home, opens Work, and reaches Leave", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /good (morning|afternoon|evening), asha/i }),
    ).toBeVisible();

    await page.getByRole("link", { name: "Work" }).first().click();
    await expect(page).toHaveURL(/\/work/);
    await expect(page.getByRole("heading", { name: "Your work" })).toBeVisible();

    await page.getByRole("link", { name: /Leave/ }).first().click();
    await expect(page).toHaveURL(/\/my-leave/);
  });
});
