import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

// Deliberately standalone rather than importing vite.config.ts: the app's real
// Vite config goes through @lovable.dev/vite-tanstack-config (SSR/dev-server
// concerns Vitest's jsdom component tests don't need), which requires a
// registry this project's CI does not always have credentials for. Keeping
// Vitest's config free of that dependency means `bun run test:unit` still
// works even when the full app build cannot resolve those packages.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // See src/test/recharts-stub.tsx: avoids Vite's dep optimizer trying to
      // pre-bundle recharts's d3/victory-vendor graph during test collection.
      recharts: path.resolve(__dirname, "./src/test/recharts-stub.tsx"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["**/node_modules/**", "e2e/**"],
    css: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/routeTree.gen.ts", "src/test/**"],
    },
  },
});
