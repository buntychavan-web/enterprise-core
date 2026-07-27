import { defineConfig, devices } from "@playwright/test";

// A frontend-only smoke suite: the CI job that runs this has no backend to
// authenticate against, so specs here assert client-side behaviour (routing,
// form validation, rendering) rather than end-to-end authenticated flows.
// Wiring a live backend (Testcontainers Postgres + the Spring Boot app) into
// this pipeline is a natural next step once both repos are deployed together
// in a shared CI environment.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Lets environments with a pre-installed Chromium pinned to a
        // different revision than this @playwright/test version expects
        // point at it directly instead of downloading a duplicate copy.
        // Unset in CI, where `playwright install --with-deps chromium`
        // fetches the matching revision normally.
        launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
          ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
          : undefined,
      },
    },
  ],
  webServer: {
    // TanStack Start/Nitro builds an SSR server, not a static bundle — `vite
    // preview` (SPA-only) can't serve it. The default production build
    // targets Cloudflare Workers (a `fetch`-handler export, not a listening
    // process), so NITRO_PRESET=node-server (see vite.config.ts) switches
    // just this build to Nitro's plain node-server preset before running it.
    command: "NITRO_PRESET=node-server bun run build && PORT=4173 node .output/server/index.mjs",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
