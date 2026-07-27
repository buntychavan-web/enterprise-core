# EWOS — Enterprise Workforce Operating System (frontend)

The web client for EWOS: an HR/payroll/people-operations admin portal built
on [TanStack Start](https://tanstack.com/start) (React, file-based routing,
SSR). Talks to the `ewos` Spring Boot backend over `/api/v1/*` — see that
repo for the API.

## Tech stack

- **Framework**: TanStack Start (React 19) + TanStack Router (file-based
  routes under `src/routes/`)
- **Package manager**: [Bun](https://bun.sh) — `bun.lock` is the real
  lockfile; do not add a `package-lock.json`/`yarn.lock`.
- **Build**: Vite, via `@lovable.dev/vite-tanstack-config` — a private
  wrapper package (see "Private dependency" below)
- **Styling**: Tailwind CSS + shadcn/ui (Radix primitives)
- **Data fetching**: TanStack Query
- **Tests**: Vitest + React Testing Library (component), Playwright
  (e2e smoke)
- **Deploy target**: Cloudflare Workers by default (Nitro
  `cloudflare-module` preset) — see `docs/DEPLOYMENT.md`

## Quick start

```bash
bun install
bun run dev          # http://localhost:3000 (or the port Vite prints)
```

The dev server proxies `/api/v1/*` to `http://localhost:8080` — run the
`ewos` backend locally (see that repo's README) alongside this for a real
login flow, or set `VITE_ENABLE_DEMO_LOGIN=true` to sign in with the built-in
demo account instead (see `.env.example` and `src/lib/feature-flags.ts` —
**never** set this in a production build; the build itself refuses to
proceed if it is).

## Scripts

| Command | Purpose |
| --- | --- |
| `bun run dev` | Dev server with HMR |
| `bun run build` | Production build (Cloudflare Workers target) |
| `bun run lint` | ESLint |
| `bun run typecheck` | `tsc --noEmit` |
| `bun run format` | Prettier write |
| `bun run test:unit` | Vitest (component tests, `--run` for a single pass) |
| `bun run test:unit:coverage` | Vitest with v8 coverage |
| `bun run test:e2e` | Playwright e2e suite (builds + serves the app first — see `playwright.config.ts`) |

## Testing

- **Component tests** live next to the route/component they cover
  (`src/routes/login.test.tsx`, `src/components/ewos/ErrorBoundary.test.tsx`,
  etc.), using Vitest + React Testing Library. `vitest.config.ts` is
  deliberately standalone rather than importing the real `vite.config.ts`,
  to avoid pulling in the private `@lovable.dev/*` build dependency for a
  pure jsdom test run.
- **e2e** (`e2e/*.spec.ts`, Playwright) is a frontend-only smoke suite — no
  backend runs alongside it, so specs assert client-side behavior
  (rendering, routing, validation) rather than a real authenticated session.
  `playwright.config.ts` builds the app with `NITRO_PRESET=node-server`
  (not the default Cloudflare Workers target) so a plain `node` process can
  serve it locally for the tests to hit.

## Private dependency: `@lovable.dev/*` packages

This project was bootstrapped on the [Lovable.dev](https://lovable.dev)
platform and depends on a few `@lovable.dev/*` packages
(`vite-tanstack-config`, `vite-plugin-hmr-gate`,
`vite-plugin-dev-server-bridge`) published only to a private registry at
`europe-west1-npm.pkg.dev`. `bun install` needs `BUN_CONFIG_REGISTRY` /
`BUN_CONFIG_TOKEN` credentials for that registry — without them you'll see
403s on exactly those three packages. See `docs/DEPLOYMENT.md` for where
these are needed (CI, Docker builds).

## CI

`.github/workflows/ci.yml` runs on every push/PR: install → lint →
typecheck → Vitest → production build → artifact/coverage upload, plus a
separate job for the Playwright suite.

## Deployment

See [`docs/DEPLOYMENT.md`](./docs/DEPLOYMENT.md) — covers the Cloudflare
Workers primary target, a Docker self-host alternative, required secrets,
and a routing decision every deployment needs to make (there is no
production reverse-proxy configured for `/api/v1/*` by default).

## Project layout

```
src/
  routes/          # file-based routes (TanStack Router) + colocated tests
  components/ewos/  # app-specific components (nav, panels, error boundary, ...)
  components/ui/    # shadcn/ui primitives
  lib/              # api-client, auth-context, feature-flags, logger, ...
  test/             # Vitest setup + shared test-only stubs (e.g. recharts)
e2e/                # Playwright specs
```
