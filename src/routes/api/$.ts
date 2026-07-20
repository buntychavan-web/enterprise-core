import { createFileRoute } from "@tanstack/react-router";

/**
 * Catch-all for `/api/*` requests.
 *
 * The real backend lives outside this repo. In dev, Vite proxies `/api` to
 * the backend (see vite.config.ts); in the hosted preview / SSR runtime
 * there is no proxy, so unmatched `/api/*` paths would otherwise fall
 * through to the framework's default handler and return HTTP 500.
 *
 * Returning 404 here lets the client's api-client fallbacks (dashboardApi,
 * resourceApi) render "Coming soon" / "—" instead of surfacing platform
 * runtime errors for endpoints the backend team hasn't shipped yet.
 */
export const Route = createFileRoute("/api/$")({
  server: {
    handlers: {
      GET: async ({ params }) => notImplemented(params._splat),
      POST: async ({ params }) => notImplemented(params._splat),
      PUT: async ({ params }) => notImplemented(params._splat),
      PATCH: async ({ params }) => notImplemented(params._splat),
      DELETE: async ({ params }) => notImplemented(params._splat),
      OPTIONS: async () => new Response(null, { status: 204 }),
    },
  },
});

function notImplemented(path: string | undefined) {
  return new Response(
    JSON.stringify({
      status: 404,
      error: "Not implemented",
      message: `Backend endpoint /api/${path ?? ""} is not available in this environment.`,
    }),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    },
  );
}
