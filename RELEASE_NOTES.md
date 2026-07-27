# EWOS frontend (enterprise-core) — release notes

## 2026-07-27 — CTO Production Readiness Audit

This repo had no CI, no automated tests, no error-boundary/feature-flag
infrastructure, and no deployment assets before this pass. See
`docs/DEPLOYMENT.md` for the deployment picture; this is the change log.

### Added
- `.github/workflows/ci.yml` — install, lint, typecheck, Vitest, build, and
  a separate Playwright e2e job. Requires `LOVABLE_NPM_REGISTRY_URL` /
  `_TOKEN` secrets for the private `@lovable.dev/*` package registry (see
  `docs/DEPLOYMENT.md`).
- Vitest + React Testing Library setup (`vitest.config.ts`,
  `src/test/setup.ts`) with component tests for Login, Dashboard, Employee
  List, Payslips, and the Notification inbox (13 tests) plus an
  `ErrorBoundary` unit test (3 tests) — 16 total, all passing.
- Playwright e2e smoke suite (`e2e/login.spec.ts`) covering the sign-in
  form, validation errors, and the unauthenticated-route redirect.
- `src/components/ewos/ErrorBoundary.tsx` — contains a render crash to the
  routed content instead of blanking the whole app shell.
- `src/lib/feature-flags.ts` — a small typed registry for build-time
  `VITE_*` flags in one place (`isDemoLoginEnabled` now sources from it).
- `src/lib/logger.ts` — dev-only console logging, so route errors don't
  print raw stack traces to every end user's browser console in production.
- A `beforeLoad` route guard on `/_app` (replaces a `useEffect`-based
  redirect that let the protected shell flash before redirecting).
- A global 401 handler in `api-client.ts`: an expired/revoked access token
  now clears the session and sends the user back to login instead of
  leaving a stuck, half-working UI.
- `Dockerfile` (self-host alternative to the default Cloudflare Workers
  target), `.env.example`, `docs/DEPLOYMENT.md`.

### Fixed
- `tokenStore.get()` only checked `localStorage`, unlike `userStore`/
  `tenantStore` which correctly check both storage backends — a session
  created with "remember me" off (sessionStorage-only) appeared logged-out
  on the very next read. Now checks both.

### Known limitations
- No production reverse-proxy/rewrite exists for `/api/v1/*` → the EWOS
  backend; this is an operator-specific infrastructure decision, documented
  as a required manual step in `docs/DEPLOYMENT.md`.
- `bun install` needs the private `@lovable.dev/*` registry; CI will 403 on
  three packages until `LOVABLE_NPM_REGISTRY_URL`/`_TOKEN` secrets are
  configured by someone with Lovable.dev platform access.
- Backend integration-style coverage doesn't exist here (a frontend-only
  smoke suite has no backend to authenticate against) — the Playwright
  suite asserts client-side behavior only. Wiring a live backend into e2e
  is a natural next step once both repos are deployed together in a shared
  CI environment.
