// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// tsconfig.json's "types" only includes "vite/client" (no @types/node), so
// `process` has no ambient type here even though it's a real Node global at
// config-eval time. Declared locally rather than widening the project-wide
// "types" array for one config-time env read.
declare const process: { env: Record<string, string | undefined> };

// Sprint 2.1 (Product Owner Decision 1) — Demo Login must never ship in a
// Production build even if VITE_ENABLE_DEMO_LOGIN=true is set by mistake in
// the build environment. This hard-fails the build rather than relying on
// login.tsx's runtime gate alone.
const failOnDemoLoginInProduction = {
  name: "ewos-forbid-demo-login-in-production",
  config(_config: unknown, { mode }: { mode: string }) {
    if (mode === "production" && process.env.VITE_ENABLE_DEMO_LOGIN === "true") {
      throw new Error(
        "EWOS build aborted: VITE_ENABLE_DEMO_LOGIN=true is not allowed in a production build. " +
          "Demo Login must only be enabled for Development or Test builds.",
      );
    }
  },
};

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
  vite: {
    plugins: [failOnDemoLoginInProduction],
    server: {
      proxy: {
        // Proxy all backend calls to the EWOS Spring Boot backend running locally.
        // Change target here if the backend moves.
        "/api": {
          target: "http://localhost:8080",
          changeOrigin: true,
          secure: false,
        },
      },
    },
  },
});
