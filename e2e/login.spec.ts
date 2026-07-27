import { test, expect } from "@playwright/test";

// Frontend-only smoke coverage (see playwright.config.ts) — no backend is
// running in this pipeline, so these specs assert client-side behaviour
// (rendering, routing, form validation) rather than a real authenticated
// session.

test.describe("Login page", () => {
  test("renders the sign-in form", async ({ page }) => {
    await page.goto("/login");

    // CardTitle renders a styled <div>, not a semantic heading element.
    await expect(page.getByText("Sign in").first()).toBeVisible();
    await expect(page.getByLabel(/username/i)).toBeVisible();
    await expect(page.getByLabel(/password/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /sign in/i })).toBeVisible();
  });

  test("shows validation errors when submitting without credentials", async ({ page }) => {
    await page.goto("/login");

    await page.getByRole("button", { name: /sign in/i }).click();

    await expect(page.getByText(/username is required/i)).toBeVisible();
    await expect(page.getByText(/password is required/i)).toBeVisible();
  });

  test("redirects an unauthenticated visit to the dashboard back to login", async ({ page }) => {
    await page.goto("/dashboard");

    await expect(page).toHaveURL(/\/login/);
  });
});
